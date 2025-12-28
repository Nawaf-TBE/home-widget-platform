/**
 * High-Traffic Protection Demo
 * Proves Core serves widgets even when Product is down
 * 
 * Run: pnpm -w demo:load:product-down
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PRODUCT_API = 'http://localhost:3001';
const CORE_API = 'http://localhost:3003';
const USER_ID = '123';
const LOAD_DURATION_SECONDS = 10;
const CONNECTIONS = 50;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     HIGH-TRAFFIC PROTECTION - Core Serves Without Product  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    let jwt = '';

    try {
        // 1. Login BEFORE stopping product
        console.log('1️⃣  Logging in user 123 (before stopping product)...');
        const loginRes = await fetch(`${PRODUCT_API}/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: USER_ID })
        });
        if (!loginRes.ok) {
            throw new Error(`Failed to login: ${loginRes.status}`);
        }
        const { token } = await loginRes.json() as { token: string };
        jwt = token;
        console.log(`   ✓ JWT obtained: ${token.substring(0, 20)}...`);

        // 2. Ensure Core has a widget
        console.log('');
        console.log('2️⃣  Verifying Core has a widget for user...');
        const verifyRes = await fetch(`${CORE_API}/v1/home/widgets?platform=web`, {
            headers: { 'Authorization': `Bearer ${jwt}` }
        });
        if (!verifyRes.ok) {
            throw new Error(`Failed to verify widgets: ${verifyRes.status}`);
        }
        const widgets = await verifyRes.json() as Array<{ widget_key: string; data_version: number }>;
        if (widgets.length === 0) {
            console.log('   ⚠ No widgets found. Publishing default...');
            await fetch(`${PRODUCT_API}/v1/admin/publish-default`, { method: 'POST' });
            await sleep(3000);
        } else {
            console.log(`   ✓ Found ${widgets.length} widget(s): ${widgets.map(w => w.widget_key).join(', ')}`);
        }

        // 3. Stop Product container
        console.log('');
        console.log('3️⃣  Stopping product-deals-api container...');
        await execAsync('docker compose stop product-deals-api');
        console.log('   ✓ product-deals-api stopped');

        // Verify product is down
        try {
            await fetch(`${PRODUCT_API}/health`, { signal: AbortSignal.timeout(2000) });
            throw new Error('Product should be down but responded!');
        } catch (err) {
            if (err instanceof Error && err.message.includes('should be down')) {
                throw err;
            }
            console.log('   ✓ Confirmed product is unreachable');
        }

        // 4. Run load test against Core
        console.log('');
        console.log(`4️⃣  Running load test: ${CONNECTIONS} connections for ${LOAD_DURATION_SECONDS}s...`);
        console.log('');

        const loadResults = await runLoadTest(jwt);

        // 5. Print results
        console.log('');
        console.log('═'.repeat(60));
        console.log('');
        console.log('📊 LOAD TEST RESULTS (Product DOWN):');
        console.log('');
        console.log(`   Total Requests:   ${loadResults.totalRequests}`);
        console.log(`   Success (2xx):    ${loadResults.success} (${((loadResults.success / loadResults.totalRequests) * 100).toFixed(1)}%)`);
        console.log(`   Errors:           ${loadResults.errors}`);
        console.log(`   p50 Latency:      ${loadResults.p50}ms`);
        console.log(`   p95 Latency:      ${loadResults.p95}ms`);
        console.log(`   Avg Latency:      ${loadResults.avg.toFixed(1)}ms`);
        console.log(`   Widgets Returned: ${loadResults.widgetsReturned ? 'Yes' : 'No'}`);
        console.log('');
        console.log('═'.repeat(60));

        // Assert success
        const successRate = loadResults.success / loadResults.totalRequests;
        if (successRate >= 0.99 && loadResults.widgetsReturned) {
            console.log('');
            console.log('✅ HIGH-TRAFFIC PROTECTION VERIFIED!');
            console.log('   Core served widgets at 99%+ success rate with Product completely down.');
        } else {
            console.log('');
            console.log('❌ FAILED: Success rate below 99% or widgets not returned');
            process.exitCode = 1;
        }

    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error);
        process.exitCode = 1;
    } finally {
        // 6. Restart Product
        console.log('');
        console.log('6️⃣  Restarting product-deals-api...');
        await execAsync('docker compose start product-deals-api');
        console.log('   ✓ product-deals-api restarted');
    }
}

interface LoadResults {
    totalRequests: number;
    success: number;
    errors: number;
    p50: number;
    p95: number;
    avg: number;
    widgetsReturned: boolean;
}

async function runLoadTest(jwt: string): Promise<LoadResults> {
    const latencies: number[] = [];
    let success = 0;
    let errors = 0;
    let widgetsReturned = false;
    const startTime = Date.now();
    const endTime = startTime + LOAD_DURATION_SECONDS * 1000;

    // Simple concurrent request runner
    const runRequest = async (): Promise<void> => {
        while (Date.now() < endTime) {
            const reqStart = Date.now();
            try {
                const res = await fetch(`${CORE_API}/v1/home/widgets?platform=web`, {
                    headers: { 'Authorization': `Bearer ${jwt}` }
                });

                const latency = Date.now() - reqStart;
                latencies.push(latency);

                if (res.ok) {
                    success++;
                    const widgets = await res.json() as Array<{ widget_key: string }>;
                    if (widgets.length > 0) {
                        widgetsReturned = true;
                    }
                } else {
                    errors++;
                }
            } catch {
                errors++;
            }
        }
    };

    // Run concurrent workers
    const workers = Array.from({ length: CONNECTIONS }, () => runRequest());
    await Promise.all(workers);

    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

    return {
        totalRequests: success + errors,
        success,
        errors,
        p50,
        p95,
        avg,
        widgetsReturned
    };
}

main();
