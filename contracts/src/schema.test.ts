import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import widgetSchema from './schemas/widget_schema.json';
import eventSchema from './schemas/event_schema.json';
import exampleDefault from './examples/example_default_widget_event.json';
import exampleUser from './examples/example_user_widget_event.json';

const ajv = new Ajv({ strict: false }); // strict: false to allow $id/$schema in definition
addFormats(ajv);

// Add schemas definition
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
});
