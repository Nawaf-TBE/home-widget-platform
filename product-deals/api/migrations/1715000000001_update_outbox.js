exports.shorthands = undefined;

exports.up = pgm => {
    // Drop old outbox if strictly needed or just alter. 
    // Since we are in dev and approved plan, dropping and recreating is cleaner to enforce SERIAL id etc.
    pgm.dropTable('outbox');

    pgm.createTable('outbox', {
        id: { type: 'serial', primaryKey: true },
        aggregate_id: { type: 'varchar(50)', notNull: true },
        event_type: { type: 'varchar(50)', notNull: true },
        payload: { type: 'jsonb', notNull: true },
        retry_count: { type: 'integer', notNull: true, default: 0 },
        last_error: { type: 'text' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
        published_at: { type: 'timestamp' },
        failed_at: { type: 'timestamp' }
    });
};

exports.down = pgm => {
    pgm.dropTable('outbox');
    // Recreate old plain one? Not needed mostly.
};
