exports.shorthands = undefined;

exports.up = pgm => {
    // Deals
    pgm.createTable('deals', {
        id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
        title: { type: 'text', notNull: true },
        price: { type: 'numeric', notNull: true },
        created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
    });

    // Saved Deals
    pgm.createTable('saved_deals', {
        user_id: { type: 'text', notNull: true },
        deal_id: { type: 'uuid', notNull: true, references: '"deals"', onDelete: 'CASCADE' },
        created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
    }, {
        constraints: {
            primaryKey: ['user_id', 'deal_id']
        }
    });

    // Widget Versions
    pgm.createTable('widget_versions', {
        user_id: { type: 'text', notNull: true },
        widget_key: { type: 'text', notNull: true },
        version: { type: 'integer', default: 1 }
    }, {
        constraints: {
            primaryKey: ['user_id', 'widget_key']
        }
    });

    // Outbox
    pgm.createTable('outbox', {
        id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
        event_payload: { type: 'jsonb', notNull: true },
        processed: { type: 'boolean', default: false },
        created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
    });

    // Seed Deals
    pgm.sql(`
    INSERT INTO deals (title, price) VALUES
    ('iPhone 15', 799.99),
    ('Samsung Galaxy S23', 699.99),
    ('MacBook Air M2', 1099.00),
    ('Sony WH-1000XM5', 348.00),
    ('iPad Air', 559.00),
    ('Nintendo Switch OLED', 349.99),
    ('AirPods Pro 2', 249.00),
    ('Dyson V15 Detect', 649.99),
    ('Kindle Paperwhite', 139.99),
    ('GoPro Hero 11', 399.99);
  `);
};

exports.down = pgm => {
    pgm.dropTable('outbox');
    pgm.dropTable('widget_versions');
    pgm.dropTable('saved_deals');
    pgm.dropTable('deals');
};
