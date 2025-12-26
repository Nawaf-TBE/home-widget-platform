import { useState, useEffect } from 'react';
import { SDRenderer } from './components/SDRenderer';
import { WidgetData } from './types';
import './index.css';

const PRODUCT_API = 'http://localhost:3001/v1';
const CORE_API = 'http://localhost:3003/v1';

function App() {
    const [userId, setUserId] = useState('');
    const [jwt, setJwt] = useState<string | null>(localStorage.getItem('jwt'));
    const [widgets, setWidgets] = useState<WidgetData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchWidgets = async () => {
        if (!jwt) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${CORE_API}/home/widgets?platform=web`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!res.ok) throw new Error('Failed to fetch widgets');
            const data = await res.json();
            setWidgets(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (jwt) {
            fetchWidgets();
        }
    }, [jwt]);

    const handleLogout = () => {
        setJwt(null);
        localStorage.removeItem('jwt');
        setWidgets([]);
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
                        <button onClick={handleLogin}>Login</button>
                    </div>
                </div>
            ) : (
                <div className="home-section">
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2>Home</h2>
                        <button onClick={handleLogout} style={{ background: 'transparent', color: 'var(--text-dim)', padding: '0.5rem' }}>Logout</button>
                    </header>

                    {error && <div className="error">{error}</div>}

                    {loading && <div className="loading">Fetching your experience...</div>}

                    {!loading && (
                        <SDRenderer widgets={widgets.map(w => w.content.root)} />
                    )}

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button onClick={fetchWidgets} style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                            Refresh Widgets
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
