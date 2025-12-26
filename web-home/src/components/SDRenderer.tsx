import React from 'react';
import { WidgetContainer, TextRow, ActionButton, SDUIComponent } from '../types';

interface SDComponentProps {
    component: SDUIComponent;
}

const SDTextRow: React.FC<{ component: TextRow }> = ({ component }) => (
    <p className="sdui-text-row">{component.text}</p>
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
        <button className="sdui-action-button" onClick={handleClick}>
            {component.label}
        </button>
    );
};

const SDWidgetContainer: React.FC<{ component: WidgetContainer }> = ({ component }) => (
    <div className="sdui-widget-container">
        <h2 className="sdui-widget-title">{component.title}</h2>
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
