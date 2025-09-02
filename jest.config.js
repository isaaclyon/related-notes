export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'jsdom',
  
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // File patterns for tests
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,ts}',
    '<rootDir>/src/**/*.(test|spec).{js,ts}'
  ],
  
  // Transform files
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.svelte$': [
      'svelte-jester',
      {
        preprocess: true
      }
    ]
  },
  
  // File extensions to consider
  moduleFileExtensions: ['js', 'ts', 'svelte', 'json'],
  
  // Module name mapping for imports
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^obsidian$': '<rootDir>/src/__mocks__/obsidian.ts',
    '^obsidian-community-lib$': '<rootDir>/src/__mocks__/obsidian-community-lib.ts'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    'jest-extended/all'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/__mocks__/**',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    },
    // Higher thresholds for critical algorithm files
    'src/MyGraph.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/index/BM25Service.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Clear mocks automatically between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test timeout
  testTimeout: 10000
};