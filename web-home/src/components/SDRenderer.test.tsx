import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SDRenderer } from './SDRenderer';
import { WidgetContainer } from '../types';

describe('SDRenderer', () => {
    it('renders "No widgets" when array is empty', () => {
        render(<SDRenderer widgets={[]} />);
        expect(screen.getByText('No widgets')).toBeInTheDocument();
    });

    it('renders a widget container with title and items', () => {
        const widgets: WidgetContainer[] = [
            {
                type: 'widget_container',
                title: 'Test Widget',
                items: [
                    { type: 'text_row', text: 'Hello SDUI' } as any,
                    { type: 'action_button', label: 'Click Me', deeplink: 'app://test' } as any,
                ],
            },
        ];

        render(<SDRenderer widgets={widgets} />);
        expect(screen.getByText('Test Widget')).toBeInTheDocument();
        expect(screen.getByText('Hello SDUI')).toBeInTheDocument();
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('skips unknown component types', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const widgets: WidgetContainer[] = [
            {
                type: 'widget_container',
                title: 'Mixed Widget',
                items: [
                    { type: 'text_row', text: 'Known' } as any,
                    { type: 'mystery_box', data: 'Secret' } as any,
                ],
            },
        ];

        render(<SDRenderer widgets={widgets} />);
        expect(screen.getByText('Known')).toBeInTheDocument();
        expect(screen.queryByText('Secret')).not.toBeInTheDocument();
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown SDUI component type: mystery_box'));
        consoleWarnSpy.mockRestore();
    });

    it('calls onAction when an interactive component is clicked', () => {
        const onAction = vi.fn();
        const widgets: WidgetContainer[] = [
            {
                type: 'widget_container',
                items: [
                    { type: 'action_button', label: 'Click Me', deeplink: 'app://action' } as any,
                ],
            },
        ];

        render(<SDRenderer widgets={widgets} onAction={onAction} />);

        const button = screen.getByText('Click Me');
        button.click();

        expect(onAction).toHaveBeenCalledWith('app://action');
    });

    it('renders multiple widget containers from array', () => {
        const widgets: WidgetContainer[] = [
            { type: 'widget_container', title: 'Widget A', items: [] },
            { type: 'widget_container', title: 'Widget B', items: [] },
        ];
        render(<SDRenderer widgets={widgets} />);
        expect(screen.getByText('Widget A')).toBeInTheDocument();
        expect(screen.getByText('Widget B')).toBeInTheDocument();
    });

    it('renders deal_card with missing price without throwing', () => {
        const widgets: WidgetContainer[] = [
            {
                type: 'widget_container',
                items: [
                    {
                        type: 'deal_card',
                        title: 'Freebie',
                        image_url: 'http://foo.com/img.png',
                        deeplink: 'app://deal/1'
                    } as any
                ]
            }
        ];
        render(<SDRenderer widgets={widgets} />);
        expect(screen.getByText('Freebie')).toBeInTheDocument();
        // Should not see price or currency
        expect(screen.queryByText('$')).not.toBeInTheDocument();
        expect(screen.queryByText('€')).not.toBeInTheDocument();
    });
});
