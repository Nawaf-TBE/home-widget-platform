import { useState } from 'react';
import { PRODUCT_BASE_URL } from '../config';

const PRODUCT_API = PRODUCT_BASE_URL;

export const useAuth = () => {
    // Initialize from localStorage
    const [jwt, setJwt] = useState<string | null>(localStorage.getItem('jwt'));
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (id: string) => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${PRODUCT_API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id }),
            });
            if (!res.ok) throw new Error('Login failed');
            const data = await res.json();
            setJwt(data.token);
            localStorage.setItem('jwt', data.token);
            setUserId(id);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setJwt(null);
        localStorage.removeItem('jwt');
        setUserId('');
    };

    return {
        jwt,
        userId,
        setUserId,
        loading,
        error,
        login,
        logout,
    };
};
