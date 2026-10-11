/** Unit tests: `*.spec.ts` files next to the code they test. */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
};
