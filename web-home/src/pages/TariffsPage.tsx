import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TariffTile } from '../components/TariffTile';
import { PRODUCT_BASE_URL } from '../config';

interface TariffDeal {
    id: string;
    data_gb: number;
    price_per_month: number;
    compare_count: number;
    badge_text?: string;
}

export const TariffsPage = () => {
    const [tariffs, setTariffs] = useState<TariffDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTariffs = async () => {
            try {
                const res = await fetch(`${PRODUCT_BASE_URL}/tariffs`);
                if (!res.ok) throw new Error('Failed to fetch tariffs');
                const data = await res.json();
                setTariffs(data);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error');
            } finally {
                setLoading(false);
            }
        };

        fetchTariffs();
    }, []);

    return (
        <div style={{ padding: '1rem' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>←</button>
                <h2>All Tariffs</h2>
            </header>

            {loading && <div className="loading">Loading...</div>}
            {error && <div className="error">{error}</div>}

            <div className="sdui-list-container">
                {tariffs.map(t => (
                    <TariffTile
                        key={t.id}
                        data_gb={t.data_gb}
                        price_per_month={t.price_per_month}
                        compare_count={t.compare_count}
                        badge_text={t.badge_text}
                        deeplink={`/tariffs`}
                    // Reuse the tile component, no action needed on the detail page itself for now
                    />
                ))}
            </div>
        </div>
    );
};
