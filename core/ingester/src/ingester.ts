import { redisClient, connectRedis } from './redis';
import { upsertWidget, pool } from './db';
import { validateEvent } from './validation';

const STREAM_KEY = 'events';
const GROUP_NAME = 'core';
const CONSUMER_NAME = process.env.CONSUMER_NAME || 'core-1';

export const startIngester = async () => {
    await connectRedis();

    // 1. Ensure Consumer Group Exists
    try {
        await redisClient.xGroupCreate(STREAM_KEY, GROUP_NAME, '0', { MKSTREAM: true });
        console.log(`Created consumer group ${GROUP_NAME}`);
    } catch (err: any) {
        if (!err.message.includes('BUSYGROUP')) {
            throw err;
        }
        // Group already exists, ignore
    }

    // 2. Start Processing Loops
    processStream();
    processPending();
};

const processStream = async () => {
    while (true) {
        try {
            const response = await redisClient.xReadGroup(
                GROUP_NAME,
                CONSUMER_NAME,
                [{ key: STREAM_KEY, id: '>' }],
                { COUNT: 1, BLOCK: 2000 }
            );

            if (response && Array.isArray(response) && response.length > 0) {
                // Force cast to any to avoid complex redis type issues in this step
                const streamEntry: any = (response[0] as any).messages[0];
                await processMessage(streamEntry.id, streamEntry.message);
            }
        } catch (err) {
            console.error('Error processing stream:', err);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};

const processPending = async () => {
    while (true) {
        try {
            // Check every 30s
            await new Promise(resolve => setTimeout(resolve, 30000));

            // Use XAUTOCLAIM
            const response = await redisClient.xAutoClaim(
                STREAM_KEY,
                GROUP_NAME,
                CONSUMER_NAME,
                60000, // minIdleTime 60s
                '0-0',
                { COUNT: 100 }
            );

            if (response.messages.length > 0) {
                console.log(`Reclaimed ${response.messages.length} pending messages`);
                for (const msg of response.messages) {
                    if (msg) {
                        await processMessage(msg.id, msg.message);
                    }
                }
            }
        } catch (err) {
            console.error('Error reclaiming pending messages:', err);
        }
    }
};

export const processMessage = async (id: string, message: any) => {
    try {
        // Redis Streams returns everything as strings. 
        // We typically expect a "data" field containing the JSON, or fields directly.
        // Let's assume the payload comes in a field named "data" or we try to parse the whole object if standard fields aren't there.
        // Based on typical patterns, let's look for a 'payload' or 'data' field, or just try to reconstruct.
        // For this project, let's assume the event is stored as a JSON string in a field called 'event' or just flattened fields.
        // BUT, xAdd usually takes field-value pairs. 
        // Let's assume the producer sends "event" -> JSON string.

        let eventData: any;
        const rawPayload = message.event || message.payload;
        if (rawPayload) {
            eventData = JSON.parse(rawPayload);
        } else {
            console.error(`Message ${id} missing 'event' or 'payload' field`, message);
            return; // Do not ACK
        }

        // Validate
        if (!validateEvent(eventData)) {
            console.error(`Validation failed for message ${id}:`, validateEvent.errors);
            return; // Do not ACK
        }

        // Extract Widget Data
        // Schema is flat: { product_id, platform, ..., content: { ... } }
        const payload: any = eventData;

        // Upsert to DB
        await upsertWidget({
            product_id: payload.product_id,
            platform: payload.platform,
            audience_type: payload.audience_type,
            audience_id: payload.audience_id,
            widget_key: payload.widget_key,
            content: payload.content,
            schema_version: payload.schema_version,
            data_version: payload.data_version
        });

        // Update Cache
        const cacheKey = `widget:${payload.product_id}:${payload.platform}:${payload.audience_type}:${payload.audience_id}:${payload.widget_key}`;

        // Cache value
        const cacheValue = {
            product_id: payload.product_id,
            platform: payload.platform,
            audience_type: payload.audience_type,
            audience_id: payload.audience_id,
            widget_key: payload.widget_key,
            content: payload.content,
            schema_version: payload.schema_version,
            data_version: payload.data_version,
            min_ios_version: payload.min_ios_version
        };

        const ttl = parseInt(process.env.REDIS_WIDGET_TTL_SECONDS || '604800');
        await redisClient.setEx(cacheKey, ttl, JSON.stringify(cacheValue));

        // ACK
        await redisClient.xAck(STREAM_KEY, GROUP_NAME, id);
        console.log(`Processed and ACKed message ${id}`);

    } catch (err) {
        console.error(`Error processing message ${id}:`, err);
        // Do not ACK
    }
};
