exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('widgets', {
        product_id: { type: 'varchar(50)', notNull: true },
        platform: { type: 'varchar(20)', notNull: true },
        audience_type: { type: 'varchar(10)', notNull: true },
        audience_id: { type: 'varchar(100)', notNull: true },
        widget_key: { type: 'varchar(50)', notNull: true },
        content: { type: 'jsonb', notNull: true },
        schema_version: { type: 'integer', notNull: true },
        data_version: { type: 'integer', notNull: true },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
    });
    pgm.addConstraint('widgets', 'widgets_pk', {
        primaryKey: ['product_id', 'platform', 'audience_type', 'audience_id', 'widget_key']
    });
};

exports.down = pgm => {
    pgm.dropTable('widgets');
};
