import { processMessage } from '../src/ingester';
import { redisClient, connectRedis } from '../src/redis';
import { pool } from '../src/db';


// Mock specific redis/db calls if needed, OR use real connections since we have them in docker.
// Prompt asks for "Integration with real redis/postgres".
// So we will use the exported modules which are configured to connect to localhost ports.

describe('Core Ingester Integration', () => {
    const STREAM_KEY = 'events';

    beforeAll(async () => {
        // Connect and cleanup
        await connectRedis();
        // Just in case
        await pool.query('DELETE FROM widgets');
        await redisClient.del(STREAM_KEY);
        const keys = await redisClient.keys('widget:*');
        if (keys.length) await redisClient.del(keys);
    });

    afterAll(async () => {
        await pool.end();
        await redisClient.quit();
    });

    const validEventV0 = {
        event_id: '00000000-0000-0000-0000-000000000000',
        product_id: 'check24',
        platform: 'ios',
        audience_type: 'user',
        audience_id: 'u1',
        widget_key: 'w1',
        schema_version: 1,
        data_version: 0,
        min_ios_version: 10,
        content: {
            schema_version: 1,
            data_version: 0,
            root: {
                type: 'widget_container',
                title: 'V0',
                items: []
            }
        }
    };

    const validEventV1 = {
        event_id: '11111111-1111-1111-1111-111111111111',
        product_id: 'check24',
        platform: 'ios',
        audience_type: 'user',
        audience_id: 'u1',
        widget_key: 'w1',
        schema_version: 1,
        data_version: 1,
        min_ios_version: 10,
        content: {
            schema_version: 1,
            data_version: 1,
            root: {
                type: 'widget_container',
                title: 'V1',
                items: []
            }
        }
    };

    it('processes XADD event v1 -> DB row created and redis key exists', async () => {
        // We can simulate the "processStream" loop by manually calling processMessage 
        // OR by actually checking side effects after putting it in the stream.
        // But since `startIngester` runs infinite loops, it's hard to test in Jest without detached process.
        // Better to test `processMessage` directly as the "Integration unit". 
        // OR, we can XADD and then manually invoke `processMessage` with the ID we got back, passing the payload.

        // 1. Process V1
        // Mock a redis stream message structure
        const msgId = '1000-0';
        await processMessage(msgId, { event: JSON.stringify(validEventV1) });

        // Check DB
        const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['w1']);
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].data_version).toBe(1);
        expect(res.rows[0].content.root.title).toBe('V1');

        // Check Redis
        const cacheKey = 'widget:check24:ios:user:u1:w1';
        const cached = await redisClient.get(cacheKey);
        expect(cached).toBeTruthy();
        const cachedObj = JSON.parse(cached!);
        expect(cachedObj.content.root.title).toBe('V1');
    });

    it('XADD older event v0 -> DB not overwritten', async () => {
        // 2. Process V0 (older than V1)
        const msgId = '1001-0';
        await processMessage(msgId, { event: JSON.stringify(validEventV0) });

        // Check DB - should still be V1
        const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['w1']);
        expect(res.rows[0].data_version).toBe(1);
        expect(res.rows[0].content.root.title).toBe('V1');
    });

    it('handles validation failure gracefully (no ack, logs error)', async () => {
        const invalidEvent = { header: { product_id: 'unknown' } }; // Missing required fields
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        await processMessage('1002-0', { event: JSON.stringify(invalidEvent) });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
        // Since we mocked xAck in logic? No, we are using real redis.
        // We can't easily check "did NOT ack" here unless we check Pending Entries List (PEL).
        // If we were using a real consumer group flow, we could check PEL.
    });

    it('restart scenario: idempotent processing', async () => {
        // Simulate re-processing the same V1 message
        const msgId = '1000-0';
        await processMessage(msgId, { event: JSON.stringify(validEventV1) });

        // Check DB - no error, state remains same
        const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['w1']);
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].data_version).toBe(1);
    });

    describe('New Component Types (Flexibility)', () => {
        const validEventWithGrid = {
            event_id: '22222222-2222-2222-2222-222222222222',
            product_id: 'deals_app',
            platform: 'web',
            audience_type: 'default',
            audience_id: 'global',
            widget_key: 'flex_grid',
            schema_version: 2,
            data_version: 1,
            content: {
                schema_version: 2,
                data_version: 1,
                root: {
                    type: 'widget_container',
                    title: 'Grid Test',
                    padding: { top: 16, right: 16, bottom: 16, left: 16 },
                    items: [
                        { type: 'section_header', title: 'Featured', subtitle: 'Best offers' },
                        {
                            type: 'grid',
                            columns: 2,
                            items: [
                                {
                                    type: 'deal_card',
                                    title: 'Test Deal',
                                    image_url: 'https://example.com/img.jpg',
                                    price: 29.99,
                                    original_price: 49.99,
                                    badge_text: '40% OFF',
                                    deeplink: 'app://deals/1'
                                }
                            ]
                        },
                        { type: 'action_button', label: 'View All', deeplink: 'app://deals' }
                    ]
                }
            }
        };

        const validEventWithCarousel = {
            event_id: '33333333-3333-3333-3333-333333333333',
            product_id: 'deals_app',
            platform: 'ios',
            audience_type: 'user',
            audience_id: 'u2',
            widget_key: 'flex_carousel',
            schema_version: 2,
            data_version: 1,
            min_ios_version: 16,
            content: {
                schema_version: 2,
                data_version: 1,
                root: {
                    type: 'widget_container',
                    title: 'Carousel Test',
                    items: [
                        { type: 'section_header', title: 'Your Picks' },
                        {
                            type: 'horizontal_carousel',
                            items: [
                                {
                                    type: 'deal_card',
                                    title: 'Carousel Deal',
                                    image_url: 'https://example.com/img2.jpg',
                                    price: 19.99,
                                    deeplink: 'app://deals/2'
                                }
                            ]
                        }
                    ]
                }
            }
        };

        beforeEach(async () => {
            await pool.query('DELETE FROM widgets WHERE widget_key IN ($1, $2)', ['flex_grid', 'flex_carousel']);
            const keys = await redisClient.keys('widget:deals_app:*');
            if (keys.length) await redisClient.del(keys);
        });

        it('accepts and processes grid layout with deal_cards', async () => {
            await processMessage('2000-0', { event: JSON.stringify(validEventWithGrid) });

            const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['flex_grid']);
            expect(res.rows).toHaveLength(1);
            expect(res.rows[0].content.root.items[1].type).toBe('grid');
            expect(res.rows[0].content.root.items[1].columns).toBe(2);
            expect(res.rows[0].content.root.items[1].items[0].type).toBe('deal_card');
        });

        it('accepts and processes horizontal_carousel with deal_cards', async () => {
            await processMessage('2001-0', { event: JSON.stringify(validEventWithCarousel) });

            const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['flex_carousel']);
            expect(res.rows).toHaveLength(1);
            expect(res.rows[0].content.root.items[1].type).toBe('horizontal_carousel');
            expect(res.rows[0].content.root.items[1].items[0].type).toBe('deal_card');
        });

        it('accepts section_header component', async () => {
            await processMessage('2002-0', { event: JSON.stringify(validEventWithGrid) });

            const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['flex_grid']);
            expect(res.rows[0].content.root.items[0].type).toBe('section_header');
            expect(res.rows[0].content.root.items[0].subtitle).toBe('Best offers');
        });

        it('stores and retrieves padding from widget_container', async () => {
            await processMessage('2003-0', { event: JSON.stringify(validEventWithGrid) });

            const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['flex_grid']);
            expect(res.rows[0].content.root.padding).toEqual({ top: 16, right: 16, bottom: 16, left: 16 });
        });
    });

    describe('Validation Rejection (Core Safety)', () => {
        let consoleSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        });

        afterEach(() => {
            consoleSpy.mockRestore();
        });

        it('rejects event with unknown component type', async () => {
            const invalidEvent = {
                event_id: '44444444-4444-4444-4444-444444444444',
                product_id: 'deals_app',
                platform: 'web',
                audience_type: 'default',
                audience_id: 'global',
                widget_key: 'rejected_unknown',
                schema_version: 2,
                data_version: 1,
                content: {
                    schema_version: 2,
                    data_version: 1,
                    root: {
                        type: 'widget_container',
                        title: 'Invalid',
                        items: [
                            { type: 'mystery_component', foo: 'bar' }
                        ]
                    }
                }
            };

            await processMessage('3000-0', { event: JSON.stringify(invalidEvent) });

            // Should NOT be in DB
            const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['rejected_unknown']);
            expect(res.rows).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('rejects event with padding outside bounds (>24)', async () => {
            const invalidEvent = {
                event_id: '55555555-5555-5555-5555-555555555555',
                product_id: 'deals_app',
                platform: 'web',
                audience_type: 'default',
                audience_id: 'global',
                widget_key: 'rejected_padding',
                schema_version: 2,
                data_version: 1,
                content: {
                    schema_version: 2,
                    data_version: 1,
                    root: {
                        type: 'widget_container',
                        title: 'Bad Padding',
                        padding: { top: 100 },
                        items: []
                    }
                }
            };

            await processMessage('3001-0', { event: JSON.stringify(invalidEvent) });

            const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['rejected_padding']);
            expect(res.rows).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('rejects event with grid columns > 3', async () => {
            const invalidEvent = {
                event_id: '66666666-6666-6666-6666-666666666666',
                product_id: 'deals_app',
                platform: 'web',
                audience_type: 'default',
                audience_id: 'global',
                widget_key: 'rejected_columns',
                schema_version: 2,
                data_version: 1,
                content: {
                    schema_version: 2,
                    data_version: 1,
                    root: {
                        type: 'widget_container',
                        title: 'Bad Columns',
                        items: [
                            { type: 'grid', columns: 5, items: [] }
                        ]
                    }
                }
            };

            await processMessage('3002-0', { event: JSON.stringify(invalidEvent) });

            const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['rejected_columns']);
            expect(res.rows).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('rejects event with too many items in widget_container (>20)', async () => {
            const items = [];
            for (let i = 0; i < 21; i++) {
                items.push({ type: 'text_row', text: `Item ${i}` });
            }

            const invalidEvent = {
                event_id: '77777777-7777-7777-7777-777777777777',
                product_id: 'deals_app',
                platform: 'web',
                audience_type: 'default',
                audience_id: 'global',
                widget_key: 'rejected_items',
                schema_version: 2,
                data_version: 1,
                content: {
                    schema_version: 2,
                    data_version: 1,
                    root: {
                        type: 'widget_container',
                        title: 'Too Many Items',
                        items
                    }
                }
            };

            await processMessage('3003-0', { event: JSON.stringify(invalidEvent) });

            const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['rejected_items']);
            expect(res.rows).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalled();
        });
        it('rejects event with tariff_tile data_gb < 1', async () => {
            const invalidEvent = {
                event_id: '88888888-8888-8888-8888-888888888888',
                product_id: 'deals_app',
                platform: 'web',
                audience_type: 'default',
                audience_id: 'global',
                widget_key: 'rejected_tariff',
                schema_version: 2,
                data_version: 1,
                content: {
                    schema_version: 2,
                    data_version: 1,
                    root: {
                        type: 'widget_container',
                        title: 'Bad Tariff',
                        items: [
                            {
                                type: 'tariff_tile',
                                data_gb: 0, // Should be >= 1
                                price_per_month: 10,
                                compare_count: 5,
                                deeplink: 'app://t'
                            }
                        ]
                    }
                }
            };

            await processMessage('3004-0', { event: JSON.stringify(invalidEvent) });

            const res = await pool.query('SELECT * FROM widgets WHERE widget_key = $1', ['rejected_tariff']);
            expect(res.rows).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalled();
        });
    });
});
