import React from 'react';
import {
    WidgetContainer, TextRow, ActionButton, SectionHeader,
    DealCard, HorizontalCarousel, Grid, SDUIComponent, Padding
} from '../types';

interface SDComponentProps {
    component: SDUIComponent;
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

const SDActionButton: React.FC<{ component: ActionButton }> = ({ component }) => {
    const handleClick = () => {
        const { deeplink } = component;
        if (deeplink.startsWith('http')) {
            window.open(deeplink, '_blank');
        } else {
            console.log(`[DEEPLINK] ${deeplink}`);
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

const SDDealCard: React.FC<{ component: DealCard }> = ({ component }) => {
    const handleClick = () => {
        console.log(`[DEEPLINK] ${component.deeplink}`);
    };

    return (
        <div className="sdui-deal-card" onClick={handleClick} style={toPaddingStyle(component.padding)}>
            <div className="sdui-deal-image-container">
                <img
                    src={component.image_url}
                    alt={component.title}
                    className="sdui-deal-image"
                    loading="lazy"
                />
                {component.badge_text && (
                    <span className="sdui-deal-badge">{component.badge_text}</span>
                )}
            </div>
            <div className="sdui-deal-info">
                {component.category && <p className="sdui-deal-category">{component.category}</p>}
                <h4 className="sdui-deal-title">{component.title}</h4>
                <div className="sdui-deal-prices">
                    <span className="sdui-deal-price">${component.price.toFixed(2)}</span>
                    {component.original_price && (
                        <span className="sdui-deal-original-price">${component.original_price.toFixed(2)}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const SDHorizontalCarousel: React.FC<{ component: HorizontalCarousel }> = ({ component }) => (
    <div className="sdui-carousel" style={toPaddingStyle(component.padding)}>
        <div className="sdui-carousel-track">
            {component.items.map((item, idx) => (
                <SDDealCard key={idx} component={item} />
            ))}
        </div>
    </div>
);

const SDGrid: React.FC<{ component: Grid }> = ({ component }) => (
    <div
        className="sdui-grid"
        style={{
            ...toPaddingStyle(component.padding),
            gridTemplateColumns: `repeat(${component.columns}, 1fr)`
        }}
    >
        {component.items.map((item, idx) => (
            <SDDealCard key={idx} component={item} />
        ))}
    </div>
);

const SDWidgetContainer: React.FC<{ component: WidgetContainer }> = ({ component }) => (
    <div className="sdui-widget-container" style={toPaddingStyle(component.padding)}>
        {component.title && <h2 className="sdui-widget-title">{component.title}</h2>}
        <div className="sdui-widget-items">
            {component.items.map((item, idx) => (
                <SDRenderComponent key={idx} component={item} />
            ))}
        </div>
    </div>
);

const SDRenderComponent: React.FC<SDComponentProps> = ({ component }) => {
    switch (component.type) {
        case 'widget_container':
            return <SDWidgetContainer component={component as WidgetContainer} />;
        case 'text_row':
            return <SDTextRow component={component as TextRow} />;
        case 'action_button':
            return <SDActionButton component={component as ActionButton} />;
        case 'section_header':
            return <SDSectionHeader component={component as SectionHeader} />;
        case 'deal_card':
            return <SDDealCard component={component as DealCard} />;
        case 'horizontal_carousel':
            return <SDHorizontalCarousel component={component as HorizontalCarousel} />;
        case 'grid':
            return <SDGrid component={component as Grid} />;
        default:
            console.warn(`Unknown SDUI component type: ${component.type}`);
            return null;
    }
};

export const SDRenderer: React.FC<{ widgets: WidgetContainer[] }> = ({ widgets }) => {
    if (widgets.length === 0) {
        return <div className="no-widgets">No widgets</div>;
    }

    return (
        <div className="sdui-list">
            {widgets.map((w, idx) => (
                <SDRenderComponent key={idx} component={w} />
            ))}
        </div>
    );
};
