import axios from 'axios';
import {
    CORE_API,
    PRODUCT_API,
    stopContainer,
    startContainer,
    getJWT,
    sleep,
    getCoreDB,
    runCommand
} from './utils';

describe('Resilience: Ingester Restart', () => {
    const userId = 'user-resilience-ingester';
    let jwt: string;

    beforeAll(async () => {
        jwt = await getJWT(userId);
    });

    test('Ingester reclaims pending and avoids regressions', async () => {
        console.log('--- Step 1: Stop Ingester ---');
        stopContainer('core-ingester');

        console.log('--- Step 2: Generate an event while Ingester is down ---');
        const dealsRes = await axios.get(`${PRODUCT_API}/deals`);
        const deal0 = dealsRes.data[0];

        await axios.post(`${PRODUCT_API}/deals/${deal0.id}/save`, {}, {
            headers: { Authorization: `Bearer ${jwt}` }
        });
        await sleep(2000); // Wait for worker to push to Redis

        console.log('--- Step 3: Confirm DB is NOT updated yet ---');
        const coreDb = await getCoreDB();
        const beforeCheck = await coreDb.query('SELECT count(*) FROM widgets WHERE audience_id = $1', [userId]);
        console.log(`Widgets in DB before restart: ${beforeCheck.rows[0].count}`);

        const coreRes = await axios.get(`${CORE_API}/home/widgets?platform=web`, {
            headers: { Authorization: `Bearer ${jwt}` }
        });
        expect(JSON.stringify(coreRes.data)).not.toContain(deal0.title);

        console.log('--- Step 4: Restart Ingester ---');
        startContainer('core-ingester');
        await sleep(15000); // Wait for processing

        console.log('--- Step 5: Verify DB is updated via reclamation ---');
        const afterCheck = await axios.get(`${CORE_API}/home/widgets?platform=web`, {
            headers: { Authorization: `Bearer ${jwt}` }
        });
        console.log('Final Widgets state retrieved.');
        expect(JSON.stringify(afterCheck.data)).toContain(deal0.title);

        const dbFinal = await coreDb.query('SELECT data_version FROM widgets WHERE audience_id = $1', [userId]);
        console.log(`Final data version in DB: ${dbFinal.rows[0]?.data_version}`);
        expect(dbFinal.rows[0]?.data_version).toBeGreaterThanOrEqual(1);

        await coreDb.end();
        console.log('SUCCESS: Ingester recovered and processed backlogged events.');
    });
});
