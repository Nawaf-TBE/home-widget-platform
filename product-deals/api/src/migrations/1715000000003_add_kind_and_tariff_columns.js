/**
 * Migration: Add kind column and tariff fields to deals table
 * Supports category tiles and tariff rows without new tables
 */

exports.up = (pgm) => {
    // Add kind column with constraint
    pgm.addColumn('deals', {
        kind: {
            type: 'text',
            notNull: true,
            default: 'deal',
            check: "kind IN ('deal', 'category_tile', 'tariff')"
        }
    });

    // Add tariff-specific columns (nullable for non-tariff rows)
    pgm.addColumn('deals', {
        data_gb: { type: 'integer', notNull: false },
        price_per_month: { type: 'numeric(10,2)', notNull: false },
        compare_count: { type: 'integer', notNull: false }
    });

    // Index for efficient kind-based queries
    pgm.createIndex('deals', 'kind');
};

exports.down = (pgm) => {
    pgm.dropIndex('deals', 'kind');
    pgm.dropColumn('deals', ['kind', 'data_gb', 'price_per_month', 'compare_count']);
};
