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
    app.listen(port, () => {
        console.log(`Product Deals API listening on port ${port}`);
    });
}

export { app };
