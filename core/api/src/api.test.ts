import request from 'supertest';
import { app } from './index';
import { generateToken } from './auth';
import { pool } from './db';
import { redisClient } from './redis';

describe('Core Delivery API Integration', () => {
    const adminToken = generateToken({ id: 'admin-1', role: 'admin' });
    const userToken = generateToken({ id: 'user-123', role: 'user' });

    const testWidget = {
        product_id: 'check24',
        platform: 'ios',
        audience_type: 'user',
        audience_id: 'user-123',
        widget_key: 'hero-banner',
        content: { title: 'Welcome User 123' },
        schema_version: 1,
        data_version: 1
    };

    const otherUserWidget = {
        product_id: 'check24',
        platform: 'ios',
        audience_type: 'user',
        audience_id: 'user-456',
        widget_key: 'hero-banner',
        content: { title: 'Welcome User 456' },
        schema_version: 1,
        data_version: 1
    };

    beforeAll(async () => {
        // Clear DB and Redis
        await pool.query('DELETE FROM widgets');
        if (!redisClient.isOpen) await redisClient.connect();
        await redisClient.flushAll();
    });

    afterAll(async () => {
        await pool.end();
        await redisClient.quit();
    });

    it('health check returns ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('internal upsert works for admin', async () => {
        const res = await request(app)
            .post('/v1/internal/widgets')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(testWidget);
        expect(res.status).toBe(201);
    });

    it('delivery returns widget for correct user', async () => {
        const res = await request(app)
            .post('/v1/widgets/delivery')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                keys: [{
                    product_id: 'check24',
                    platform: 'ios',
                    audience_type: 'user',
                    audience_id: 'user-123',
                    widget_key: 'hero-banner'
                }]
            });

        expect(res.status).toBe(200);
        expect(res.body.widgets).toHaveLength(1);
        expect(res.body.widgets[0].content.title).toBe('Welcome User 123');
    });

    it('delivery filters out widget for different user (gating)', async () => {
        // First upsert the other user's widget
        await request(app)
            .post('/v1/internal/widgets')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(otherUserWidget);

        const res = await request(app)
            .post('/v1/widgets/delivery')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                keys: [{
                    product_id: 'check24',
                    platform: 'ios',
                    audience_type: 'user',
                    audience_id: 'user-456',
                    widget_key: 'hero-banner'
                }]
            });

        expect(res.status).toBe(200);
        expect(res.body.widgets).toHaveLength(0); // Should be gated
    });

    it('subsequent request hits cache', async () => {
        // We can check if it hits cache by manually setting something in Redis
        const cacheKey = 'widget:check24:ios:user:user-123:hero-banner';
        const cachedWidget = { ...testWidget, content: { title: 'From Cache' } };
        await redisClient.set(cacheKey, JSON.stringify(cachedWidget));

        const res = await request(app)
            .post('/v1/widgets/delivery')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                keys: [{
                    product_id: 'check24',
                    platform: 'ios',
                    audience_type: 'user',
                    audience_id: 'user-123',
                    widget_key: 'hero-banner'
                }]
            });

        expect(res.status).toBe(200);
        expect(res.body.widgets[0].content.title).toBe('From Cache');
    });
});
