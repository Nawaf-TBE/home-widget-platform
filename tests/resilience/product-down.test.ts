import axios from 'axios';
import {
    CORE_API,
    PRODUCT_API,
    stopContainer,
    startContainer,
    getJWT,
    sleep,
    getContainerStatus
} from './utils';

describe('Resilience: Product API Down', () => {
    const userId = 'user-resilience-product';
    let jwt: string;

    beforeAll(async () => {
        // Ensure system is healthy and has data
        await axios.post(`${PRODUCT_API}/admin/publish-default`);
        jwt = await getJWT(userId);
        await sleep(2000); // sync
    });

    test('Core API serves cached widgets when Product API is down', async () => {
        console.log('--- Step 1: Verify Core API is functional ---');
        const res1 = await axios.get(`${CORE_API}/home/widgets?platform=web`, {
            headers: { Authorization: `Bearer ${jwt}` }
        });
        expect(res1.data.length).toBeGreaterThan(0);
        const initialWidgetsCount = res1.data.length;
        console.log(`Initial widgets served: ${initialWidgetsCount}`);

        console.log('--- Step 2: Stop Product API ---');
        stopContainer('product-deals-api');
        expect(getContainerStatus('product-deals-api')).toContain('exited');

        console.log('--- Step 3: Verify Core API still serves widgets ---');
        try {
            const res2 = await axios.get(`${CORE_API}/home/widgets?platform=web`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            console.log(`Widgets served during outage: ${res2.data.length}`);
            expect(res2.data.length).toBe(initialWidgetsCount);
            console.log('SUCCESS: Core API remains functional.');
        } catch (err: any) {
            console.error('FAILURE: Core API broke when Product API went down', err.message);
            throw err;
        } finally {
            console.log('--- Step 4: Restart Product API ---');
            startContainer('product-deals-api');
            await sleep(5000); // Startup time
        }
    });
});
