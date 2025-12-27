export interface Padding {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}

export interface SDUIComponent {
    type: string;
    padding?: Padding;
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

export interface SectionHeader extends SDUIComponent {
    type: 'section_header';
    title: string;
    subtitle?: string;
    icon?: string;
}

export interface DealCard extends SDUIComponent {
    type: 'deal_card';
    title: string;
    category?: string;
    image_url: string;
    price: number;
    original_price?: number;
    badge_text?: string;
    deeplink: string;
}

export interface HorizontalCarousel extends SDUIComponent {
    type: 'horizontal_carousel';
    items: DealCard[];
}

export interface Grid extends SDUIComponent {
    type: 'grid';
    columns: number;
    items: DealCard[];
}

export interface WidgetContainer extends SDUIComponent {
    type: 'widget_container';
    title?: string;
    items: (TextRow | ActionButton | SectionHeader | DealCard | HorizontalCarousel | Grid | SDUIComponent)[];
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
