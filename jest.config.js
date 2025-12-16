module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleDirectories: ['node_modules', 'lib'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};