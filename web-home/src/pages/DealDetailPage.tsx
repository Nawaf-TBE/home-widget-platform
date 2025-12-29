import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PRODUCT_BASE_URL } from '../config';

interface DealDetail {
    id: string;
    title: string;
    description?: string;
    price?: number;
    original_price?: number;
    currency?: string;
    image_url?: string;
}

export const DealDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [deal, setDeal] = useState<DealDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDeal = async () => {
            try {
                // We're using the list endpoint with a limit/filter hack or just getting all because get-one might not be implemented
                // But let's assume valid REST practices or reuse list logic for now given constraints
                // Actually, let's implement get-one behavior or filter the full list if get-one is missing. 
                // Product API has `GET /deals` returning all. 
                // Let's rely on `GET /deals` and find by ID for robustness without changing API yet again if possible, 
                // otherwise we assume GET /deals is enough.
                // Wait, previous tasks didn't add GET /deals/:id. Let's just fetch all and find, or implement GET /deals/:id if easy.
                // Product API routes.ts doesn't show GET /deals/:id. 
                // Let's implement GET /deals/:id in Product API first? NO, "Hard rules: minimal changes".
                // I'll fetch `GET /deals` and filter. It's inefficient but fine for this scope.

                const res = await fetch(`${PRODUCT_BASE_URL}/deals`);
                if (!res.ok) throw new Error('Failed to load deals');
                const allDeals = await res.json();
                const found = allDeals.find((d: any) => d.id === id);

                if (!found) throw new Error('Deal not found');
                setDeal(found);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error loading deal');
            } finally {
                setLoading(false);
            }
        };
        fetchDeal();
    }, [id]);

    if (loading) return <div style={{ padding: '2rem', color: '#fff', background: '#050505', minHeight: '100vh' }}>Loading...</div>;
    if (error || !deal) return <div style={{ padding: '2rem', color: '#fff', background: '#050505', minHeight: '100vh' }}>Error: {error}</div>;

    return (
        <div style={{ padding: '1rem', color: '#fff', background: '#050505', minHeight: '100vh' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>←</button>
                <h2 style={{ marginLeft: '1rem' }}>Deal Details</h2>
            </header>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {deal.image_url ? (
                    <img src={deal.image_url} alt={deal.title} style={{ width: '100%', borderRadius: '12px', marginBottom: '1rem' }} />
                ) : (
                    <div style={{ width: '100%', height: '300px', background: '#333', borderRadius: '12px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📷</div>
                )}

                <h1>{deal.title}</h1>
                <div style={{ fontSize: '1.5rem', margin: '1rem 0', color: '#4caf50' }}>
                    {deal.currency === 'USD' ? '$' : '€'}{deal.price?.toFixed(2)}
                </div>
            </div>
        </div>
    );
};
