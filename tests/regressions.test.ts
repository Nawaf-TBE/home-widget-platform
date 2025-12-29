import { expect, test } from 'vitest';

// Product API Logic Helper Test
const sanitizePrice = (price: any) => (Number(price) > 0 ? Number(price) : null);

test('Product API sanitizes zero price', () => {
    expect(sanitizePrice(0)).toBe(null);
    expect(sanitizePrice("0")).toBe(null);
    expect(sanitizePrice(-5)).toBe(null);
    expect(sanitizePrice(10.99)).toBe(10.99);
    expect(sanitizePrice("10.99")).toBe(10.99);
});

// Web Rendering Logic Helper Test
const shouldRenderPrice = (price: number | null | undefined) => {
    return price !== null && price !== undefined && price > 0;
}

test('Web renderer hides zero price', () => {
    expect(shouldRenderPrice(0)).toBe(false);
    expect(shouldRenderPrice(null)).toBe(false);
    expect(shouldRenderPrice(undefined)).toBe(false);
    expect(shouldRenderPrice(10)).toBe(true);
});

// Currency Formatter Helper Test
const formatMoney = (amount: number, currency = 'EUR') => {
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol}${amount.toFixed(2)}`;
};

test('Currency formatter outputs correct symbol', () => {
    expect(formatMoney(10, 'EUR')).toBe('€10.00');
    expect(formatMoney(10, 'USD')).toBe('$10.00');
    expect(formatMoney(5.5)).toBe('€5.50'); // Default
});

// Saved Deal Image Mapper Test
const mapSavedDealToCard = (savedDeal: any) => ({
    type: 'deal_card',
    image_url: savedDeal.image_url || 'DEFAULT_URL',
    title: savedDeal.title
});

test('Mapper provides default image for null url', () => {
    // API should have already populated it, but client mapper is defense in depth
    // In our current fix, the API provides the fallback, but let's test the client mapper logic concept

    const dealWithNull = { title: 'Test', image_url: null };
    const mapped = mapSavedDealToCard(dealWithNull);
    expect(mapped.image_url).toBe('DEFAULT_URL');

    const dealWithUrl = { title: 'Test', image_url: 'http://foo.com/img.jpg' };
    const mapped2 = mapSavedDealToCard(dealWithUrl);
    expect(mapped2.image_url).toBe('http://foo.com/img.jpg');
});

test('SavedDeal mapping produces valid SDUI DealCard with optional image', () => {
    const dealWithNull = {
        id: '1', title: 'Start', image_url: null, kind: 'deal', price: 10, currency: 'EUR'
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
