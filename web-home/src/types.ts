export interface SDUIComponent {
    type: string;
}

export interface TextRow extends SDUIComponent {
    type: 'text_row';
    text: string;
}

export interface ActionButton extends SDUIComponent {
    type: 'action_button';
    label: string;
    deeplink: string;
}

export interface WidgetContainer extends SDUIComponent {
    type: 'widget_container';
    title: string;
    items: (TextRow | ActionButton | SDUIComponent)[];
}

export interface WidgetData {
    product_id: string;
    platform: string;
    audience_type: string;
    audience_id: string;
    widget_key: string;
    content: {
        schema_version: number;
        data_version: number;
        root: WidgetContainer;
    };
}
