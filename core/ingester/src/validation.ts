import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import eventSchema from '@home-widget-platform/contracts/src/schemas/event_schema.json';
import widgetSchema from '@home-widget-platform/contracts/src/schemas/widget_schema.json';

const ajv = new Ajv();
addFormats(ajv);

ajv.addSchema(widgetSchema); // Add referenced schema
const validateEvent = ajv.compile(eventSchema);

export { validateEvent };
