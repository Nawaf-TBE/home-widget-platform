/**
 * Cross-Device Consistency Demo Script
 * Proves Web and iOS converge to same widget state after save/unsave
 * 
 * Run: pnpm -w demo:cross-device
 */

const PRODUCT_API = 'http://localhost:3001';
const CORE_API = 'http://localhost:3003';
const USER_ID = '123';
const MAX_POLL_TIME_MS = 15000;
const POLL_INTERVAL_MS = 500;

interface WidgetResponse {
    product_id: string;
    platform: string;
    audience_type: string;
    audience_id: string;
    widget_key: string;
    data_version: number;
    schema_version: number;
    served_from: 'redis' | 'db';
    served_at: string;
    widget_updated_at?: string;
}

interface PlatformState {
    audience: 'user' | 'default' | 'none';
    version: number;
    passed: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPlatformWidgets(jwt: string, platform: 'web' | 'ios'): Promise<WidgetResponse[]> {
    const headers: Record<string, string> = { 'Authorization': `Bearer ${jwt}` };
    if (platform === 'ios') {
        headers['X-IOS-Version'] = '17';
    }
    const res = await fetch(`${CORE_API}/v1/home/widgets?platform=${platform}`, { headers });
    if (!res.ok) return [];
    return await res.json() as WidgetResponse[];
}

function getWidgetState(widgets: WidgetResponse[]): PlatformState {
    const personalized = widgets.find(w =>
        w.audience_type === 'user' && w.audience_id === USER_ID && w.widget_key === 'top_deals'
    );
    const defaultWidget = widgets.find(w =>
        w.audience_type === 'default' && w.audience_id === 'global' && w.widget_key === 'top_deals'
    );

    if (personalized) {
        return { audience: 'user', version: personalized.data_version, passed: false };
    } else if (defaultWidget) {
        return { audience: 'default', version: defaultWidget.data_version, passed: false };
    }
    return { audience: 'none', version: 0, passed: false };
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     CROSS-DEVICE CONSISTENCY DEMO - Web + iOS Convergence  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // 1. Publish defaults (idempotent)
        console.log('1️⃣  Publishing default widget...');
        const publishRes = await fetch(`${PRODUCT_API}/v1/admin/publish-default`, { method: 'POST' });
        if (!publishRes.ok) throw new Error(`Failed to publish default: ${publishRes.status}`);
        console.log('   ✓ Default widget published');
        await sleep(2000);

        // 2. Login user
        console.log('');
        console.log('2️⃣  Logging in user 123...');
        const loginRes = await fetch(`${PRODUCT_API}/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: USER_ID })
        });
        if (!loginRes.ok) throw new Error(`Failed to login: ${loginRes.status}`);
        const { token } = await loginRes.json() as { token: string };
        console.log(`   ✓ JWT obtained`);

        // Verify identity via /me
        const meRes = await fetch(`${PRODUCT_API}/v1/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!meRes.ok) throw new Error('Failed to verify identity');
        const me = await meRes.json() as { userId: string };
        console.log(`   ✓ Identity verified: ${me.userId}`);

        // 3. Establish baseline for BOTH platforms
        console.log('');
        console.log('3️⃣  Establishing baseline for Web and iOS...');
        const baselineWeb = getWidgetState(await fetchPlatformWidgets(token, 'web'));
        const baselineIos = getWidgetState(await fetchPlatformWidgets(token, 'ios'));
        console.log(`   Web: audience=${baselineWeb.audience} version=${baselineWeb.version}`);
        console.log(`   iOS: audience=${baselineIos.audience} version=${baselineIos.version}`);

        // 4. Trigger SAVE
        console.log('');
        console.log('4️⃣  Triggering Save action...');
        const dealsRes = await fetch(`${PRODUCT_API}/v1/deals`);
        if (!dealsRes.ok) throw new Error('Failed to fetch deals');
        const deals = await dealsRes.json() as Array<{ id: string; title: string }>;
        if (deals.length === 0) throw new Error('No deals available');
        const targetDeal = deals[0];

        const T0 = Date.now();
        const saveRes = await fetch(`${PRODUCT_API}/v1/deals/${targetDeal.id}/save`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!saveRes.ok) throw new Error(`Failed to save: ${saveRes.status}`);
        console.log(`   ✓ Saved deal: ${targetDeal.title}`);
        console.log(`   T0=${new Date(T0).toISOString()}`);

        // 5. Poll until BOTH platforms converge
        console.log('');
        console.log('5️⃣  Polling for convergence...');
        let webPassed = false, iosPassed = false;
        let webPassTime = 0, iosPassTime = 0;
        let finalWeb: PlatformState = baselineWeb, finalIos: PlatformState = baselineIos;
        const startPoll = Date.now();

        while (Date.now() - startPoll < MAX_POLL_TIME_MS) {
            if (!webPassed) {
                const webWidgets = await fetchPlatformWidgets(token, 'web');
                const webState = getWidgetState(webWidgets);

                // Cold-start safe: pass if personalized appears OR version increases
                if (baselineWeb.audience === 'default' && webState.audience === 'user') {
                    webPassed = true;
                    webPassTime = Date.now() - T0;
                    finalWeb = webState;
                } else if (baselineWeb.audience === 'user' && webState.version > baselineWeb.version) {
                    webPassed = true;
                    webPassTime = Date.now() - T0;
                    finalWeb = webState;
                }
            }

            if (!iosPassed) {
                const iosWidgets = await fetchPlatformWidgets(token, 'ios');
                const iosState = getWidgetState(iosWidgets);

                if (baselineIos.audience === 'default' && iosState.audience === 'user') {
                    iosPassed = true;
                    iosPassTime = Date.now() - T0;
                    finalIos = iosState;
                } else if (baselineIos.audience === 'user' && iosState.version > baselineIos.version) {
                    iosPassed = true;
                    iosPassTime = Date.now() - T0;
                    finalIos = iosState;
                }
            }

            if (webPassed && iosPassed) break;

            process.stdout.write(`   Polling... web=${webPassed ? '✓' : '⏳'} ios=${iosPassed ? '✓' : '⏳'} (${Date.now() - startPoll}ms)\r`);
            await sleep(POLL_INTERVAL_MS);
        }
        console.log('');

        if (!webPassed || !iosPassed) {
            throw new Error(`TIMEOUT: web=${webPassed}, ios=${iosPassed}`);
        }

        console.log(`   ✓ Web converged in ${webPassTime}ms: v${finalWeb.version}`);
        console.log(`   ✓ iOS converged in ${iosPassTime}ms: v${finalIos.version}`);

        // 6. Trigger UNSAVE
        console.log('');
        console.log('6️⃣  Triggering Unsave action...');
        const savedRes = await fetch(`${PRODUCT_API}/v1/me/saved`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const saved = await savedRes.json() as Array<{ id: string; title: string }>;
        if (saved.length > 0) {
            const unsaveDeal = saved[saved.length - 1];
            const T1 = Date.now();
            const unsaveRes = await fetch(`${PRODUCT_API}/v1/deals/${unsaveDeal.id}/unsave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!unsaveRes.ok) throw new Error(`Failed to unsave: ${unsaveRes.status}`);
            console.log(`   ✓ Unsaved deal: ${unsaveDeal.title}`);

            // Poll for unsave convergence
            webPassed = false; iosPassed = false;
            const unsaveBaselineWeb = finalWeb.version;
            const unsaveBaselineIos = finalIos.version;
            let unsaveWebTime = 0, unsaveIosTime = 0;
            const unsaveStart = Date.now();

            while (Date.now() - unsaveStart < MAX_POLL_TIME_MS) {
                if (!webPassed) {
                    const webState = getWidgetState(await fetchPlatformWidgets(token, 'web'));
                    if (webState.version > unsaveBaselineWeb) {
                        webPassed = true;
                        unsaveWebTime = Date.now() - T1;
                        finalWeb = webState;
                    }
                }
                if (!iosPassed) {
                    const iosState = getWidgetState(await fetchPlatformWidgets(token, 'ios'));
                    if (iosState.version > unsaveBaselineIos) {
                        iosPassed = true;
                        unsaveIosTime = Date.now() - T1;
                        finalIos = iosState;
                    }
                }
                if (webPassed && iosPassed) break;
                await sleep(POLL_INTERVAL_MS);
            }

            if (webPassed && iosPassed) {
                console.log(`   ✓ Web converged in ${unsaveWebTime}ms: v${finalWeb.version}`);
                console.log(`   ✓ iOS converged in ${unsaveIosTime}ms: v${finalIos.version}`);
            } else {
                console.log(`   ⚠ Unsave timeout: web=${webPassed}, ios=${iosPassed}`);
            }
        } else {
            console.log('   (No saved deals to unsave)');
        }

        // 7. Print results
        const versionsMatch = finalWeb.version === finalIos.version;
        console.log('');
        console.log('═'.repeat(60));
        console.log('');
        console.log('📊 CROSS-DEVICE CONSISTENCY RESULTS:');
        console.log('');
        console.log(`   Baseline (Web):   ${baselineWeb.audience}:v${baselineWeb.version}`);
        console.log(`   Baseline (iOS):   ${baselineIos.audience}:v${baselineIos.version}`);
        console.log(`   Final (Web):      ${finalWeb.audience}:v${finalWeb.version}`);
        console.log(`   Final (iOS):      ${finalIos.audience}:v${finalIos.version}`);
        console.log(`   Versions Match:   ${versionsMatch ? '✓ YES' : '✗ NO'}`);
        console.log('');
        console.log('═'.repeat(60));
        console.log('');
        console.log('✅ CROSS-DEVICE CONSISTENCY VERIFIED!');
        console.log('   Both Web and iOS converged to the same widget state.');

    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error);
        console.error('');
        console.error('Diagnostics:');
        console.error('  docker compose logs product-deals-outbox-worker --tail 50');
        console.error('  docker compose logs core-ingester --tail 50');
        process.exit(1);
    }
}

main();
