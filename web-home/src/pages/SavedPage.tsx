import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SDRenderer } from '../components/SDRenderer';
import { WidgetContainer } from '../types';
import { dispatchDeeplink } from '../navigation/dispatch';

interface SavedDeal {
    id: string;
    title: string;
    price?: number;
    original_price?: number;
    image_url?: string | null;  // Optional/Nullable
    kind: 'deal' | 'category_tile' | 'tariff';
    currency?: string;
    badge_text?: string;
}

import { PRODUCT_BASE_URL } from '../config';

export const SavedPage = () => {
    const [deals, setDeals] = useState<SavedDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionStatus, setActionStatus] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const jwt = localStorage.getItem('jwt');
        if (!jwt) {
            navigate('/');
            return;
        }

        const fetchSaved = async () => {
            try {
                const res = await fetch(`${PRODUCT_BASE_URL}/me/saved`, {
                    headers: { Authorization: `Bearer ${jwt}` },
                });
                if (!res.ok) throw new Error('Failed to fetch saved deals');
                const data = await res.json();

                // Client-side filter: only allow deals and tariffs
                const validDeals = data.filter((d: SavedDeal) => ['deal', 'tariff'].includes(d.kind));

                setDeals(validDeals);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error');
            } finally {
                setLoading(false);
            }
        };

        fetchSaved();
    }, [navigate]);

    const handleSDUIAction = (deeplink: string) => {
        dispatchDeeplink(deeplink, navigate, (msg: string) => {
            setActionStatus(msg);
            setTimeout(() => setActionStatus(null), 3000);
        });
    };

    // Transform logic: SavedDeals -> SDUI Grid
    const gridWidget: WidgetContainer = {
        type: 'widget_container',
        title: 'Your Saved Deals',
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        items: [
            {
                type: 'grid',
                columns: 2, // Matches Home widget
                items: deals.map(deal => ({
                    type: 'deal_card',
                    title: deal.title,
                    image_url: deal.image_url || '', // Handle null - fixed to match types
                    price: deal.price,
                    original_price: deal.original_price,
                    currency: deal.currency,
                    badge_text: deal.badge_text,
                    deeplink: `/deals/${deal.id}`
                }))
            }
        ]
    };

    return (
        <div className="saved-page" style={{ paddingBottom: '2rem', background: '#050505', minHeight: '100vh' }}>
            <header style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem', borderBottom: '1px solid #222' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>←</button>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Your Saved Deals</h2>
            </header>

            {!localStorage.getItem('jwt') && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Please log in to view saved deals.</p>
                </div>
            )}

            {actionStatus && (
                <div className="action-status" style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999 }}>{actionStatus}</div>
            )}

            {loading && <div className="loading" style={{ color: '#fff', textAlign: 'center', marginTop: '2rem' }}>Loading saved deals...</div>}

            {error && (
                <div className="error" style={{ color: '#ff4b4b', textAlign: 'center', marginTop: '2rem' }}>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>Retry</button>
                </div>
            )}

            {!loading && !error && deals.length === 0 && (
                <div style={{ textAlign: 'center', color: '#888', marginTop: '3rem' }}>
                    <p>No saved deals yet.</p>
                    <button onClick={() => navigate('/')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Browse Deals
                    </button>
                </div>
            )}

            {!loading && !error && deals.length > 0 && (
                <SDRenderer
                    widgets={[gridWidget]}
                    onAction={handleSDUIAction}
                />
            )}
        </div>
    );
};
