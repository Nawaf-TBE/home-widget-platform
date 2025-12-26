module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: true,
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
};
