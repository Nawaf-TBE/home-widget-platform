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
});
