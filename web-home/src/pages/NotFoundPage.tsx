import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
    const navigate = useNavigate();
    return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <button
                onClick={() => navigate('/')}
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', background: 'var(--primary)', border: 'none', color: '#fff', borderRadius: '4px' }}
            >
                Back to Home
            </button>
        </div>
    );
};
