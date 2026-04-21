export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95
    }
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  verbose: true
};
