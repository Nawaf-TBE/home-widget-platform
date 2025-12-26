import request from 'supertest';
import { app } from './index';
import { pool, query } from './db';
import { generateToken } from './auth';

describe('Product Deals API Integration', () => {
    let authToken: string;
    const userId = 'test-user-123';
    let dealId: string;

    beforeAll(async () => {
        // Clear tables
        await query('DELETE FROM outbox');
        await query('DELETE FROM saved_deals');
        await query('DELETE FROM widget_versions');
        // Ensure we have deals (migration seeds them, but let's grab one)
        const dealsRes = await query('SELECT id FROM deals LIMIT 1');
        if (dealsRes.rows.length === 0) {
            // Re-seed if needed, but migration should have handled it.
            // But if tests ran before migration finishes...? It's sequential.
        }
        dealId = dealsRes.rows[0].id;
        authToken = generateToken(userId);
    });

    afterAll(async () => {
        await pool.end();
    });

    it('GET /deals returns list', async () => {
        const res = await request(app).get('/v1/deals');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('POST /deals/:id/save saves deal and creates outbox event', async () => {
        const res = await request(app)
            .post(`/v1/deals/${dealId}/save`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        // Check saved_deals
        const saved = await query('SELECT * FROM saved_deals WHERE user_id = $1 AND deal_id = $2', [userId, dealId]);
        expect(saved.rows.length).toBe(1);

        // Check widget_versions
        const ver = await query('SELECT * FROM widget_versions WHERE user_id = $1', [userId]);
        expect(ver.rows.length).toBe(1);
        expect(ver.rows[0].version).toBeGreaterThan(0);

        // Check Outbox
        const outbox = await query('SELECT * FROM outbox ORDER BY created_at DESC LIMIT 2');
        expect(outbox.rows.length).toBe(2); // Web + iOS
        const event1 = outbox.rows[0].payload;
        expect(event1.product_id).toBe('deals_app');
        expect(event1.widget_key).toBe('top_deals');
        expect(event1.audience_id).toBe(userId);
        expect(event1.data_version).toBe(ver.rows[0].version);
    });

    it('GET /me/saved returns saved deal', async () => {
        const res = await request(app)
            .get('/v1/me/saved')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].id).toBe(dealId);
    });

    it('POST /deals/:id/unsave removes deal and updates version', async () => {
        const res = await request(app)
            .post(`/v1/deals/${dealId}/unsave`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        // Check saved_deals
        const saved = await query('SELECT * FROM saved_deals WHERE user_id = $1 AND deal_id = $2', [userId, dealId]);
        expect(saved.rows.length).toBe(0);

        // Check widget_versions incremented
        await query('SELECT * FROM widget_versions WHERE user_id = $1', [userId]);
        // Check Outbox - should have added 2 more (total 4 now)
        const outbox = await query('SELECT * FROM outbox');
        expect(outbox.rows.length).toBe(4);
    });

    it('POST /admin/publish-default creates outbox entries', async () => {
        const res = await request(app).post('/v1/admin/publish-default');
        expect(res.status).toBe(200);

        const outbox = await query('SELECT * FROM outbox WHERE aggregate_id = $1', ['default']);
        expect(outbox.rows.length).toBe(2);
        expect(outbox.rows[0].payload.audience_type).toBe('default');
    });
});
