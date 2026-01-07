import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SDRenderer } from '../components/SDRenderer';
import { HomeFeedSkeleton } from '../components/Skeletons';
import { dispatchDeeplink } from '../navigation/dispatch';
import { PRODUCT_BASE_URL } from '../config';
import '../index.css';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useWidgets } from '../hooks/useWidgets';

// Components
import { AuthSection } from '../components/AuthSection';
import { HomeHeader } from '../components/HomeHeader';
import { ActionButtons } from '../components/ActionButtons';

const PRODUCT_API = PRODUCT_BASE_URL;

export function HomePage() {
    const navigate = useNavigate();
    const [actionStatus, setActionStatus] = useState<string | null>(null);

    // Custom Hooks
    const { jwt, userId, setUserId, loading: authLoading, error: authError, login, logout } = useAuth();
    const { widgets, loading: widgetsLoading, error: widgetsError, fetchWidgets } = useWidgets(jwt);

    const handleSaveFirstDeal = async () => {
        if (!jwt) return;
        setActionStatus('Saving first deal...');
        try {
            // Fetch one valid DEAL (not category/tariff)
            const dealsRes = await fetch(`${PRODUCT_API}/deals?kind=deal&limit=1`);
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

    const handleSDUIAction = (deeplink: string) => {
        dispatchDeeplink(deeplink, navigate, (msg: string) => {
            setActionStatus(msg);
            setTimeout(() => setActionStatus(null), 3000);
        });
    };

    // Trigger fetch when jwt changes (handled by hook mostly, but if we need manual trigger on mount if jwt key exists)
    useEffect(() => {
        if (jwt) {
            fetchWidgets();
        }
    }, [jwt, fetchWidgets]);

    return (
        <div className="app">
            {!jwt ? (
                <AuthSection
                    userId={userId}
                    setUserId={setUserId}
                    onLogin={() => login(userId)}
                    loading={authLoading}
                    error={authError}
                />
            ) : (
                <div className="home-section">
                    <HomeHeader userId={userId} onLogout={logout} />

                    {widgetsError && <div className="error">{widgetsError}</div>}
                    {actionStatus && <div className="action-status">{actionStatus}</div>}

                    {widgetsLoading ? (
                        <HomeFeedSkeleton />
                    ) : (
                        <div className="feed-container">
                            {widgets.map((w) => {
                                const uniqueKey = `${w.product_id}:${w.widget_key}:${w.audience_type}:${w.audience_id}`;
                                return (
                                    <div key={uniqueKey} className="widget-wrapper">
                                        <div className="debug-badge">
                                            v{w.data_version} • {w.served_from} • {w.audience_type}:{w.audience_id}
                                        </div>
                                        <SDRenderer
                                            widgets={[w.content.root]}
                                            onAction={handleSDUIAction}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <ActionButtons
                        onSaveDeal={handleSaveFirstDeal}
                        onUnsaveDeal={handleUnsaveLastSaved}
                        onRefresh={() => fetchWidgets(true)}
                    />
                </div>
            )}
        </div>
    );
}
