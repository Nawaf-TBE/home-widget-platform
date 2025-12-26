import { execSync } from 'child_process';
import { Client } from 'pg';
import { createClient } from 'redis';
import axios from 'axios';

export const CORE_API = 'http://127.0.0.1:3003/v1';
export const PRODUCT_API = 'http://127.0.0.1:3001/v1';
export const CORE_DB_URL = 'postgres://user:password@127.0.0.1:5434/core';
export const PRODUCT_DB_URL = 'postgres://user:password@127.0.0.1:5435/product';
export const REDIS_URL = 'redis://127.0.0.1:6380';

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const runCommand = (cmd: string) => {
    try {
        return execSync(cmd, { stdio: 'pipe' }).toString();
    } catch (err: any) {
        return err.stderr?.toString() || err.message;
    }
};

export const getContainerStatus = (serviceName: string) => {
    // We try to find the container by service label in the current project
    const cmd = `docker ps -a --filter "label=com.docker.compose.service=${serviceName}" --filter "label=com.docker.compose.project=home-widget-platform" --format "{{.Status}}"`;
    const output = runCommand(cmd).toLowerCase();
    if (output.includes('up')) return 'running';
    if (output.includes('exited')) return 'exited';
    if (output.includes('created')) return 'created';
    return output || 'unknown';
};

export const stopContainer = (name: string) => {
    console.log(`Stopping container: ${name}`);
    runCommand(`docker compose stop ${name}`);
};

export const startContainer = (name: string) => {
    console.log(`Starting container: ${name}`);
    runCommand(`docker compose start ${name}`);
};

export const getCoreDB = async () => {
    const client = new Client({ connectionString: CORE_DB_URL });
    await client.connect();
    return client;
};

export const getProductDB = async () => {
    const client = new Client({ connectionString: PRODUCT_DB_URL });
    await client.connect();
    return client;
};

export const getRedis = async () => {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    return client;
};

export const getJWT = async (userId: string = 'user-demo') => {
    const res = await axios.post(`${PRODUCT_API}/auth/login`, { userId });
    return res.data.token;
};
