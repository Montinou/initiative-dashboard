module.exports = {
  // Use Vitest for unit and integration tests
  testMatch: undefined, // Disable Jest test matching since we're using Vitest
  
  // Jest is only used for compatibility if needed
  // All actual testing is done through Vitest
  
  // Coverage collection (delegated to Vitest)
  collectCoverage: false,
  
  // Transform settings (handled by Vitest)
  transform: {},
  
  // Module name mapper (handled by Vitest)
  moduleNameMapper: {},
  
  // Setup files (handled by Vitest)
  setupFilesAfterEnv: [],
  
  // Test environment (handled by Vitest)
  testEnvironment: undefined,
  
  // Note: This config exists for compatibility only
  // Run tests using: npm run test (which uses Vitest)
};