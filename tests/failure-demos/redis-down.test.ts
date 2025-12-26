import axios from 'axios';
import {
    CORE_API,
    PRODUCT_API,
    stopContainer,
    startContainer,
    getJWT,
    sleep,
    getContainerStatus,
    getProductDB,
    getCoreDB,
    getRedis
} from './utils';

describe('Resilience: Redis Down', () => {
    const userId = 'user-resilience-redis';
    let jwt: string;

    beforeAll(async () => {
        jwt = await getJWT(userId);
    });

    test('System handles Redis outage and recovers', async () => {
        console.log('--- Step 1: Stop Redis ---');
        stopContainer('redis');
        expect(getContainerStatus('redis')).toContain('exited');

        console.log('--- Step 2: Confirm Core API still serves (from DB fallback) ---');
        const coreRes = await axios.get(`${CORE_API}/home/widgets?platform=web`, {
            headers: { Authorization: `Bearer ${jwt}` }
        });
        console.log(`Core widgets served (Redis down): ${coreRes.data.length}`);
        // Even if empty, it should be 200 OK
        expect(coreRes.status).toBe(200);

        console.log('--- Step 3: Save a deal while Redis is down (Product API resilient) ---');
        const dealsRes = await axios.get(`${PRODUCT_API}/deals`);
        const dealId = dealsRes.data[0].id;

        await axios.post(`${PRODUCT_API}/deals/${dealId}/save`, {}, {
            headers: { Authorization: `Bearer ${jwt}` }
        });
        console.log('Save Deal succeeded while Redis was down.');

        console.log('--- Step 4: Verify Outbox count increased ---');
        const productDb = await getProductDB();
        const outboxRes = await productDb.query('SELECT count(*) FROM outbox WHERE aggregate_id = $1 AND published_at IS NULL', [userId]);
        const countBefore = parseInt(outboxRes.rows[0].count);
        console.log(`Unpublished outbox events: ${countBefore}`);
        expect(countBefore).toBeGreaterThan(0);
        await productDb.end();

        console.log('--- Step 5: Start Redis and wait for Sync ---');
        startContainer('redis');
        await sleep(5000); // Wait for Redis and Worker to reconnect

        console.log('--- Step 6: Verify Outbox is drained and Core is updated ---');
        let drained = false;
        let coreUpdated = false;
        const timeout = Date.now() + 30000;

        while (Date.now() < timeout) {
            const pDb = await getProductDB();
            const oRes = await pDb.query('SELECT count(*) FROM outbox WHERE aggregate_id = $1 AND published_at IS NULL', [userId]);
            const countAfter = parseInt(oRes.rows[0].count);
            await pDb.end();

            if (countAfter === 0) drained = true;

            const cRes = await axios.get(`${CORE_API}/home/widgets?platform=web`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            // Look for the saved deal in personalized content
            if (JSON.stringify(cRes.data).includes(dealsRes.data[0].title)) {
                coreUpdated = true;
            }

            if (drained && coreUpdated) break;
            await sleep(2000);
        }

        expect(drained).toBe(true);
        expect(coreUpdated).toBe(true);
        console.log('SUCCESS: System self-healed after Redis restoration.');
    });
});
