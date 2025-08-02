# Automation Framework Quick Start Guide

## Initial Setup Commands

### 1. Install Dependencies
```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install additional testing utilities
npm install --save-dev @testing-library/user-event @testing-library/jest-dom

# Install Playwright browsers
npx playwright install
```

### 2. Project Structure Created
```
automation/
├── agent/                    # Agent documentation and instructions
├── config/                   # Test configurations
├── e2e/                     # End-to-end tests
├── integration/             # Integration tests  
├── unit/                    # Unit tests
├── fixtures/                # Test data and fixtures
├── utils/                   # Test utilities and helpers
├── reports/                 # Test reports and screenshots
└── docs/                    # Testing documentation
```

### 3. Available npm Scripts
Add these to your package.json scripts:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:unit": "vitest",
    "test:unit:ui": "vitest --ui",
    "test:integration": "vitest run --config automation/config/vitest.integration.config.ts",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:coverage": "vitest --coverage"
  }
}
```

### 4. Environment Setup
Create `.env.test` file:
```bash
# Test environment variables
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
POSTGRES_URL=your_test_database_url
```

## Quick Commands for the Agent

### Generate Tests
- `"Create E2E tests for user authentication"`
- `"Set up unit tests for the Dashboard component"`  
- `"Add integration tests for the initiatives API"`
- `"Create visual regression tests for the main dashboard"`

### Maintenance
- `"Update test configurations for CI/CD"`
- `"Add test fixtures for OKR data"`
- `"Create page objects for the new feature"`
- `"Optimize test performance"`

### Reporting
- `"Generate test coverage report"`
- `"Create test execution summary"`
- `"Set up test notifications"`

## Best Practices Enforced

1. **Test Isolation**: Each test runs independently
2. **Page Objects**: Reusable page interaction patterns
3. **Test Data**: Factories and fixtures for consistent data
4. **Error Handling**: Proper cleanup and error recovery
5. **Documentation**: Clear test descriptions and comments
6. **Performance**: Optimized test execution
7. **Maintainability**: Clean, readable test code

## Framework Features

### Playwright E2E Testing
- Multi-browser support (Chromium, Firefox, Safari)
- Mobile testing capabilities
- Visual regression testing
- Network interception and mocking
- Video and screenshot capture
- Parallel test execution

### Vitest Unit/Integration Testing
- Fast test execution with hot reload
- Built-in code coverage
- TypeScript support
- Mock and spy utilities
- Snapshot testing
- Test UI for debugging

### Test Utilities
- Custom matchers and assertions
- Test data factories
- Page object base classes
- Authentication helpers
- Database cleanup utilities
- Mock service providers

## Ready to Use!

The automation agent is now ready to create and maintain your test suite. Simply ask for specific tests or improvements, and the agent will follow the established patterns and best practices.
