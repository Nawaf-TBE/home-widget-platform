import React from 'react';

interface ActionButtonsProps {
    onSaveDeal: () => void;
    onUnsaveDeal: () => void;
    onRefresh: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    onSaveDeal,
    onUnsaveDeal,
    onRefresh,
}) => (
    <div className="action-buttons">
        <button onClick={onSaveDeal} className="action-btn save-btn">
            Save Deal
        </button>
        <button onClick={onUnsaveDeal} className="action-btn unsave-btn">
            Unsave
        </button>
        <button onClick={onRefresh} className="action-btn refresh-btn">
            Refresh
        </button>
    </div>
);
