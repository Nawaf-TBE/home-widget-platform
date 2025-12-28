import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = {
    user: process.env.PRODUCT_DB_USER || process.env.DB_USER || 'user',
    password: process.env.PRODUCT_DB_PASSWORD || process.env.DB_PASSWORD || 'password',
    host: process.env.PRODUCT_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PRODUCT_DB_PORT || process.env.DB_PORT || '5435'),
    database: process.env.PRODUCT_DB_NAME || process.env.DB_NAME || 'product',
};

export const pool = new Pool(poolConfig);

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
