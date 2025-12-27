import { Router } from 'express';
import crypto from 'crypto';
import { pool, query } from './db';
import { authenticateJWT, AuthenticatedRequest, generateToken } from './auth';

const router = Router();

// Layout variant: "carousel" | "grid" - controls personalized widget layout
// Default widget uses OPPOSITE layout for immediate visual contrast
const LAYOUT_VARIANT = (process.env.DEALS_WIDGET_LAYOUT_VARIANT || 'carousel') as 'carousel' | 'grid';

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

// Helper: Create deal_card from deal row
interface DealRow {
    id: string;
    title: string;
    price: number;
    original_price?: number;
    category?: string;
    image_url?: string;
    badge_text?: string;
}

const createDealCard = (deal: DealRow) => ({
    type: 'deal_card',
    title: deal.title,
    category: deal.category || 'Deals',
    image_url: deal.image_url || `https://picsum.photos/seed/${deal.id}/200`,
    price: parseFloat(String(deal.price)),
    ...(deal.original_price ? { original_price: parseFloat(String(deal.original_price)) } : {}),
    ...(deal.badge_text ? { badge_text: deal.badge_text } : {}),
    deeplink: `app://deals/${deal.id}`
});

// Helper: Generate personalized snapshot with DealCards
const generatePersonalizedSnapshot = async (userId: string, layoutVariant: 'carousel' | 'grid') => {
    // Get Saved Deals
    const savedRes = await query(`
        SELECT d.id, d.title, d.price, d.original_price, d.category, d.image_url, d.badge_text
        FROM saved_deals s
        JOIN deals d ON s.deal_id = d.id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT 12
    `, [userId]);

    const dealCards = savedRes.rows.map((d: DealRow) => createDealCard(d));

    // Build layout component based on variant
    const layoutComponent = layoutVariant === 'carousel'
        ? { type: 'horizontal_carousel', items: dealCards }
        : { type: 'grid', columns: 2, items: dealCards };

    const root = {
        type: 'widget_container',
        title: 'Your Deals',
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        items: [
            { type: 'section_header', title: '❤️ Your Saved Top-Deals', subtitle: 'Personalized for you' },
            layoutComponent,
            { type: 'action_button', label: 'View All Saved', deeplink: 'app://me/saved' }
        ]
    };

    return root;
};

// Helper: Generate default snapshot with OPPOSITE layout
const generateDefaultSnapshot = async (layoutVariant: 'carousel' | 'grid') => {
    // Get featured deals (first 4 deals as "featured")
    const dealsRes = await query(`
        SELECT id, title, price, original_price, category, image_url, badge_text
        FROM deals
        ORDER BY created_at DESC
        LIMIT 4
    `);

    const dealCards = dealsRes.rows.map((d: DealRow) => createDealCard(d));

    // Default uses OPPOSITE layout of personalized
    const oppositeLayout = layoutVariant === 'carousel' ? 'grid' : 'carousel';

    const layoutComponent = oppositeLayout === 'grid'
        ? { type: 'grid', columns: 2, items: dealCards }
        : { type: 'horizontal_carousel', items: dealCards };

    const root = {
        type: 'widget_container',
        title: 'Top Deals',
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        items: [
            { type: 'section_header', title: '🔥 Featured Deals', subtitle: 'Best offers of the day' },
            layoutComponent,
            { type: 'action_button', label: 'Browse All Deals', deeplink: 'app://deals' }
        ]
    };

    return root;
};

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

        // 3. Generate Snapshot with DealCards
        const rootContent = await generatePersonalizedSnapshot(userId, LAYOUT_VARIANT);

        // 4. Outbox Insert - Web
        const eventWeb = {
            event_id: crypto.randomUUID(),
            product_id: 'deals_app',
            platform: 'web',
            audience_type: 'user',
            audience_id: userId,
            widget_key: WIDGET_KEY,
            schema_version: 2,
            data_version: newVersion,
            min_ios_version: 1,
            content: {
                schema_version: 2,
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
        const rootContent = await generatePersonalizedSnapshot(userId, LAYOUT_VARIANT);

        // 4. Outbox Insert
        const eventWeb = {
            event_id: crypto.randomUUID(),
            product_id: 'deals_app',
            platform: 'web',
            audience_type: 'user',
            audience_id: userId,
            widget_key: WIDGET_KEY,
            schema_version: 2,
            data_version: newVersion,
            min_ios_version: 1,
            content: {
                schema_version: 2,
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

// Admin Publish Default - uses OPPOSITE layout of personalized
router.post('/admin/publish-default', async (_req, res) => {
    try {
        // Generate default content with OPPOSITE layout
        const defaultContent = await generateDefaultSnapshot(LAYOUT_VARIANT);

        // Use timestamp as data_version to ensure updates always take effect
        const dataVersion = Math.floor(Date.now() / 1000);

        const eventWeb = {
            event_id: crypto.randomUUID(),
            product_id: 'deals_app',
            platform: 'web',
            audience_type: 'default',
            audience_id: 'global',
            widget_key: WIDGET_KEY,
            schema_version: 2,
            data_version: dataVersion,
            min_ios_version: 1,
            content: {
                schema_version: 2,
                data_version: dataVersion,
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

// Expose current layout variant for debugging
router.get('/admin/layout-variant', (_req, res) => {
    res.json({
        personalized: LAYOUT_VARIANT,
        default: LAYOUT_VARIANT === 'carousel' ? 'grid' : 'carousel'
    });
});

export default router;
