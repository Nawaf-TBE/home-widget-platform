import { createClient } from 'redis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6380');

export const redisClient = createClient({
    url: `redis://${redisHost}:${redisPort}`
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};
