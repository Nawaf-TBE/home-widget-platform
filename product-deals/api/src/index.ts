import express from 'express';
import routes from './routes';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/v1', routes);

if (process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT || 3002;

    // Simple way to run migrations in this demo
    const runMigrations = () => {
        let retries = 5;
        while (retries > 0) {
            try {
                console.log('Running migrations...');
                const dbUrl = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
                const { execSync } = require('child_process');
                execSync('pnpm migrate up', {
                    env: { ...process.env, DATABASE_URL: dbUrl },
                    stdio: 'inherit'
                });
                console.log('Migrations completed successfully');
                break;
            } catch (err) {
                retries--;
                console.error(`Migration failed (retries left: ${retries}):`, err);
                if (retries === 0) throw err;
                // Wait 2 seconds before retry using a busy wait for simplicity in this script
                const start = Date.now();
                while (Date.now() - start < 2000) { }
            }
        }
    };
    runMigrations();

    app.listen(port, () => {
        console.log(`Product Deals API listening on port ${port}`);
    });
}

export { app };
