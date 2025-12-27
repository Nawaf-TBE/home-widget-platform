exports.shorthands = undefined;

exports.up = pgm => {
    // Add new columns for deal_card support
    pgm.addColumns('deals', {
        original_price: { type: 'numeric' },
        category: { type: 'text' },
        image_url: { type: 'text' },
        badge_text: { type: 'text' }
    });

    // Update existing deals with sample data
    pgm.sql(`
        UPDATE deals SET 
            category = CASE 
                WHEN title LIKE '%iPhone%' THEN 'Electronics'
                WHEN title LIKE '%Samsung%' THEN 'Electronics'
                WHEN title LIKE '%MacBook%' THEN 'Computers'
                WHEN title LIKE '%Sony%' THEN 'Audio'
                WHEN title LIKE '%iPad%' THEN 'Tablets'
                WHEN title LIKE '%Nintendo%' THEN 'Gaming'
                WHEN title LIKE '%AirPods%' THEN 'Audio'
                WHEN title LIKE '%Dyson%' THEN 'Home'
                WHEN title LIKE '%Kindle%' THEN 'Books'
                WHEN title LIKE '%GoPro%' THEN 'Cameras'
                ELSE 'Deals'
            END,
            original_price = price * 1.25,
            badge_text = CASE 
                WHEN title LIKE '%iPhone%' THEN 'New'
                WHEN title LIKE '%MacBook%' THEN 'Popular'
                WHEN title LIKE '%Sony%' THEN '20% OFF'
                ELSE NULL
            END
    `);
};

exports.down = pgm => {
    pgm.dropColumns('deals', ['original_price', 'category', 'image_url', 'badge_text']);
};
