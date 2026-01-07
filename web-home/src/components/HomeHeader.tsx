import React from 'react';

interface HomeHeaderProps {
    userId: string;
    onLogout: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ userId, onLogout }) => (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Home</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>User: {userId}</span>
            <button onClick={onLogout} style={{ background: 'transparent', color: 'var(--text-dim)', padding: '0.5rem' }}>Logout</button>
        </div>
    </header>
);
