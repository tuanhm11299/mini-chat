/** API e2e tests: boot the whole app against the test database (DATABASE_URL in .env.test). */
module.exports = {
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/setup-env.ts'],
  testTimeout: 20000,
};
