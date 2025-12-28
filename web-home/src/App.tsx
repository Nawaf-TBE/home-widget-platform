import { useState, useEffect, useCallback } from 'react';
import { SDRenderer } from './components/SDRenderer';
import { HomeFeedSkeleton } from './components/Skeletons';
import { WidgetData } from './types';
import './index.css';

const PRODUCT_API = 'http://localhost:3001/v1';
const CORE_API = 'http://localhost:3003/v1';

interface WidgetWithMeta extends WidgetData {
    data_version: number;
    served_from: 'redis' | 'db';
    served_at: string;
    widget_updated_at?: string;
    audience_type: string;
    audience_id: string;
}

// Custom hook for managing widget state
const useWidgets = (jwt: string | null) => {
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

function App() {
    const [userId, setUserId] = useState('');
    const [jwt, setJwt] = useState<string | null>(localStorage.getItem('jwt'));
    const [actionStatus, setActionStatus] = useState<string | null>(null);

    // Auth Login
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const { widgets, loading, error, fetchWidgets } = useWidgets(jwt);

    const handleLogin = async () => {
        if (!userId) return;
        setAuthLoading(true);
        setAuthError(null);
        try {
            const res = await fetch(`${PRODUCT_API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error('Login failed');
            const data = await res.json();
            setJwt(data.token);
            localStorage.setItem('jwt', data.token);
        } catch (err: unknown) {
            setAuthError(err instanceof Error ? err.message : 'Error');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSaveFirstDeal = async () => {
        if (!jwt) return;
        setActionStatus('Saving first deal...');
        try {
            const dealsRes = await fetch(`${PRODUCT_API}/deals`);
            if (!dealsRes.ok) throw new Error('Failed to fetch deals');
            const deals = await dealsRes.json();
            if (deals.length === 0) throw new Error('No deals available');

            const dealId = deals[0].id; // Just pick first one
            const saveRes = await fetch(`${PRODUCT_API}/deals/${dealId}/save`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!saveRes.ok) throw new Error('Failed to save deal');

            setActionStatus(`Saved deal: ${deals[0].title}`);
            setTimeout(() => fetchWidgets(true), 1000); // refresh
        } catch (err: unknown) {
            setActionStatus(err instanceof Error ? `Error: ${err.message}` : 'Error');
        }
    };

    const handleUnsaveLastSaved = async () => {
        if (!jwt) return;
        setActionStatus('Unsaving last saved...');
        try {
            const savedRes = await fetch(`${PRODUCT_API}/me/saved`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!savedRes.ok) throw new Error('Failed to fetch saved deals');
            const saved = await savedRes.json();
            if (saved.length === 0) throw new Error('No saved deals');

            const dealId = saved[saved.length - 1].id;
            const unsaveRes = await fetch(`${PRODUCT_API}/deals/${dealId}/unsave`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!unsaveRes.ok) throw new Error('Failed to unsave deal');

            setActionStatus(`Unsaved deal: ${saved[saved.length - 1].title}`);
            setTimeout(() => fetchWidgets(true), 1000);
        } catch (err: unknown) {
            setActionStatus(err instanceof Error ? `Error: ${err.message}` : 'Error');
        }
    };

    useEffect(() => {
        if (jwt) {
            fetchWidgets();
        }
    }, [jwt, fetchWidgets]);

    const handleLogout = () => {
        setJwt(null);
        localStorage.removeItem('jwt');
        setUserId('');
    };

    return (
        <div className="app">
            {!jwt ? (
                <div className="auth-section">
                    <div className="auth-header">
                        <h1>Home Widget Platform</h1>
                    </div>
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Enter User ID (e.g. user-1)"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        />
                        <button onClick={handleLogin} disabled={authLoading}>
                            {authLoading ? 'Logging in...' : 'Login'}
                        </button>
                    </div>
                    {authError && <div className="error">{authError}</div>}
                </div>
            ) : (
                <div className="home-section">
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2>Home</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: '#666' }}>User: {userId}</span>
                            <button onClick={handleLogout} style={{ background: 'transparent', color: 'var(--text-dim)', padding: '0.5rem' }}>Logout</button>
                        </div>
                    </header>

                    {error && <div className="error">{error}</div>}
                    {actionStatus && <div className="action-status">{actionStatus}</div>}

                    {loading ? (
                        <HomeFeedSkeleton />
                    ) : (
                        <div className="feed-container">
                            {widgets.map((w, idx) => (
                                <div key={idx} className="widget-wrapper">
                                    <div className="debug-badge">
                                        v{w.data_version} • {w.served_from} • {w.audience_type}:{w.audience_id}
                                    </div>
                                    <SDRenderer widgets={[w.content.root]} />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="action-buttons">
                        <button onClick={handleSaveFirstDeal} className="action-btn save-btn">
                            Save Deal
                        </button>
                        <button onClick={handleUnsaveLastSaved} className="action-btn unsave-btn">
                            Unsave
                        </button>
                        <button onClick={() => fetchWidgets(true)} className="action-btn refresh-btn">
                            Refresh
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
