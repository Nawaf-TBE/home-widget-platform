import express, { Response } from 'express';
import cors from 'cors';
import { authenticateJWT, AuthRequest } from './auth';
import { pool, getWidget, WidgetKey, Widget } from './db';
import { redisClient, connectRedis } from './redis';

export const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 3000;

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use((req, _res, next) => {
    console.log(`[CORE-API-DEBUG] ${req.method} ${req.url}`);
    next();
});


const v1Router = express.Router();

const WIDGET_TTL = parseInt(process.env.REDIS_WIDGET_TTL_SECONDS || '3600');

/**
 * Endpoint: POST /v1/widgets/delivery
 * Request: { keys: WidgetKey[] }
 */
v1Router.post('/widgets/delivery', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        const { keys } = req.body as { keys: WidgetKey[] };
        if (!keys || !Array.isArray(keys)) {
            return res.status(400).json({ error: 'Invalid keys' });
        }

        const userId = req.user?.id;
        const results: Widget[] = [];
        const cacheMisses: WidgetKey[] = [];

        // 1. Try Cache
        await connectRedis();
        const cacheKeys = keys.map(k => `widget:${k.product_id}:${k.platform}:${k.audience_type}:${k.audience_id}:${k.widget_key}`);
        const cachedValues = await redisClient.mGet(cacheKeys);

        cachedValues.forEach((val, index) => {
            if (val) {
                const widget = JSON.parse(val) as Widget;
                // Simple Gating Check
                if (widget.audience_type === 'user' && widget.audience_id !== userId) {
                    // Skip
                } else {
                    results.push(widget);
                }
            } else {
                cacheMisses.push(keys[index]);
            }
        });

        // 2. Fallback to DB
        if (cacheMisses.length > 0) {
            const dbPromises = cacheMisses.map(async (key) => {
                const widget = await getWidget(key);
                if (widget) {
                    // Gating check
                    if (widget.audience_type === 'user' && widget.audience_id !== userId) {
                        return null;
                    }

                    // Update Cache
                    const cacheKey = `widget:${widget.product_id}:${widget.platform}:${widget.audience_type}:${widget.audience_id}:${widget.widget_key}`;
                    await redisClient.setEx(cacheKey, WIDGET_TTL, JSON.stringify(widget));
                    return widget;
                }
                return null;
            });

            const dbResults = await Promise.all(dbPromises);
            dbResults.forEach(w => {
                if (w) results.push(w);
            });
        }

        res.json({ widgets: results });
    } catch (err) {
        console.error('Delivery API Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Endpoint: GET /v1/home/widgets
 * Query: platform
 */
v1Router.get('/home/widgets', authenticateJWT, async (req: AuthRequest, res: Response) => {
    const startTime = Date.now();
    try {
        const platform = (req.query.platform as string) || 'web';
        const userId = req.user?.id;

        if (!userId) return res.sendStatus(401);

        // Define which widgets to show on Home
        const homeWidgets = [
            { product_id: 'deals_app', widget_key: 'top_deals' }
        ];

        interface WidgetWithMeta extends Widget {
            served_from: 'redis' | 'db';
            served_at: string;
            widget_updated_at?: string;
        }

        const results: WidgetWithMeta[] = [];
        let servedFrom: 'redis' | 'db' = 'db';
        let fallbackUsed = false;

        await connectRedis();

        for (const w of homeWidgets) {
            // First try user-specific widget from cache
            const userCacheKey = `widget:${w.product_id}:${platform}:user:${userId}:${w.widget_key}`;
            const cachedUser = await redisClient.get(userCacheKey);

            if (cachedUser) {
                const widget = JSON.parse(cachedUser) as Widget;
                results.push({
                    ...widget,
                    served_from: 'redis',
                    served_at: new Date().toISOString(),
                    widget_updated_at: widget.updated_at ? new Date(widget.updated_at).toISOString() : undefined
                });
                servedFrom = 'redis';
                continue;
            }

            // Try DB for user widget
            const userWidget = await getWidget({
                product_id: w.product_id,
                platform,
                audience_type: 'user',
                audience_id: userId,
                widget_key: w.widget_key
            });

            if (userWidget) {
                results.push({
                    ...userWidget,
                    served_from: 'db',
                    served_at: new Date().toISOString(),
                    widget_updated_at: userWidget.updated_at ? userWidget.updated_at.toISOString() : undefined
                });
                servedFrom = 'db';
                continue;
            }

            // Try fallback from cache
            fallbackUsed = true;
            const defaultCacheKey = `widget:${w.product_id}:${platform}:default:global:${w.widget_key}`;
            const cachedDefault = await redisClient.get(defaultCacheKey);

            if (cachedDefault) {
                const widget = JSON.parse(cachedDefault) as Widget;
                results.push({
                    ...widget,
                    served_from: 'redis',
                    served_at: new Date().toISOString(),
                    widget_updated_at: widget.updated_at ? new Date(widget.updated_at).toISOString() : undefined
                });
                servedFrom = 'redis';
                continue;
            }

            // Final fallback: DB default
            const fallback = await getWidget({
                product_id: w.product_id,
                platform,
                audience_type: 'default',
                audience_id: 'global',
                widget_key: w.widget_key
            });
            if (fallback) {
                results.push({
                    ...fallback,
                    served_from: 'db',
                    served_at: new Date().toISOString(),
                    widget_updated_at: fallback.updated_at ? fallback.updated_at.toISOString() : undefined
                });
                servedFrom = 'db';
            }
        }

        const latencyMs = Date.now() - startTime;
        console.log(`[CoreAPI] widgets_request user=${userId} platform=${platform} served_from=${servedFrom} widgets_count=${results.length} latency_ms=${latencyMs} fallback_used=${fallbackUsed}`);

        res.json(results);
    } catch (err) {
        const latencyMs = Date.now() - startTime;
        console.error(`[CoreAPI] widgets_request_error latency_ms=${latencyMs}`, err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

v1Router.post('/internal/widgets', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.sendStatus(403);
        }
        const widget = req.body as Widget;
        const { upsertWidget } = await import('./db');
        await upsertWidget(widget);

        // Invalidate cache
        const cacheKey = `widget:${widget.product_id}:${widget.platform}:${widget.audience_type}:${widget.audience_id}:${widget.widget_key}`;
        await connectRedis();
        await redisClient.del(cacheKey);

        res.status(201).json({ status: 'success' });
    } catch {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.use('/v1', v1Router);

const server = app.listen(port, () => {
    console.log(`Core API listening at http://localhost:${port}`);
});

export { server };

process.on('SIGTERM', async () => {
    if (pool) await pool.end();
    if (redisClient) await redisClient.quit();
    if (server) server.close();
});
