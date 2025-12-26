import axios from 'axios';
import { Client } from 'pg';
import { createClient } from 'redis';
import { execSync } from 'child_process';

const CORE_API = 'http://127.0.0.1:3003/v1';
const PRODUCT_API = 'http://127.0.0.1:3001/v1';
const CORE_DB_URL = 'postgres://user:password@127.0.0.1:5434/core';
const PRODUCT_DB_URL = 'postgres://user:password@127.0.0.1:5435/product';
const REDIS_URL = 'redis://127.0.0.1:6380';

describe('End-to-End Integration', () => {
    let coreDb: Client;
    let productDb: Client;
    let redis: ReturnType<typeof createClient>;
    let jwt: String;
    const userId = 'user-e2e-123';

    beforeAll(async () => {
        coreDb = new Client({ connectionString: CORE_DB_URL });
        productDb = new Client({ connectionString: PRODUCT_DB_URL });
        redis = createClient({ url: REDIS_URL });

        await coreDb.connect();
        await productDb.connect();
        await redis.connect();
    });

    afterAll(async () => {
        await coreDb.end();
        await productDb.end();
        await redis.quit();
    });

    const printDiagnostics = async () => {
        console.log('\n--- DIAGNOSTICS ---');
        try {
            const outboxRows = await productDb.query('SELECT * FROM outbox WHERE aggregate_id = $1', [userId]);
            console.log('Outbox Rows for', userId, ':', outboxRows.rows);

            const coreRows = await coreDb.query('SELECT * FROM widgets WHERE audience_id = $1', [userId]);
            console.log('Core Widgets DB Rows for', userId, ':', coreRows.rows);

            console.log('Last 50 lines of core-ingester logs:');
            console.log(execSync('docker compose logs --tail=50 core-ingester').toString());
        } catch (err) {
            console.error('Failed to print diagnostics:', err);
        }
    };

    test('Pipeline: Admin Publish -> Login -> Save Deal -> personalized Widget', async () => {
        try {
            // 1. Publish Defaults
            await axios.post(`${PRODUCT_API}/admin/publish-default`);

            // Wait for core to have them (simple wait or poll)
            await new Promise(r => setTimeout(r, 2000));

            // 2. Login
            const loginRes = await axios.post(`${PRODUCT_API}/auth/login`, { userId });
            jwt = loginRes.data.token;
            expect(jwt).toBeDefined();

            // 3. Get widgets (should be default initially if new user)
            const initialRes = await axios.get(`${CORE_API}/home/widgets?platform=web`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            // Even if empty, it shouldn't crash.
            console.log('Initial widgets:', initialRes.data);

            // 4. Save a deal
            const dealsRes = await axios.get(`${PRODUCT_API}/deals`);
            const dealId = dealsRes.data[0].id;
            const dealTitle = dealsRes.data[0].title;
            await axios.post(`${PRODUCT_API}/deals/${dealId}/save`, {}, {
                headers: { Authorization: `Bearer ${jwt}` }
            });

            // 5. Poll Core until personalized appears
            let personalizedFound = false;
            const timeout = Date.now() + 10000;
            while (Date.now() < timeout) {
                const res = await axios.get(`${CORE_API}/home/widgets?platform=web`, {
                    headers: { Authorization: `Bearer ${jwt}` }
                });

                const hasPersonalized = res.data.some((w: any) =>
                    w.content.data_version >= 2 &&
                    JSON.stringify(w.content.root).includes(dealTitle)
                );

                if (hasPersonalized) {
                    personalizedFound = true;
                    break;
                }
                await new Promise(r => setTimeout(r, 1000));
            }

            expect(personalizedFound).toBe(true);

            // 6. Check iOS platform
            const iosRes = await axios.get(`${CORE_API}/home/widgets?platform=ios`, {
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    'X-IOS-Version': '17'
                }
            });
            expect(iosRes.data.length).toBeGreaterThan(0);

            // 7. Assert Core DB and Redis
            const dbCheck = await coreDb.query(
                'SELECT * FROM widgets WHERE product_id = $1 AND platform = $2 AND audience_type = $3 AND audience_id = $4',
                ['deals_app', 'web', 'user', userId]
            );
            expect(dbCheck.rows.length).toBeGreaterThan(0);

            const redisKey = `widget:deals_app:web:user:${userId}:top_deals`;
            const redisVal = await redis.get(redisKey);
            expect(redisVal).not.toBeNull();

            const ttl = await redis.ttl(redisKey);
            expect(ttl).toBeGreaterThan(0);

            // 8. Version guard test: XADD an older event
            // We'll simulate this by manually inserting a row with an old version if we could, 
            // but the requirement is to XADD to Redis Stream.
            // Using the redis client to XADD.
            const oldEvent = {
                event_id: 'old-event-123',
                product_id: 'deals_app',
                platform: 'web',
                audience_type: 'user',
                audience_id: userId,
                widget_key: 'top_deals',
                schema_version: 1,
                data_version: 1, // Current is 2+
                content: { root: { type: 'text_row', text: 'Stale Data' } }
            };

            await redis.xAdd('events', '*', { payload: JSON.stringify(oldEvent) });

            // Wait for ingester
            await new Promise(r => setTimeout(r, 2000));

            const finalDbCheck = await coreDb.query(
                'SELECT * FROM widgets WHERE product_id = $1 AND platform = $2 AND audience_type = $3 AND audience_id = $4',
                ['deals_app', 'web', 'user', userId]
            );
            // It should still have the new version (data_version >= 2)
            expect(finalDbCheck.rows[0].data_version).toBeGreaterThanOrEqual(2);

        } catch (err) {
            await printDiagnostics();
            throw err;
        }
    }, 20000);
});
