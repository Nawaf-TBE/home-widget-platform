import { startIngester } from './ingester';

startIngester().catch(err => {
    console.error('Failed to start ingester:', err);
    process.exit(1);
});
