/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    // las pruebas no leen el .env real: usan valores de prueba (tests/setup-env.ts)
    setupFiles: ['<rootDir>/tests/setup-env.ts'],
};
