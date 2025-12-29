import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
                    <h1>Something went wrong.</h1>
                    <p style={{ color: '#ff4b4b' }}>{this.state.error?.message}</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
                    >
                        Back to Home
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
