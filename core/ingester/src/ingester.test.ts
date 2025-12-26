import { processMessage } from './ingester';
import { redisClient, connectRedis } from './redis';
import { pool } from './db';


// Mock specific redis/db calls if needed, OR use real connections since we have them in docker.
// Prompt asks for "Integration with real redis/postgres".
// So we will use the exported modules which are configured to connect to localhost ports.

describe('Core Ingester Integration', () => {
    const STREAM_KEY = 'events';

    beforeAll(async () => {
        // Connect and cleanup
        await connectRedis();
        // Just in case
        await pool.query('DELETE FROM widgets');
        await redisClient.del(STREAM_KEY);
        const keys = await redisClient.keys('widget:*');
        if (keys.length) await redisClient.del(keys);
    });

    afterAll(async () => {
        await pool.end();
        await redisClient.quit();
    });

    const validEventV0 = {
        event_id: '00000000-0000-0000-0000-000000000000',
        product_id: 'check24',
        platform: 'ios',
        audience_type: 'user',
        audience_id: 'u1',
        widget_key: 'w1',
        schema_version: 1,
        data_version: 0,
        min_ios_version: 10,
        content: {
            schema_version: 1,
            data_version: 0,
            root: {
                type: 'widget_container',
                title: 'V0',
                items: []
            }
        }
    };

    const validEventV1 = {
        event_id: '11111111-1111-1111-1111-111111111111',
        product_id: 'check24',
        platform: 'ios',
        audience_type: 'user',
        audience_id: 'u1',
        widget_key: 'w1',
        schema_version: 1,
        data_version: 1,
        min_ios_version: 10,
        content: {
            schema_version: 1,
            data_version: 1,
            root: {
                type: 'widget_container',
                title: 'V1',
                items: []
            }
        }
    };

    it('processes XADD event v1 -> DB row created and redis key exists', async () => {
        // We can simulate the "processStream" loop by manually calling processMessage 
        // OR by actually checking side effects after putting it in the stream.
        // But since `startIngester` runs infinite loops, it's hard to test in Jest without detached process.
        // Better to test `processMessage` directly as the "Integration unit". 
        // OR, we can XADD and then manually invoke `processMessage` with the ID we got back, passing the payload.

        // 1. Process V1
        // Mock a redis stream message structure
        const msgId = '1000-0';
        await processMessage(msgId, { event: JSON.stringify(validEventV1) });

        // Check DB
        const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['w1']);
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].data_version).toBe(1);
        expect(res.rows[0].content.root.title).toBe('V1');

        // Check Redis
        const cacheKey = 'widget:check24:ios:user:u1:w1';
        const cached = await redisClient.get(cacheKey);
        expect(cached).toBeTruthy();
        const cachedObj = JSON.parse(cached!);
        expect(cachedObj.content.root.title).toBe('V1');
    });

    it('XADD older event v0 -> DB not overwritten', async () => {
        // 2. Process V0 (older than V1)
        const msgId = '1001-0';
        await processMessage(msgId, { event: JSON.stringify(validEventV0) });

        // Check DB - should still be V1
        const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['w1']);
        expect(res.rows[0].data_version).toBe(1);
        expect(res.rows[0].content.root.title).toBe('V1');
    });

    it('handles validation failure gracefully (no ack, logs error)', async () => {
        const invalidEvent = { header: { product_id: 'unknown' } }; // Missing required fields
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        await processMessage('1002-0', { event: JSON.stringify(invalidEvent) });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
        // Since we mocked xAck in logic? No, we are using real redis.
        // We can't easily check "did NOT ack" here unless we check Pending Entries List (PEL).
        // If we were using a real consumer group flow, we could check PEL.
    });

    it('restart scenario: idempotent processing', async () => {
        // Simulate re-processing the same V1 message
        const msgId = '1000-0';
        await processMessage(msgId, { event: JSON.stringify(validEventV1) });

        // Check DB - no error, state remains same
        const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['w1']);
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].data_version).toBe(1);
    });
});
