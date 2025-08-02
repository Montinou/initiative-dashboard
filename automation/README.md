# Automation Framework - README

## Overview

This automation framework provides comprehensive testing capabilities for the Initiative Dashboard application using Playwright for E2E testing and Vitest for unit/integration testing.

## Quick Start

### 1. Initial Setup
```bash
# Install dependencies
npm install --save-dev @playwright/test
npx playwright install

# Initialize the agent
# Copy the agent prompt from automation/agent/agent-prompt.md
# Use it to interact with AI assistants for test automation
```

### 2. Run Tests
```bash
# Unit tests
npm run test

# E2E tests (when Playwright is configured)
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

## Agent Usage

### The Automation Agent
This project includes a specialized automation agent designed to:
- Create and maintain test suites
- Configure testing frameworks
- Optimize test performance
- Ensure best practices

### How to Use the Agent
1. Use the prompt from `automation/agent/agent-prompt.md`
2. Provide specific testing requirements
3. The agent will create comprehensive test solutions
4. Follow the established patterns and structure

### Example Requests
```
"Initialize the automation framework with Playwright and Vitest"
"Create E2E tests for user authentication flow"
"Add unit tests for the InitiativeForm component"
"Set up integration tests for the initiatives API"
"Configure visual regression testing"
```

## Folder Structure

```
automation/
├── agent/                    # Agent documentation and prompts
│   ├── agent-prompt.md      # Main agent prompt for AI assistants
│   ├── commands.md          # Available agent commands
│   ├── framework-overview.md # Framework configuration details
│   ├── project-context.md   # Application-specific context
│   ├── quick-start.md       # Getting started guide
│   └── usage-guide.md       # How to use the agent effectively
├── config/                   # Test configurations (to be created)
├── e2e/                     # End-to-end tests (to be created)
├── integration/             # Integration tests (to be created)
├── unit/                    # Unit tests (to be created)
├── fixtures/                # Test data and fixtures (to be created)
├── utils/                   # Test utilities (to be created)
├── reports/                 # Test reports and screenshots (to be created)
└── docs/                    # Testing documentation (to be created)
```

## Testing Strategy

### Test Types
1. **Unit Tests**: Components, hooks, utilities
2. **Integration Tests**: API endpoints, database operations
3. **E2E Tests**: Critical user journeys, cross-browser testing
4. **Visual Tests**: UI regression testing
5. **Performance Tests**: Load and stress testing

### Coverage Goals
- **Minimum Coverage**: 70% across all modules
- **Critical Paths**: 90%+ coverage for authentication and core workflows
- **Components**: 80%+ coverage for React components
- **APIs**: 100% coverage for public endpoints

## Key Features to Test

### Authentication & Authorization
- User login/logout flows
- Role-based access control
- Session management
- Multi-tenant isolation

### Initiative Management
- CRUD operations
- File upload and processing
- Status workflows
- Data validation

### OKR Management
- Goal creation and tracking
- Progress updates
- Analytics and reporting

### File Processing
- Excel upload and parsing
- Data validation
- Error handling
- Processing status tracking

## Configuration Files

### Vitest (Current)
- Located at: `vitest.config.ts`
- Configured for: Unit and integration testing
- Features: Coverage reporting, TypeScript support, JSX testing

### Playwright (To be added)
- Will be located at: `automation/config/playwright.config.ts`
- Will include: Multi-browser support, visual testing, CI/CD integration

## Best Practices

### Test Design
- Follow the AAA pattern (Arrange, Act, Assert)
- Use descriptive test names
- Test one thing per test case
- Include both happy path and edge cases

### Code Quality
- Use TypeScript for all test files
- Follow consistent naming conventions
- Create reusable test utilities
- Implement proper cleanup

### Data Management
- Use test fixtures for consistent data
- Implement proper test isolation
- Clean up test data after each test
- Use factories for dynamic data generation

### Performance
- Optimize test execution time
- Use parallel execution where possible
- Minimize external dependencies
- Implement proper timeout handling

## CI/CD Integration

### GitHub Actions (Recommended)
```yaml
# Example workflow for test execution
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:e2e
```

### Quality Gates
- All tests must pass before merge
- Coverage thresholds must be met
- No critical security vulnerabilities
- Performance benchmarks must be maintained

## Environment Setup

### Development
- Local Supabase instance
- Test database with sample data
- Mock external services
- Fast feedback loops

### Staging
- Production-like environment
- Real external service integration
- Comprehensive test suite
- Performance validation

### Production
- Smoke tests only
- Monitoring and alerting
- Quick validation
- Rollback capabilities

## Getting Help

### Documentation
- Read the agent documentation in `automation/agent/`
- Check the usage guide for common patterns
- Review project context for application-specific details

### Agent Support
- Use the agent prompt for AI-assisted test creation
- Follow the command reference for specific requests
- Leverage the framework overview for configuration help

### Troubleshooting
- Check test logs and reports
- Review CI/CD pipeline outputs
- Analyze test failure patterns
- Use debug mode for complex issues

## Contributing

### Adding New Tests
1. Follow the established folder structure
2. Use the agent for test creation
3. Include proper documentation
4. Ensure CI/CD compatibility

### Updating Framework
1. Discuss changes with the team
2. Update documentation
3. Maintain backward compatibility
4. Test changes thoroughly

### Best Practices
- Always use the automation agent for consistency
- Follow the established patterns
- Write self-documenting code
- Keep tests simple and focused

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

---

**Remember**: This automation framework is designed to grow with your application. Use the automation agent to maintain consistency and follow best practices as you expand your test coverage.
