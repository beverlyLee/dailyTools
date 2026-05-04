export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'json', 'jsx', 'node'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true
};
