export default {
  transform: {},
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'node'],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
