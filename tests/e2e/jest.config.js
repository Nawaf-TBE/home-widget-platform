const base = require('../../jest.config.base');

module.exports = {
    ...base,
    displayName: 'e2e',
    testMatch: ['<rootDir>/*.test.ts'],
};
