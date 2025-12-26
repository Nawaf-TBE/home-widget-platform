import { redisClient, connectRedis } from './redis';
import { upsertWidget } from './db';
import { validateEvent } from './validation';

const STREAM_KEY = 'events';
const GROUP_NAME = 'core';
const CONSUMER_NAME = process.env.CONSUMER_NAME || 'core-1';

interface EventPayload {
    product_id: string;
    platform: string;
    audience_type: string;
    audience_id: string;
    widget_key: string;
    content: Record<string, unknown>;
    schema_version: number;
    data_version: number;
    min_ios_version?: number;
}

export const startIngester = async () => {
    await connectRedis();

    // 1. Ensure Consumer Group Exists
    try {
        await redisClient.xGroupCreate(STREAM_KEY, GROUP_NAME, '0', { MKSTREAM: true });
        console.log(`Created consumer group ${GROUP_NAME}`);
    } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes('BUSYGROUP')) {
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const stream = response[0] as any;
                if (stream && stream.messages && stream.messages.length > 0) {
                    const streamEntry = stream.messages[0];
                    await processMessage(streamEntry.id, streamEntry.message as Record<string, string>);
                }
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
                        await processMessage(msg.id, msg.message as Record<string, string>);
                    }
                }
            }
        } catch (err) {
            console.error('Error reclaiming pending messages:', err);
        }
    }
};

export const processMessage = async (id: string, message: Record<string, string>) => {
    try {
        let eventData: EventPayload;
        const rawPayload = message.event || message.payload;
        if (rawPayload) {
            eventData = JSON.parse(rawPayload) as EventPayload;
        } else {
            console.error(`Message ${id} missing 'event' or 'payload' field`, message);
            return; // Do not ACK
        }

        // Validate
        if (!validateEvent(eventData)) {
            console.error(`Validation failed for message ${id}:`, validateEvent.errors);
            return; // Do not ACK
        }

        // Upsert to DB
        await upsertWidget({
            product_id: eventData.product_id,
            platform: eventData.platform,
            audience_type: eventData.audience_type,
            audience_id: eventData.audience_id,
            widget_key: eventData.widget_key,
            content: eventData.content,
            schema_version: eventData.schema_version,
            data_version: eventData.data_version
        });

        // Update Cache
        const cacheKey = `widget:${eventData.product_id}:${eventData.platform}:${eventData.audience_type}:${eventData.audience_id}:${eventData.widget_key}`;

        // Cache value
        const cacheValue = {
            product_id: eventData.product_id,
            platform: eventData.platform,
            audience_type: eventData.audience_type,
            audience_id: eventData.audience_id,
            widget_key: eventData.widget_key,
            content: eventData.content,
            schema_version: eventData.schema_version,
            data_version: eventData.data_version,
            min_ios_version: eventData.min_ios_version
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
