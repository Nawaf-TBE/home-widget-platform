import { createClient } from 'redis';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';
const DB_CONFIG = {
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5435'),
    database: process.env.DB_NAME || 'product',
};

const STREAM_KEY = 'events';

// Main processing logic for a single batch
export const processIteration = async (redisClient: any, pool: Pool) => {
    let client;
    let jobIds: number[] = [];

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Fetch
        const res = await client.query(`
            SELECT id, payload::text, retry_count 
            FROM outbox 
            WHERE published_at IS NULL AND failed_at IS NULL
            ORDER BY created_at ASC, id ASC
            LIMIT 50
            FOR UPDATE SKIP LOCKED
        `);

        if (res.rows.length === 0) {
            await client.query('COMMIT');
            client.release();
            return { processed: 0, shouldSleep: true };
        }

        console.log(`Processing ${res.rows.length} outbox events...`);
        jobIds = res.rows.map(r => r.id);

        // 2. Process & Publish
        for (const row of res.rows) {
            // XADD events * event <payload>
            await redisClient.xAdd(STREAM_KEY, '*', { event: row.payload });
        }

        // 3. Mark Published
        await client.query(`
            UPDATE outbox 
            SET published_at = NOW() 
            WHERE id = ANY($1)
        `, [jobIds]);

        await client.query('COMMIT');
        client.release();
        return { processed: jobIds.length, shouldSleep: false };

    } catch (err: any) {
        console.error('Worker Error:', err);

        if (client) {
            try {
                await client.query('ROLLBACK');
                client.release();
            } catch (e) {
                console.error('Rollback error:', e);
            }
        }

        // Retry Logic matches requirements
        if (jobIds.length > 0) {
            try {
                const retryClient = await pool.connect();
                await retryClient.query(`
                    UPDATE outbox 
                    SET retry_count = retry_count + 1,
                        last_error = $2,
                        failed_at = CASE WHEN retry_count + 1 > 5 THEN NOW() ELSE NULL END
                    WHERE id = ANY($1)
                `, [jobIds, err.message]);
                retryClient.release();
                console.log(`Updated retry count for ${jobIds.length} events.`);
            } catch (retryErr) {
                console.error('Failed to update retry counts:', retryErr);
            }
        }
        return { error: err.message, shouldSleep: true };
    }
};

export const startWorker = async () => {
    const redisClient = createClient({ url: REDIS_URL });
    const pool = new Pool(DB_CONFIG);

    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    await redisClient.connect();
    console.log('Worker connected to Redis');

    while (true) {
        const result = await processIteration(redisClient as any, pool);
        if (result.shouldSleep) {
            const sleepTime = result.error ? 5000 : 1000;
            await new Promise(resolve => setTimeout(resolve, sleepTime));
        }
    }
};

if (require.main === module) {
    startWorker().catch(console.error);
}
