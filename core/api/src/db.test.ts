import { pool, upsertWidget, getWidget, Widget } from './db';

describe('DB Integration', () => {
    const testWidget: Widget = {
        product_id: 'test_product',
        platform: 'web',
        audience_type: 'default',
        audience_id: 'global',
        widget_key: 'test_widget',
        content: { foo: 'bar' },
        schema_version: 1,
        data_version: 10
    };

    beforeEach(async () => {
        await pool.query('TRUNCATE widgets');
    });

    afterAll(async () => {
        await pool.end();
    });

    test('insert v10 succeeds', async () => {
        await upsertWidget(testWidget);
        const saved = await getWidget(testWidget);
        expect(saved).toBeDefined();
        expect(saved?.data_version).toBe(10);
    });

    test('upsert v9 does not overwrite v10', async () => {
        await upsertWidget(testWidget);

        const oldWidget = { ...testWidget, data_version: 9, content: { foo: 'old' } };
        await upsertWidget(oldWidget);

        const saved = await getWidget(testWidget);
        expect(saved?.data_version).toBe(10);
        expect(saved?.content).toEqual({ foo: 'bar' });
    });

    test('upsert v11 overwrites v10', async () => {
        await upsertWidget(testWidget);

        const newWidget = { ...testWidget, data_version: 11, content: { foo: 'new' } };
        await upsertWidget(newWidget);

        const saved = await getWidget(testWidget);
        expect(saved?.data_version).toBe(11);
        expect(saved?.content).toEqual({ foo: 'new' });
    });

    test('separate keys are independent', async () => {
        await upsertWidget(testWidget);

        const otherWidget = { ...testWidget, widget_key: 'other_widget', data_version: 5 };
        await upsertWidget(otherWidget);

        const savedTest = await getWidget(testWidget);
        const savedOther = await getWidget(otherWidget);

        expect(savedTest?.data_version).toBe(10);
        expect(savedOther?.data_version).toBe(5);
    });
});
