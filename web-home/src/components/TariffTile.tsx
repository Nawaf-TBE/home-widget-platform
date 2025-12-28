import React from 'react';
import './TariffTile.css';

interface Padding {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}

interface TariffTileProps {
    data_gb: number;
    price_per_month: number;
    compare_count: number;
    badge_text?: string;
    deeplink: string;
    padding?: Padding;
}

export const TariffTile: React.FC<TariffTileProps> = ({
    data_gb,
    price_per_month,
    compare_count,
    badge_text,
    deeplink,
    padding
}) => {
    const style: React.CSSProperties = {
        paddingTop: padding?.top ? `${padding.top}px` : undefined,
        paddingRight: padding?.right ? `${padding.right}px` : undefined,
        paddingBottom: padding?.bottom ? `${padding.bottom}px` : undefined,
        paddingLeft: padding?.left ? `${padding.left}px` : undefined,
    };

    const handleClick = () => {
        console.log(`Navigating to: ${deeplink}`);
        // In a real app, use router or window.location
    };

    return (
        <div className="tariff-tile" style={style} onClick={handleClick}>
            <div className="tariff-content">
                <div className="tariff-left">
                    <div className="data-circle">
                        <span className="data-value">{data_gb}</span>
                        <span className="data-unit">GB</span>
                    </div>
                </div>
                <div className="tariff-center">
                    <div className="tariff-title">Allnet Flat</div>
                    <div className="tariff-subtitle">{compare_count} offers compared</div>
                    {badge_text && <span className="tariff-badge">{badge_text}</span>}
                </div>
                <div className="tariff-right">
                    <div className="price-box">
                        <span className="currency">€</span>
                        <span className="price">{price_per_month.toFixed(2)}</span>
                    </div>
                    <span className="period">per month</span>
                </div>
            </div>
            <div className="tariff-arrow">›</div>
        </div>
    );
};
