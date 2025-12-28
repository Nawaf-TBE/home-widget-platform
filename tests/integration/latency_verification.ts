/**
 * Freshness Demo Script
 * Measures time-to-freshness: Product Save -> Core Widget update
 * 
 * Run: pnpm -w demo:freshness
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
    content: {
        data_version: number;
        root: unknown;
    };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           FRESHNESS DEMO - Time-to-Update Proof            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // 1. Publish default (idempotent)
        console.log('1️⃣  Publishing default widget...');
        const publishRes = await fetch(`${PRODUCT_API}/v1/admin/publish-default`, { method: 'POST' });
        if (!publishRes.ok) {
            throw new Error(`Failed to publish default: ${publishRes.status}`);
        }
        console.log('   ✓ Default widget published');
        await sleep(2000); // Wait for pipeline

        // 2. Login user 123
        console.log('');
        console.log('2️⃣  Logging in user 123...');
        const loginRes = await fetch(`${PRODUCT_API}/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: USER_ID })
        });
        if (!loginRes.ok) {
            throw new Error(`Failed to login: ${loginRes.status}`);
        }
        const { token } = await loginRes.json() as { token: string };
        console.log(`   ✓ JWT obtained: ${token.substring(0, 20)}...`);

        // 3. Fetch baseline widget
        console.log('');
        console.log('3️⃣  Fetching baseline widget...');
        const baselineRes = await fetch(`${CORE_API}/v1/home/widgets?platform=web`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!baselineRes.ok) {
            throw new Error(`Failed to fetch baseline: ${baselineRes.status}`);
        }
        const baselineWidgets = await baselineRes.json() as WidgetResponse[];
        const baselineWidget = baselineWidgets[0];
        const baselineVersion = baselineWidget?.data_version || 0;
        const baselineAudienceType = baselineWidget?.audience_type || 'none';
        console.log(`   Baseline: audience_type=${baselineAudienceType} data_version=${baselineVersion} served_from=${baselineWidget?.served_from || 'none'}`);

        // 4. Get a real deal to save
        console.log('');
        console.log('4️⃣  Fetching deals list...');
        const dealsRes = await fetch(`${PRODUCT_API}/v1/deals`);
        if (!dealsRes.ok) {
            throw new Error(`Failed to fetch deals: ${dealsRes.status}`);
        }
        const deals = await dealsRes.json() as Array<{ id: string; title: string }>;
        if (deals.length === 0) {
            throw new Error('No deals available');
        }
        const targetDeal = deals[0];
        console.log(`   ✓ Selected deal: ${targetDeal.title} (${targetDeal.id})`);

        // 5. Trigger Save
        console.log('');
        console.log('5️⃣  Triggering Save...');
        const T0 = Date.now();
        const saveRes = await fetch(`${PRODUCT_API}/v1/deals/${targetDeal.id}/save`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!saveRes.ok) {
            throw new Error(`Failed to save deal: ${saveRes.status}`);
        }
        console.log(`   ✓ Save triggered at T0=${new Date(T0).toISOString()}`);

        // 6. Poll for update
        console.log('');
        console.log('6️⃣  Polling Core for update...');
        let pollCount = 0;
        let newVersion = baselineVersion;
        let servedFrom: string = 'unknown';
        let foundPersonalized = false;
        const startPoll = Date.now();

        while (Date.now() - startPoll < MAX_POLL_TIME_MS) {
            pollCount++;
            const pollRes = await fetch(`${CORE_API}/v1/home/widgets?platform=web`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (pollRes.ok) {
                const widgets = await pollRes.json() as WidgetResponse[];
                const widget = widgets[0];

                if (widget) {
                    // Check for personalized widget (user-specific)
                    if (widget.audience_type === 'user' && widget.audience_id === USER_ID) {
                        foundPersonalized = true;
                        newVersion = widget.data_version;
                        servedFrom = widget.served_from;

                        // Success condition: we got a personalized widget
                        const T1 = Date.now();
                        const deltaMs = T1 - T0;

                        console.log(`   ✓ Found personalized widget after ${pollCount} polls`);
                        console.log('');
                        console.log('═'.repeat(60));
                        console.log('');
                        console.log('📊 FRESHNESS RESULTS:');
                        console.log('');
                        console.log(`   baseline_version:      ${baselineVersion} (${baselineAudienceType})`);
                        console.log(`   new_version:           ${newVersion} (user:${USER_ID})`);
                        console.log(`   time_to_freshness_ms:  ${deltaMs}`);
                        console.log(`   served_from:           ${servedFrom}`);
                        console.log(`   poll_count:            ${pollCount}`);
                        console.log('');
                        console.log('═'.repeat(60));
                        console.log('');
                        console.log('✅ FRESHNESS DEMO COMPLETE - Widget updated in real-time!');

                        // Optional: Unsave to reset
                        console.log('');
                        console.log('7️⃣  Cleanup: Unsaving deal...');
                        await fetch(`${PRODUCT_API}/v1/deals/${targetDeal.id}/unsave`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        console.log('   ✓ Deal unsaved');

                        return;
                    }
                }
            }

            await sleep(POLL_INTERVAL_MS);
            process.stdout.write(`   Polling... (${pollCount} tries, ${Date.now() - startPoll}ms elapsed)\r`);
        }

        // Timeout - print diagnostics
        console.log('');
        console.log('❌ TIMEOUT: Did not detect personalized widget within 15 seconds');
        console.log('');
        console.log('Diagnostics:');
        console.log(`  - foundPersonalized: ${foundPersonalized}`);
        console.log(`  - Last version seen: ${newVersion}`);
        console.log(`  - Last servedFrom: ${servedFrom}`);
        console.log('');
        console.log('Check container logs:');
        console.log('  docker compose logs product-deals-outbox-worker --tail 50');
        console.log('  docker compose logs core-ingester --tail 50');
        console.log('  docker compose logs core-api --tail 50');

        process.exit(1);

    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error);
        process.exit(1);
    }
}

main();
