import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5434'),
    database: process.env.DB_NAME || 'core',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
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
