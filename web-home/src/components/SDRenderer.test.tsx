import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SDRenderer } from './SDRenderer';
import { WidgetContainer } from '../types';

/**
 * Helper to wrap a component in a widget container for rendering
 */
const createMockWidget = (items: any[], title?: string): WidgetContainer => ({
    type: 'widget_container',
    title,
    items,
});

describe('SDRenderer', () => {
    it('renders "No widgets" when array is empty', () => {
        render(<SDRenderer widgets={[]} />);
        expect(screen.getByText('No widgets')).toBeInTheDocument();
    });

    describe('Basic Components', () => {
        it('renders a text_row', () => {
            const widgets = [createMockWidget([{ type: 'text_row', text: 'Hello SDUI' }])];
            render(<SDRenderer widgets={widgets} />);
            expect(screen.getByText('Hello SDUI')).toBeInTheDocument();
        });

        it('renders an action_button and handles click', () => {
            const onAction = vi.fn();
            const widgets = [createMockWidget([{ type: 'action_button', label: 'Click Me', deeplink: 'app://action' }])];
            render(<SDRenderer widgets={widgets} onAction={onAction} />);

            const button = screen.getByText('Click Me');
            button.click();

            expect(onAction).toHaveBeenCalledWith('app://action');
        });

        it('renders a section_header', () => {
            const widgets = [createMockWidget([{
                type: 'section_header',
                title: 'Section Title',
                subtitle: 'Section Subtitle',
                icon: '🚀'
            }])];
            render(<SDRenderer widgets={widgets} />);
            expect(screen.getByText('Section Title')).toBeInTheDocument();
            expect(screen.getByText('Section Subtitle')).toBeInTheDocument();
            expect(screen.getByText('🚀')).toBeInTheDocument();
        });
    });

    describe('Complex Layouts', () => {
        it('renders a deal_card', () => {
            const widgets = [createMockWidget([{
                type: 'deal_card',
                title: 'Great Deal',
                category: 'Travel',
                image_url: 'http://example.com/img.png',
                price: 99.99,
                currency: 'EUR',
                deeplink: 'app://deal/1'
            }])];
            render(<SDRenderer widgets={widgets} />);
            expect(screen.getByText(/Great Deal/)).toBeInTheDocument();
            expect(screen.getByText(/Travel/)).toBeInTheDocument();
            expect(screen.getByText(/€99.99/)).toBeInTheDocument();
        });

        it('renders a horizontal_carousel of deal_cards', () => {
            const widgets = [createMockWidget([{
                type: 'horizontal_carousel',
                items: [
                    { type: 'deal_card', title: 'Deal 1', image_url: '', deeplink: '1' },
                    { type: 'deal_card', title: 'Deal 2', image_url: '', deeplink: '2' },
                ]
            }])];
            render(<SDRenderer widgets={widgets} />);
            expect(screen.getByText('Deal 1')).toBeInTheDocument();
            expect(screen.getByText('Deal 2')).toBeInTheDocument();
        });

        it('renders a grid of deal_cards', () => {
            const widgets = [createMockWidget([{
                type: 'grid',
                columns: 2,
                items: [
                    { type: 'deal_card', title: 'Grid Item 1', image_url: '', deeplink: '1' },
                    { type: 'deal_card', title: 'Grid Item 2', image_url: '', deeplink: '2' },
                ]
            }])];
            render(<SDRenderer widgets={widgets} />);
            expect(screen.getByText('Grid Item 1')).toBeInTheDocument();
            expect(screen.getByText('Grid Item 2')).toBeInTheDocument();
        });
    });

    describe('Specialized Components', () => {
        it('renders a tariff_tile', () => {
            const widgets = [createMockWidget([{
                type: 'tariff_tile',
                data_gb: 50,
                price_per_month: 19.99,
                compare_count: 5,
                badge_text: 'Best Seller',
                deeplink: 'app://tariff/1'
            }])];
            render(<SDRenderer widgets={widgets} />);
            expect(screen.getByText(/50/)).toBeInTheDocument();
            expect(screen.getByText(/GB/)).toBeInTheDocument();
            expect(screen.getByText(/19.99/)).toBeInTheDocument();
            expect(screen.getByText(/Best Seller/)).toBeInTheDocument();
        });

        it('renders a list of components', () => {
            const widgets = [createMockWidget([{
                type: 'list',
                items: [
                    { type: 'tariff_tile', data_gb: 10, price_per_month: 9.99, compare_count: 2, deeplink: '1' },
                    { type: 'tariff_tile', data_gb: 20, price_per_month: 14.99, compare_count: 3, deeplink: '2' },
                ]
            }])];
            render(<SDRenderer widgets={widgets} />);
            expect(screen.getByText(/10/)).toBeInTheDocument();
            expect(screen.getByText(/20/)).toBeInTheDocument();
            expect(screen.getAllByText(/GB/)).toHaveLength(2);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('skips unknown component types and warns', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const widgets = [createMockWidget([
                { type: 'text_row', text: 'Known' } as any,
                { type: 'mystery_box', data: 'Secret' } as any,
            ])];

            render(<SDRenderer widgets={widgets} />);
            expect(screen.getByText('Known')).toBeInTheDocument();
            expect(screen.queryByText('Secret')).not.toBeInTheDocument();
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown SDUI component type: mystery_box'));
            consoleWarnSpy.mockRestore();
        });

        it('renders deal_card with missing price without throwing', () => {
            const widgets = [createMockWidget([{
                type: 'deal_card',
                title: 'Freebie',
                image_url: 'http://foo.com/img.png',
                deeplink: 'app://deal/1'
            }])];
            render(<SDRenderer widgets={widgets} />);
            expect(screen.getByText('Freebie')).toBeInTheDocument();
            expect(screen.queryByText('$')).not.toBeInTheDocument();
            expect(screen.queryByText('€')).not.toBeInTheDocument();
        });
    });

    it('renders multiple widget containers from array', () => {
        const widgets = [
            createMockWidget([], 'Widget A'),
            createMockWidget([], 'Widget B'),
        ];
        render(<SDRenderer widgets={widgets} />);
        expect(screen.getByText('Widget A')).toBeInTheDocument();
        expect(screen.getByText('Widget B')).toBeInTheDocument();
    });
});
