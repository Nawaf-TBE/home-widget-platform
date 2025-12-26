import { Router } from 'express';
import crypto from 'crypto';
import { pool, query } from './db';
import { authenticateJWT, AuthenticatedRequest, generateToken } from './auth';

const router = Router();

// Auth Endpoint
router.post('/auth/login', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'userId required' });
    }
    const token = generateToken(userId);
    res.json({ token });
});

// List Deals
router.get('/deals', async (req, res) => {
    try {
        const result = await query('SELECT * FROM deals ORDER BY created_at DESC');
        res.json(result.rows);
    } catch {
        res.status(500).json({ error: 'Database error' });
    }
});

// Helper for snapshots
const generateSnapshot = async (userId: string) => {
    // 1. Get Saved Deals
    const savedRes = await query(`
        SELECT d.id, d.title, d.price 
        FROM saved_deals s
        JOIN deals d ON s.deal_id = d.id
        WHERE s.user_id = $1
    `, [userId]);

    const deals = savedRes.rows;

    // 2. Build Root Payload (Generic)
    const items: unknown[] = deals.map(d => ({
        type: 'text_row',
        text: `${d.title} - $${d.price}`
    }));

    // Add header
    items.unshift({ type: 'text_row', text: 'Top Deals For You' });

    // Add action button
    items.push({ type: 'action_button', label: 'View All', deeplink: 'app://deals' });

    const root = {
        type: 'widget_container',
        title: 'Your Deals',
        items: items
    };

    return root;
}

const WIDGET_KEY = 'top_deals';

// Save Deal
router.post('/deals/:id/save', authenticateJWT, async (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.id;
    const dealId = req.params.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert Saved Deal
        await client.query(
            'INSERT INTO saved_deals (user_id, deal_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, dealId]
        );

        // 2. Increment Version
        const verRes = await client.query(`
            INSERT INTO widget_versions (user_id, widget_key, version)
            VALUES ($1, $2, 1)
            ON CONFLICT (user_id, widget_key)
            DO UPDATE SET version = widget_versions.version + 1
            RETURNING version
        `, [userId, WIDGET_KEY]);
        const newVersion = verRes.rows[0].version;

        // 3. Generate Snapshot
        const rootContent = await generateSnapshot(userId);

        // 4. Outbox Insert - Web
        const eventWeb = {
            event_id: crypto.randomUUID(),
            product_id: 'deals_app',
            platform: 'web',
            audience_type: 'user',
            audience_id: userId,
            widget_key: WIDGET_KEY,
            schema_version: 1,
            data_version: newVersion,
            min_ios_version: 1,
            content: {
                schema_version: 1,
                data_version: newVersion,
                root: rootContent
            }
        };

        // 4. Outbox Insert - iOS
        const eventIOS = {
            ...eventWeb,
            event_id: crypto.randomUUID(),
            platform: 'ios',
            min_ios_version: 16
        };

        const EVENT_TYPE = 'WIDGET_SNAPSHOT_UPSERT';
        await client.query(
            'INSERT INTO outbox (aggregate_id, event_type, payload) VALUES ($1, $2, $3), ($4, $5, $6)',
            [userId, EVENT_TYPE, JSON.stringify(eventWeb), userId, EVENT_TYPE, JSON.stringify(eventIOS)]
        );

        await client.query('COMMIT');
        res.sendStatus(200);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Transaction failed' });
    } finally {
        client.release();
    }
});

// Unsave Deal
router.post('/deals/:id/unsave', authenticateJWT, async (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.id;
    const dealId = req.params.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Delete Saved Deal
        await client.query(
            'DELETE FROM saved_deals WHERE user_id = $1 AND deal_id = $2',
            [userId, dealId]
        );

        // 2. Increment Version
        const verRes = await client.query(`
            INSERT INTO widget_versions (user_id, widget_key, version)
            VALUES ($1, $2, 1)
            ON CONFLICT (user_id, widget_key)
            DO UPDATE SET version = widget_versions.version + 1
            RETURNING version
        `, [userId, WIDGET_KEY]);
        const newVersion = verRes.rows[0].version;

        // 3. Generate Snapshot
        const rootContent = await generateSnapshot(userId);

        // 4. Outbox Insert
        const eventWeb = {
            event_id: crypto.randomUUID(),
            product_id: 'deals_app',
            platform: 'web',
            audience_type: 'user',
            audience_id: userId,
            widget_key: WIDGET_KEY,
            schema_version: 1,
            data_version: newVersion,
            min_ios_version: 1,
            content: {
                schema_version: 1,
                data_version: newVersion,
                root: rootContent
            }
        };

        const eventIOS = {
            ...eventWeb,
            event_id: crypto.randomUUID(),
            platform: 'ios',
            min_ios_version: 16
        };

        const EVENT_TYPE = 'WIDGET_SNAPSHOT_UPSERT';
        await client.query(
            'INSERT INTO outbox (aggregate_id, event_type, payload) VALUES ($1, $2, $3), ($4, $5, $6)',
            [userId, EVENT_TYPE, JSON.stringify(eventWeb), userId, EVENT_TYPE, JSON.stringify(eventIOS)]
        );

        await client.query('COMMIT');
        res.sendStatus(200);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Transaction failed' });
    } finally {
        client.release();
    }
});

// Admin Publish Default
router.post('/admin/publish-default', async (req, res) => {
    // In real app, check admin auth.

    // Default Widget Content
    const defaultContent = {
        type: 'widget_container',
        title: 'Top Deals',
        items: [
            { type: 'text_row', text: 'Welcome to Deals!' },
            { type: 'action_button', label: 'Browse', deeplink: 'app://browse' }
        ]
    };

    const eventWeb = {
        event_id: crypto.randomUUID(),
        product_id: 'deals_app',
        platform: 'web',
        audience_type: 'default',
        audience_id: 'global',
        widget_key: WIDGET_KEY,
        schema_version: 1,
        data_version: 1,
        min_ios_version: 1,
        content: {
            schema_version: 1,
            data_version: 1,
            root: defaultContent
        }
    };

    const eventIOS = {
        ...eventWeb,
        event_id: crypto.randomUUID(),
        platform: 'ios',
        min_ios_version: 16
    };

    const EVENT_TYPE = 'WIDGET_SNAPSHOT_UPSERT';

    // Insert to Outbox
    try {
        await query(
            'INSERT INTO outbox (aggregate_id, event_type, payload) VALUES ($1, $2, $3), ($4, $5, $6)',
            ['default', EVENT_TYPE, JSON.stringify(eventWeb), 'default', EVENT_TYPE, JSON.stringify(eventIOS)]
        );
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to publish default' });
    }
});

// List Saved Deals
router.get('/me/saved', authenticateJWT, async (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.id;
    try {
        const result = await query(`
            SELECT d.* 
            FROM saved_deals s
            JOIN deals d ON s.deal_id = d.id
            WHERE s.user_id = $1
        `, [userId]);
        res.json(result.rows);
    } catch {
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
