import { useState, useCallback } from 'react';
import { CORE_API_URL } from '../config';
import { WidgetWithMeta } from '../types';

const CORE_API = CORE_API_URL;

export const useWidgets = (jwt: string | null) => {
    const [widgets, setWidgets] = useState<WidgetWithMeta[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWidgets = useCallback(async (isRefresh = false) => {
        if (!jwt) return;
        // Only show full loading state on first load, not refresh
        if (!isRefresh && widgets.length === 0) setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${CORE_API}/home/widgets?platform=web`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!res.ok) throw new Error('Failed to fetch widgets');
            const data = await res.json();

            // Sort widgets deterministically
            const sorted = data.sort((a: WidgetWithMeta, b: WidgetWithMeta) => {
                // user widgets first
                if (a.audience_type === 'user' && b.audience_type !== 'user') return -1;
                if (a.audience_type !== 'user' && b.audience_type === 'user') return 1;
                // then by update time
                return (b.widget_updated_at || '').localeCompare(a.widget_updated_at || '');
            });

            setWidgets(sorted);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    }, [jwt, widgets.length]);

    return { widgets, loading, error, fetchWidgets };
};
