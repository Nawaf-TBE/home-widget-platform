import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
    host: process.env.CORE_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.CORE_DB_PORT || process.env.DB_PORT || '5434'),
    database: process.env.CORE_DB_NAME || process.env.DB_NAME || 'core',
    user: process.env.CORE_DB_USER || process.env.DB_USER || 'user',
    password: process.env.CORE_DB_PASSWORD || process.env.DB_PASSWORD || 'password',
};

export const pool = new Pool(poolConfig);

export interface WidgetKey {
    product_id: string;
    platform: string;
    audience_type: string;
    audience_id: string;
    widget_key: string;
}

export interface Widget extends WidgetKey {
    content: Record<string, unknown>;
    schema_version: number;
    data_version: number;
    created_at?: Date;
    updated_at?: Date;
}

export const upsertWidget = async (widget: Widget): Promise<void> => {
    const query = `
        INSERT INTO widgets (
            product_id, platform, audience_type, audience_id, widget_key,
            content, schema_version, data_version, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, NOW(), NOW()
        )
        ON CONFLICT (product_id, platform, audience_type, audience_id, widget_key)
        DO UPDATE SET
            content = EXCLUDED.content,
            schema_version = EXCLUDED.schema_version,
            data_version = EXCLUDED.data_version,
            updated_at = NOW()
        WHERE widgets.data_version < EXCLUDED.data_version
    `;

    const values = [
        widget.product_id,
        widget.platform,
        widget.audience_type,
        widget.audience_id,
        widget.widget_key,
        widget.content,
        widget.schema_version,
        widget.data_version
    ];

    await pool.query(query, values);
};

export const getWidget = async (key: WidgetKey): Promise<Widget | null> => {
    const query = `
        SELECT * FROM widgets
        WHERE product_id = $1 AND platform = $2 AND audience_type = $3 AND audience_id = $4 AND widget_key = $5
    `;
    const values = [key.product_id, key.platform, key.audience_type, key.audience_id, key.widget_key];
    const res = await pool.query(query, values);
    return res.rows[0] || null;
};

/**
 * Fetches all widgets for given product(s), platform and user.
 * Prioritizes user-specific widgets over default widgets for each (product, key) pair.
 */
export const getHomeWidgets = async (productIds: string | string[], platform: string, userId: string): Promise<Widget[]> => {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const query = `
        SELECT DISTINCT ON (product_id, platform, widget_key) *
        FROM widgets
        WHERE product_id = ANY($1) 
          AND platform = $2 
          AND (
            (audience_type = 'user' AND audience_id = $3)
            OR 
            (audience_type = 'default' AND audience_id = 'global')
          )
        ORDER BY product_id, 
                 platform,
                 widget_key, 
                 CASE audience_type WHEN 'user' THEN 1 WHEN 'default' THEN 2 ELSE 3 END ASC,
                 updated_at DESC,
                 data_version DESC
    `;
    const values = [ids, platform, userId];
    const res = await pool.query(query, values);
    return res.rows;
};
