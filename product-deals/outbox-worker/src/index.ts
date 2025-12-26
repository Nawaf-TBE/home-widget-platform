import { startWorker } from './worker';

console.log("Product Deals Outbox Worker Starting...");
startWorker().catch(console.error);
