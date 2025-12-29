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

// Get Current User Identity
router.get('/me', authenticateJWT, (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.sub;
    res.json({ userId });
});

// List Deals
router.get('/deals', async (req, res) => {
    try {
        const { kind, limit } = req.query;
        let queryText = 'SELECT * FROM deals';
        const params: any[] = [];

        if (kind) {
            queryText += ' WHERE kind = $1';
            params.push(kind);
        }

        queryText += ' ORDER BY created_at DESC';

        if (limit) {
            queryText += ` LIMIT $${params.length + 1}`;
            params.push(limit);
        }

        const result = await query(queryText, params);
        res.json(result.rows);
    } catch {
        res.status(500).json({ error: 'Database error' });
    }
});

// List Tariffs
router.get('/tariffs', async (req, res) => {
    try {
        const result = await query("SELECT * FROM deals WHERE kind = 'tariff' ORDER BY created_at DESC");
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
    kind: 'deal' | 'category_tile' | 'tariff';
    data_gb?: number;
    price_per_month?: number;
    compare_count?: number;
    currency?: string;
}

const createDealCard = (deal: DealRow) => ({
    type: 'deal_card',
    title: deal.title,
    category: deal.category || 'Deals',
    image_url: deal.image_url || `https://picsum.photos/seed/${deal.id}/200`,
    // Only return price if > 0
    ...(Number(deal.price) > 0 ? { price: Number(deal.price), currency: deal.currency || 'EUR' } : {}),
    ...(Number(deal.original_price) > 0 ? { original_price: Number(deal.original_price) } : {}),
    ...(deal.badge_text ? { badge_text: deal.badge_text } : {}),
    deeplink: `/deals/${deal.id}`
});

const createCategoryTile = (deal: DealRow) => ({
    type: 'deal_card',
    title: deal.title,
    image_url: deal.image_url || `https://picsum.photos/seed/${deal.id}/200`,
    deeplink: `/category/${deal.title.toLowerCase()}`,
    ...(deal.badge_text ? { badge_text: deal.badge_text } : {})
});

const createTariffTile = (deal: DealRow) => ({
    type: 'tariff_tile',
    data_gb: Math.max(1, deal.data_gb || 1),
    ...(Number(deal.price_per_month) > 0 ? { price_per_month: Number(deal.price_per_month), currency: 'EUR' } : {}),
    compare_count: deal.compare_count || 3,
    deeplink: `/tariffs`, // Specific tariff linking not fully supported yet, fallback to list
    ...(deal.badge_text ? { badge_text: deal.badge_text } : {})
});

const generatePersonalizedSnapshot = async (userId: string, layoutVariant: 'carousel' | 'grid', dbClient?: { query: typeof query }) => {
    const q = dbClient ? dbClient.query.bind(dbClient) : query;
    // Get Saved Deals
    const savedRes = await q(`
        SELECT d.*
        FROM saved_deals s
        JOIN deals d ON s.deal_id = d.id
        WHERE s.user_id = $1 AND d.kind = 'deal'
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
            { type: 'action_button', label: 'View All Saved', deeplink: '/saved' }
        ]
    };

    return root;
};

// Helper: Generate default top_deals snapshot
const generateTopDealsSnapshot = async (layoutVariant: 'carousel' | 'grid') => {
    const dealsRes = await query(`
        SELECT * FROM deals
        WHERE kind = 'deal'
        ORDER BY created_at DESC
        LIMIT 4
    `);

    const dealCards = dealsRes.rows.map((d: DealRow) => createDealCard(d));
    const oppositeLayout = layoutVariant === 'carousel' ? 'grid' : 'carousel';
    const layoutComponent = oppositeLayout === 'grid'
        ? { type: 'grid', columns: 2, items: dealCards }
        : { type: 'horizontal_carousel', items: dealCards };

    return {
        type: 'widget_container',
        title: 'Top Deals',
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        items: [
            { type: 'section_header', title: '🔥 Featured Deals', subtitle: 'Best offers of the day' },
            layoutComponent,
            { type: 'action_button', label: 'Browse All Deals', deeplink: '/deals' }
        ]
    };
};

// Helper: Generate categories_grid snapshot
const generateCategoriesSnapshot = async () => {
    const res = await query(`
        SELECT * FROM deals WHERE kind = 'category_tile' LIMIT 4
    `);

    const items = res.rows.map((d: DealRow) => createCategoryTile(d));

    return {
        type: 'widget_container',
        title: 'Categories',
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        items: [
            { type: 'section_header', title: 'Browse Categories' },
            { type: 'grid', columns: 2, items },
            { type: 'action_button', label: 'Discover all offers', deeplink: '/categories' }
        ]
    };
};

// Helper: Generate tariffs_section snapshot
const generateTariffsSnapshot = async () => {
    const res = await query(`
        SELECT * FROM deals WHERE kind = 'tariff' LIMIT 3
    `);

    const items = res.rows.map((d: DealRow) => createTariffTile(d));

    return {
        type: 'widget_container',
        title: 'Tariffs',
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        items: [
            { type: 'section_header', title: 'SIM Tariffs', subtitle: 'Compare offers' },
            { type: 'list', items },
            { type: 'action_button', label: 'Compare tariffs', deeplink: '/tariffs' }
        ]
    };
};

const WIDGET_KEY = 'top_deals';

// Save Deal
router.post('/deals/:id/save', authenticateJWT, async (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.sub;
    const dealId = req.params.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 0. Validate Deal Kind
        const kindRes = await client.query('SELECT kind FROM deals WHERE id = $1', [dealId]);
        if (kindRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Deal not found' });
        }
        const kind = kindRes.rows[0].kind;
        if (!['deal', 'tariff'].includes(kind)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Item is not saveable' });
        }

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
        const rootContent = await generatePersonalizedSnapshot(userId, LAYOUT_VARIANT, client);

        // 4. Outbox Insert - Web & iOS
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
            content: { schema_version: 2, data_version: newVersion, root: rootContent }
        };
        const eventIOS = { ...eventWeb, event_id: crypto.randomUUID(), platform: 'ios', min_ios_version: 16 };

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
    const userId = (req as AuthenticatedRequest).user!.sub;
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
        const rootContent = await generatePersonalizedSnapshot(userId, LAYOUT_VARIANT, client);

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
            content: { schema_version: 2, data_version: newVersion, root: rootContent }
        };
        const eventIOS = { ...eventWeb, event_id: crypto.randomUUID(), platform: 'ios', min_ios_version: 16 };

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

// Admin Seed: Populate Categories and Tariffs
router.post('/admin/seed', async (_req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Define Categories
        const categories = [
            { title: 'Electronics', imageUrl: 'https://picsum.photos/seed/elec/200', badge: 'Top Picks' },
            { title: 'Furniture', imageUrl: 'https://picsum.photos/seed/furn/200' },
            { title: 'Travel', imageUrl: 'https://picsum.photos/seed/trav/200', badge: 'Summer' },
            { title: 'Insurance', imageUrl: 'https://picsum.photos/seed/ins/200' }
        ];

        for (const cat of categories) {
            // Use 0 as fallback price, default other fields
            await client.query(`
                 INSERT INTO deals (id, title, price, image_url, badge_text, kind)
                 VALUES ($1, $2, 0, $3, $4, 'category_tile')
                 ON CONFLICT (id) DO UPDATE SET kind = 'category_tile'
             `, [crypto.randomUUID(), cat.title, cat.imageUrl, cat.badge]);
        }

        const deals = [
            { id: crypto.randomUUID(), title: 'iPhone 15', price: 799.99, imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569', badge: 'New' },
            { id: crypto.randomUUID(), title: 'Dyson V15', price: 599.99, imageUrl: 'https://images.unsplash.com/photo-1558317374-a359d2439327' },
            { id: crypto.randomUUID(), title: 'MacBook Air', price: 1099.00, imageUrl: 'https://images.unsplash.com/photo-1611186871348-1847e6bb7c8c', badge: 'Best Seller' },
        ];

        for (const d of deals) {
            await client.query(`
                INSERT INTO deals (id, title, price, image_url, badge_text, kind)
                VALUES ($1, $2, $3, $4, $5, 'deal')
                ON CONFLICT (id) DO UPDATE SET kind = 'deal', price = $3, image_url = $4
            `, [d.id, d.title, d.price, d.imageUrl, d.badge]);
        }

        // Define Tariffs
        const tariffs = [
            { id: crypto.randomUUID(), data: 5, price: 9.99, compare: 12 },
            { id: crypto.randomUUID(), data: 10, price: 14.99, compare: 8, badge: 'Best Value' },
            { id: crypto.randomUUID(), data: 50, price: 29.99, compare: 5 }
        ];

        for (const t of tariffs) {
            await client.query(`
                INSERT INTO deals (id, title, price, data_gb, price_per_month, compare_count, badge_text, kind)
                VALUES ($1, 'Tariff', 0, $2, $3, $4, $5, 'tariff')
                ON CONFLICT (id) DO UPDATE SET kind = 'tariff'
            `, [t.id, t.data, t.price, t.compare, t.badge]);
        }

        await client.query('COMMIT');
        res.sendStatus(200);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: 'Seeding failed' });
    } finally {
        client.release();
    }
});

// Admin Publish Default - publishes ALL default widgets
router.post('/admin/publish-default', async (_req, res) => {
    try {
        const dataVersion = Math.floor(Date.now() / 1000);
        const EVENT_TYPE = 'WIDGET_SNAPSHOT_UPSERT';

        const widgets = [];

        // 1. Top Deals
        const topDeals = await generateTopDealsSnapshot(LAYOUT_VARIANT);
        widgets.push({ key: 'top_deals', content: topDeals });

        // 2. Categories
        const categories = await generateCategoriesSnapshot();
        widgets.push({ key: 'categories_grid', content: categories });

        // 3. Tariffs
        const tariffs = await generateTariffsSnapshot();
        widgets.push({ key: 'tariffs_section', content: tariffs });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const w of widgets) {
                const eventWeb = {
                    event_id: crypto.randomUUID(),
                    product_id: 'deals_app',
                    platform: 'web',
                    audience_type: 'default',
                    audience_id: 'global',
                    widget_key: w.key,
                    schema_version: 2,
                    data_version: dataVersion,
                    min_ios_version: 1,
                    content: { schema_version: 2, data_version: dataVersion, root: w.content }
                };
                const eventIOS = { ...eventWeb, event_id: crypto.randomUUID(), platform: 'ios', min_ios_version: 16 };

                await client.query(
                    'INSERT INTO outbox (aggregate_id, event_type, payload) VALUES ($1, $2, $3), ($4, $5, $6)',
                    ['default', EVENT_TYPE, JSON.stringify(eventWeb), 'default', EVENT_TYPE, JSON.stringify(eventIOS)]
                );
            }

            await client.query('COMMIT');
            res.sendStatus(200);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to publish defaults' });
    }
});

// List Saved Deals
router.get('/me/saved', authenticateJWT, async (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.sub;
    try {
        const result = await query(`
            SELECT d.* 
            FROM saved_deals s
            JOIN deals d ON s.deal_id = d.id
            WHERE s.user_id = $1 AND d.kind IN ('deal', 'tariff')
        `, [userId]);

        // Sanitize prices: 0 or null becomes null
        const sanitized = result.rows.map(row => ({
            ...row,
            price: (Number(row.price) > 0) ? Number(row.price) : null,
            currency: 'EUR', // Default currency for saved items
            original_price: (Number(row.original_price) > 0) ? Number(row.original_price) : null
        }));

        res.json(sanitized);
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
