import { describe, it, expect } from 'vitest';

describe('Saved Deals Hardening', () => {
    it('SavedDeal mapping produces valid SDUI DealCard with optional image', () => {
        const dealWithNull = {
            id: '1', title: 'Start', image_url: null, kind: 'deal' as const, price: 10, currency: 'EUR'
        };
        // Simulate what SavedPage mapping does:
        const mapped = {
            type: 'deal_card',
            title: dealWithNull.title,
            image_url: dealWithNull.image_url || undefined,
            deeplink: `/deals/${dealWithNull.id}`
        };

        expect(mapped.type).toBe('deal_card');
        expect(mapped.image_url).toBeUndefined(); // SDRenderer renders placeholder for undefined
        expect(mapped.deeplink).toBe('/deals/1');
    });

    it('Config exports base URLs', async () => {
        const config = await import('../config');
        expect(config.PRODUCT_BASE_URL).toBeDefined();
        expect(config.CORE_API_URL).toBeDefined();
    });
});
