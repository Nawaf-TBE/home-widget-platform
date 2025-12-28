import request from 'supertest';
import { app } from '../src/index';
import { pool, query } from '../src/db';
import { generateToken } from '../src/auth';

describe('Product API Transactional Regression', () => {
    let authToken: string;
    const userId = 'transaction-test-user';
    let dealId: string;

    beforeAll(async () => {
        await query('DELETE FROM outbox');
        await query('DELETE FROM saved_deals');
        await query('DELETE FROM widget_versions');

        // Ensure we have a real 'deal' kind item
        const dealsRes = await query("SELECT id FROM deals WHERE kind = 'deal' LIMIT 1");
        dealId = dealsRes.rows[0].id;
        authToken = generateToken(userId);
    });

    afterAll(async () => {
        await pool.end();
    });

    it('PROVE: Snapshot includes newly saved deal (Single Transaction Read)', async () => {
        // Trigger save
        const res = await request(app)
            .post(`/v1/deals/${dealId}/save`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        // Check the LATEST outbox entry for this user
        const outboxRes = await query(
            'SELECT payload FROM outbox WHERE aggregate_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        const event = outboxRes.rows[0].payload;
        const root = event.content.root;
        const items = root.items;

        // Find the layout component (carousel or grid)
        const layoutComponent = items.find((i: any) => i.type === 'horizontal_carousel' || i.type === 'grid');

        // PROOF: If the transaction fix is working, items should NOT be empty
        // because we read from the SAME connection that just PERFORMED the insert.
        expect(layoutComponent.items.length).toBeGreaterThan(0);
        expect(layoutComponent.items[0].deeplink).toContain(dealId);
    });
});
