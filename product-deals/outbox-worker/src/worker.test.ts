import { Pool } from 'pg';
import { processIteration } from './worker';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';
const DB_CONFIG = {
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5435'),
    database: process.env.DB_NAME || 'product',
};

describe('Outbox Worker Integration', () => {
    let pool: Pool;
    let redisClient: ReturnType<typeof createClient>;

    beforeAll(async () => {
        pool = new Pool(DB_CONFIG);
        redisClient = createClient({ url: REDIS_URL });
        await redisClient.connect();
    });

    afterAll(async () => {
        await pool.end();
        await redisClient.disconnect();
    });

    beforeEach(async () => {
        await pool.query('DELETE FROM outbox');
        // Clear redis stream
        try {
            await redisClient.del('events');
        } catch {
            // Ignore if key doesn't exist
        }
    });

    it('processes outbox row and marks as published', async () => {
        // 1. Insert row
        const payload = { event_id: '1', product_id: 'deals', content: { title: 'Test' } };
        await pool.query(
            'INSERT INTO outbox (aggregate_id, event_type, payload) VALUES ($1, $2, $3)',
            ['user-1', 'WIDGET_SNAPSHOT_UPSERT', JSON.stringify(payload)]
        );

        // 2. Run Iteration
        const result = await processIteration(redisClient, pool);
        expect(result.processed).toBe(1);

        // 3. Verify Redis
        const stream = await redisClient.xRange('events', '-', '+');
        expect(stream.length).toBe(1);
        expect(JSON.parse(stream[0].message.event).content.title).toBe('Test');

        // 4. Verify DB
        const dbRes = await pool.query('SELECT published_at FROM outbox');
        expect(dbRes.rows[0].published_at).not.toBeNull();
    });

    it('increments retry_count when redis is down', async () => {
        // 1. Insert row
        const payload = { event_id: '2', product_id: 'deals', content: { title: 'Retry Test' } };
        await pool.query(
            'INSERT INTO outbox (aggregate_id, event_type, payload) VALUES ($1, $2, $3)',
            ['user-2', 'WIDGET_SNAPSHOT_UPSERT', JSON.stringify(payload)]
        );

        // 2. Run Iteration with MOCKED failing redis
        const failingRedis = {
            xAdd: async () => { throw new Error('Redis connection failed'); }
        };

        const result = await processIteration(failingRedis, pool);
        expect(result.error).toBe('Redis connection failed');

        // 3. Verify DB retry_count
        const dbRes = await pool.query('SELECT retry_count, last_error, failed_at FROM outbox');
        expect(dbRes.rows[0].retry_count).toBe(1);
        expect(dbRes.rows[0].last_error).toBe('Redis connection failed');
        expect(dbRes.rows[0].failed_at).toBeNull();
    });

    it('marks as failed after 5 retries', async () => {
        // 1. Insert row with 5 retries already
        const payload = { event_id: '3', product_id: 'deals', content: { title: 'Fail Test' } };
        await pool.query(
            'INSERT INTO outbox (aggregate_id, event_type, payload, retry_count) VALUES ($1, $2, $3, $4)',
            ['user-3', 'WIDGET_SNAPSHOT_UPSERT', JSON.stringify(payload), 5]
        );

        // 2. Run Iteration with MOCKED failing redis
        const failingRedis = {
            xAdd: async () => { throw new Error('Redis connection failed'); }
        };

        await processIteration(failingRedis, pool);

        // 3. Verify DB failed_at
        const dbRes = await pool.query('SELECT retry_count, failed_at FROM outbox');
        expect(dbRes.rows[0].retry_count).toBe(6);
        expect(dbRes.rows[0].failed_at).not.toBeNull();
    });
});
