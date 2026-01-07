import React from 'react';

interface AuthSectionProps {
    userId: string;
    setUserId: (id: string) => void;
    onLogin: () => void;
    loading: boolean;
    error: string | null;
}

export const AuthSection: React.FC<AuthSectionProps> = ({
    userId,
    setUserId,
    onLogin,
    loading,
    error,
}) => (
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
            <button onClick={onLogin} disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </div>
        {error && <div className="error">{error}</div>}
    </div>
);
