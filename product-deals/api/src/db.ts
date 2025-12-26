import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = {
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5435'),
    database: process.env.DB_NAME || 'product',
};

export const pool = new Pool(poolConfig);

export const query = (text: string, params?: any[]) => pool.query(text, params);
