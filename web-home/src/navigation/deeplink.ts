export type Destination = 'saved' | 'tariffs' | 'unknown';

export function parseDeeplink(url: string): Destination {
    if (!url) return 'unknown';

    let path = url.trim();

    // Normalize URL
    try {
        if (path.includes('://')) {
            path = new URL(path).pathname;
        }
    } catch {
        // failed to parse as URL, treat as string path
    }

    // Normalize path
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }
    path = path.toLowerCase();

    if (path === '/saved') return 'saved';
    if (path === '/tariffs') return 'tariffs';

    // Explicit known unsupported paths (to avoid "Unknown" error log noise if intentional)
    if (path === '/deals' || path === '/categories' || path.startsWith('/deals/') || path.startsWith('/category/')) {
        return 'unknown';
    }

    return 'unknown';
}
