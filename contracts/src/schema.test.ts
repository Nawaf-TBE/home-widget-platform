import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import widgetSchema from './schemas/widget_schema.json';
import eventSchema from './schemas/event_schema.json';
import exampleDefault from './examples/example_default_widget_event.json';
import exampleUser from './examples/example_user_widget_event.json';

const ajv = new Ajv({ strict: false });
addFormats(ajv);

ajv.addSchema(widgetSchema, 'widget.json');
const validateEvent = ajv.compile(eventSchema);

describe('Schema Validation', () => {
    describe('Event Schema', () => {
        test('validates example_default_widget_event.json', () => {
            const valid = validateEvent(exampleDefault);
            if (!valid) console.error(validateEvent.errors);
            expect(valid).toBe(true);
        });

        test('validates example_user_widget_event.json', () => {
            const valid = validateEvent(exampleUser);
            if (!valid) console.error(validateEvent.errors);
            expect(valid).toBe(true);
        });

        test('fails on invalid platform', () => {
            const invalid = { ...exampleDefault, platform: 'android' };
            const valid = validateEvent(invalid);
            expect(valid).toBe(false);
        });

        test('fails on missing data_version', () => {
            const invalid = JSON.parse(JSON.stringify(exampleDefault));
            delete invalid.data_version;
            const valid = validateEvent(invalid);
            expect(valid).toBe(false);
        });

        test('fails on missing content.root', () => {
            const invalid = JSON.parse(JSON.stringify(exampleDefault));
            delete invalid.content.root;
            const valid = validateEvent(invalid);
            expect(valid).toBe(false);
        });

        test('fails on unknown widget component type', () => {
            const invalid = JSON.parse(JSON.stringify(exampleDefault));
            invalid.content.root.items.push({ type: 'unknown_component', foo: 'bar' });
            const valid = validateEvent(invalid);
            expect(valid).toBe(false);
        });
    });

    describe('New Component Types', () => {
        test('validates deal_card component', () => {
            const event = JSON.parse(JSON.stringify(exampleUser));
            expect(validateEvent(event)).toBe(true);
        });

        test('validates horizontal_carousel component', () => {
            const event = JSON.parse(JSON.stringify(exampleUser));
            expect(validateEvent(event)).toBe(true);
        });

        test('validates grid component', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            expect(validateEvent(event)).toBe(true);
        });

        test('validates section_header component', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            expect(validateEvent(event)).toBe(true);
        });
    });

    describe('Padding Validation', () => {
        test('accepts valid padding (0-24)', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            event.content.root.padding = { top: 0, right: 24, bottom: 12, left: 8 };
            expect(validateEvent(event)).toBe(true);
        });

        test('rejects padding above 24', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            event.content.root.padding = { top: 25 };
            expect(validateEvent(event)).toBe(false);
        });

        test('rejects negative padding', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            event.content.root.padding = { left: -1 };
            expect(validateEvent(event)).toBe(false);
        });
    });

    describe('Item Count Limits', () => {
        test('rejects widget_container with more than 20 items', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            event.content.root.items = [];
            for (let i = 0; i < 21; i++) {
                event.content.root.items.push({ type: 'text_row', text: `Item ${i}` });
            }
            expect(validateEvent(event)).toBe(false);
        });

        test('accepts widget_container with exactly 20 items', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            event.content.root.items = [];
            for (let i = 0; i < 20; i++) {
                event.content.root.items.push({ type: 'text_row', text: `Item ${i}` });
            }
            expect(validateEvent(event)).toBe(true);
        });

        test('rejects grid with more than 12 deal_cards', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            const grid = event.content.root.items.find((i: { type: string }) => i.type === 'grid');
            grid.items = [];
            for (let i = 0; i < 13; i++) {
                grid.items.push({
                    type: 'deal_card',
                    title: `Deal ${i}`,
                    image_url: 'https://example.com/img.jpg',
                    price: 9.99,
                    deeplink: 'app://deals'
                });
            }
            expect(validateEvent(event)).toBe(false);
        });

        test('rejects horizontal_carousel with more than 12 deal_cards', () => {
            const event = JSON.parse(JSON.stringify(exampleUser));
            const carousel = event.content.root.items.find((i: { type: string }) => i.type === 'horizontal_carousel');
            carousel.items = [];
            for (let i = 0; i < 13; i++) {
                carousel.items.push({
                    type: 'deal_card',
                    title: `Deal ${i}`,
                    image_url: 'https://example.com/img.jpg',
                    price: 9.99,
                    deeplink: 'app://deals'
                });
            }
            expect(validateEvent(event)).toBe(false);
        });
    });

    describe('Grid Columns Validation', () => {
        test('rejects grid with 0 columns', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            const grid = event.content.root.items.find((i: { type: string }) => i.type === 'grid');
            grid.columns = 0;
            expect(validateEvent(event)).toBe(false);
        });

        test('rejects grid with more than 3 columns', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            const grid = event.content.root.items.find((i: { type: string }) => i.type === 'grid');
            grid.columns = 4;
            expect(validateEvent(event)).toBe(false);
        });

        test('accepts grid with 1-3 columns', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            const grid = event.content.root.items.find((i: { type: string }) => i.type === 'grid');

            grid.columns = 1;
            expect(validateEvent(event)).toBe(true);

            grid.columns = 2;
            expect(validateEvent(event)).toBe(true);

            grid.columns = 3;
            expect(validateEvent(event)).toBe(true);
        });
    });

    describe('String Length Limits', () => {
        test('rejects title longer than 120 characters', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            event.content.root.title = 'A'.repeat(121);
            expect(validateEvent(event)).toBe(false);
        });

        test('accepts title with exactly 120 characters', () => {
            const event = JSON.parse(JSON.stringify(exampleDefault));
            event.content.root.title = 'A'.repeat(120);
            expect(validateEvent(event)).toBe(true);
        });
    });
});
