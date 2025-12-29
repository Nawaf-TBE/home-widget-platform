import React from 'react';
import {
    WidgetContainer, TextRow, ActionButton, SectionHeader,
    DealCard, HorizontalCarousel, Grid, SDUIComponent, Padding,
    TariffTile as TariffTileType, ListComponent
} from '../types';
import { TariffTile } from './TariffTile';

interface SDComponentProps {
    component: SDUIComponent;
    onAction?: (action: string) => void;
}

const toPaddingStyle = (padding?: Padding): React.CSSProperties => {
    if (!padding) return {};
    return {
        paddingTop: padding.top ? `${padding.top}px` : undefined,
        paddingRight: padding.right ? `${padding.right}px` : undefined,
        paddingBottom: padding.bottom ? `${padding.bottom}px` : undefined,
        paddingLeft: padding.left ? `${padding.left}px` : undefined,
    };
};

const SDTextRow: React.FC<{ component: TextRow }> = ({ component }) => (
    <p className="sdui-text-row" style={toPaddingStyle(component.padding)}>{component.text}</p>
);

const SDActionButton: React.FC<{ component: ActionButton; onAction?: (action: string) => void }> = ({ component, onAction }) => {
    const handleClick = () => {
        const { deeplink } = component;
        console.log("[SDUI] action_button clicked", { label: component.label, deeplink });
        if (onAction) onAction(deeplink);
        if (deeplink.startsWith('http')) {
            window.open(deeplink, '_blank');
        }
    };

    return (
        <button
            className="sdui-action-button"
            onClick={handleClick}
            style={toPaddingStyle(component.padding)}
        >
            {component.label}
        </button>
    );
};

const SDSectionHeader: React.FC<{ component: SectionHeader }> = ({ component }) => (
    <div className="sdui-section-header" style={toPaddingStyle(component.padding)}>
        {component.icon && <span className="sdui-section-icon">{component.icon}</span>}
        <div className="sdui-section-text">
            <h3 className="sdui-section-title">{component.title}</h3>
            {component.subtitle && <p className="sdui-section-subtitle">{component.subtitle}</p>}
        </div>
    </div>
);

const SDDealCard: React.FC<{ component: DealCard; onAction?: (action: string) => void }> = ({ component, onAction }) => {
    const handleClick = () => {
        console.log('[SDRenderer] DealCard clicked:', component.deeplink);
        if (onAction) {
            onAction(component.deeplink);
        } else {
            console.warn('[SDRenderer] No onAction handler provided');
        }
        console.log(`[DEEPLINK] ${component.deeplink}`);
    };

    return (
        <div className="sdui-deal-card" onClick={handleClick} style={toPaddingStyle(component.padding)}>
            <div className="sdui-deal-image-container">
                {component.image_url ? (
                    <img
                        src={component.image_url}
                        alt={component.title}
                        className="sdui-deal-image"
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.classList.add('image-error');
                        }}
                    />
                ) : (
                    <div className="sdui-image-placeholder">
                        <span style={{ fontSize: '2rem', color: '#444' }}>📷</span>
                    </div>
                )}
                {component.badge_text && (
                    <span className="sdui-deal-badge">{component.badge_text}</span>
                )}
            </div>
            <div className="sdui-deal-info">
                {component.category && <p className="sdui-deal-category">{component.category}</p>}
                <h4 className="sdui-deal-title">{component.title}</h4>
                <div className="sdui-deal-prices">
                    {component.price !== undefined && component.price > 0 && (
                        <span className="sdui-deal-price">
                            {component.currency === 'USD' ? '$' : '€'}
                            {component.price.toFixed(2)}
                        </span>
                    )}
                    {component.original_price && (
                        <span className="sdui-deal-original-price">${component.original_price.toFixed(2)}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const SDTariffTile: React.FC<{ component: TariffTileType; onAction?: (action: string) => void }> = ({ component, onAction }) => (
    <TariffTile
        data_gb={component.data_gb}
        price_per_month={component.price_per_month}
        compare_count={component.compare_count}
        badge_text={component.badge_text}
        deeplink={component.deeplink}
        padding={component.padding}
        onAction={onAction}
    />
);

const SDList: React.FC<{ component: ListComponent; onAction?: (action: string) => void }> = ({ component, onAction }) => (
    <div className="sdui-list-container" style={toPaddingStyle(component.padding)}>
        {component.items.map((item, idx) => (
            /* Currently defaulting to TariffTile as it's the only list item supported */
            <SDTariffTile key={idx} component={item} onAction={onAction} />
        ))}
    </div>
);

const SDHorizontalCarousel: React.FC<{ component: HorizontalCarousel; onAction?: (action: string) => void }> = ({ component, onAction }) => (
    <div className="sdui-carousel" style={toPaddingStyle(component.padding)}>
        <div className="sdui-carousel-track">
            {component.items.map((item, idx) => (
                <SDDealCard key={idx} component={item} onAction={onAction} />
            ))}
        </div>
    </div>
);

const SDGrid: React.FC<{ component: Grid; onAction?: (action: string) => void }> = ({ component, onAction }) => (
    <div
        className="sdui-grid"
        style={{
            ...toPaddingStyle(component.padding),
            gridTemplateColumns: `repeat(${component.columns}, 1fr)`
        }}
    >
        {component.items.map((item, idx) => (
            <SDDealCard key={idx} component={item} onAction={onAction} />
        ))}
    </div>
);

const SDWidgetContainer: React.FC<{ component: WidgetContainer; onAction?: (action: string) => void }> = ({ component, onAction }) => (
    <div className="sdui-widget-container" style={toPaddingStyle(component.padding)}>
        {component.title && <h2 className="sdui-widget-title">{component.title}</h2>}
        <div className="sdui-widget-items">
            {component.items.map((item, idx) => (
                <SDRenderComponent key={idx} component={item} onAction={onAction} />
            ))}
        </div>
    </div>
);

const SDRenderComponent: React.FC<SDComponentProps> = ({ component, onAction }) => {
    switch (component.type) {
        case 'widget_container':
            return <SDWidgetContainer component={component as WidgetContainer} onAction={onAction} />;
        case 'text_row':
            return <SDTextRow component={component as TextRow} />;
        case 'action_button':
            return <SDActionButton component={component as ActionButton} onAction={onAction} />;
        case 'section_header':
            return <SDSectionHeader component={component as SectionHeader} />;
        case 'deal_card':
            return <SDDealCard component={component as DealCard} onAction={onAction} />;
        case 'horizontal_carousel':
            return <SDHorizontalCarousel component={component as HorizontalCarousel} onAction={onAction} />;
        case 'grid':
            return <SDGrid component={component as Grid} onAction={onAction} />;
        case 'tariff_tile':
            return <SDTariffTile component={component as TariffTileType} onAction={onAction} />;
        case 'list':
            return <SDList component={component as ListComponent} onAction={onAction} />;
        default:
            console.warn(`Unknown SDUI component type: ${component.type}`);
            return null;
    }
};

export const SDRenderer: React.FC<{ widgets: WidgetContainer[]; onAction?: (action: string) => void }> = ({ widgets, onAction }) => {
    if (widgets.length === 0) {
        return <div className="no-widgets">No widgets</div>;
    }

    return (
        <div className="sdui-list">
            {widgets.map((w, idx) => (
                <SDRenderComponent key={idx} component={w} onAction={onAction} />
            ))}
        </div>
    );
};
