import { redisClient, connectRedis } from './redis';
import { upsertWidget, UpsertResult } from './db';
import { validateEvent } from './validation';

const STREAM_KEY = 'events';
const GROUP_NAME = 'core';
const CONSUMER_NAME = process.env.CONSUMER_NAME || 'core-1';

interface EventPayload {
    event_id?: string;
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
            console.error('[Ingester] Error processing stream:', err);
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
                console.log(`[Ingester] Reclaimed ${response.messages.length} pending messages`);
                for (const msg of response.messages) {
                    if (msg) {
                        await processMessage(msg.id, msg.message as Record<string, string>);
                    }
                }
            }
        } catch (err) {
            console.error('[Ingester] Error reclaiming pending messages:', err);
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
            console.error(`[Ingester] msg_id=${id} missing 'event' or 'payload' field`, message);
            return; // Do not ACK
        }

        const eventId = eventData.event_id || 'unknown';
        const widgetKey = `${eventData.product_id}:${eventData.platform}:${eventData.audience_type}:${eventData.audience_id}:${eventData.widget_key}`;

        // Log received
        console.log(`[Ingester] received msg_id=${id} event_id=${eventId} product_id=${eventData.product_id} platform=${eventData.platform} audience=${eventData.audience_type}:${eventData.audience_id} widget_key=${eventData.widget_key} data_version=${eventData.data_version}`);

        // Validate
        if (!validateEvent(eventData)) {
            console.error(`[Ingester] validation_failed msg_id=${id} event_id=${eventId}:`, validateEvent.errors);
            return; // Do not ACK
        }

        // Upsert to DB
        const upsertResult: UpsertResult = await upsertWidget({
            product_id: eventData.product_id,
            platform: eventData.platform,
            audience_type: eventData.audience_type,
            audience_id: eventData.audience_id,
            widget_key: eventData.widget_key,
            content: eventData.content,
            schema_version: eventData.schema_version,
            data_version: eventData.data_version
        });

        // Log upsert result
        console.log(`[Ingester] upsert_result event_id=${eventId} key=${widgetKey} action=${upsertResult} incoming=${eventData.data_version}`);

        // Update Cache (only if not ignored)
        if (upsertResult !== 'ignored_older') {
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

            // Log cache set
            console.log(`[Ingester] cache_set event_id=${eventId} redis_key=${cacheKey} ttl_seconds=${ttl}`);
        }

        // ACK
        await redisClient.xAck(STREAM_KEY, GROUP_NAME, id);
        console.log(`[Ingester] acked msg_id=${id} event_id=${eventId}`);

    } catch (err) {
        console.error(`[Ingester] error processing msg_id=${id}:`, err);
        // Do not ACK
    }
};
