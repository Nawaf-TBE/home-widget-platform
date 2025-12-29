export const parseDeeplink = (deeplink: string): string | null => {
    try {
        const url = new URL(deeplink);
        if (url.protocol !== 'app:') return null;

        // Map app:// paths to web routes
        if (url.hostname === 'tariff') {
            // For now, redirect specific tariff clicks to the main tariffs list
            return '/tariffs';
        }

        switch (url.hostname + url.pathname) {
            case 'me/saved':
                return '/saved';
            case 'tariffs':
                return '/tariffs';
            case 'deals':
            case 'category': // Handle category clicks by staying on home (or filtering eventually)
                return '/';
            default:
                // If it's a category/deals/etc that fell through:
                if (url.hostname === 'category' || url.hostname === 'deals') {
                    return '/';
                }
                console.warn(`[Navigation] Unsupported deeplink: ${deeplink}`);
                return null;
        }
    } catch (e) {
        console.error('[Navigation] Invalid deeplink format', e);
        return null;
    }
};
