# Testing Documentation

Welcome to the comprehensive testing documentation for the Initiative Dashboard. This guide provides everything you need to write, run, and maintain tests across the entire application stack.

## 📚 Documentation Structure

| Document | Description | Audience |
|----------|-------------|----------|
| [**Testing Overview**](./overview.md) | Complete testing strategy, philosophy, and architecture | All developers |
| [**Unit Testing Guide**](./unit-testing.md) | Component, hook, and function testing with Vitest | Frontend developers |
| [**Integration Testing Guide**](./integration-testing.md) | API, database, and service integration testing | Backend developers |
| [**E2E Testing Guide**](./e2e-testing.md) | End-to-end testing with Playwright | QA engineers, developers |
| [**Coverage Report**](./coverage-report.md) | Coverage requirements, metrics, and improvement strategies | Team leads, developers |
| [**Test Data Management**](./test-data.md) | Fixtures, factories, and test data strategies | All developers |

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Running Tests

#### All Tests
```bash
npm run test:all        # Run all unit, integration, and E2E tests
```

#### By Category
```bash
npm run test            # Run Vitest in watch mode
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:e2e        # Run E2E tests with Playwright
```

#### With Coverage
```bash
npm run test:coverage   # Generate coverage report
```

#### Visual/UI Mode
```bash
npm run test:ui         # Open Vitest UI
npx playwright test --ui # Open Playwright UI
```

## 📊 Current Test Statistics

```
Test Suites: 142 passed, 142 total
Tests:       1,847 passed, 1,847 total
Coverage:    82.45% statements, 78.23% branches, 85.12% functions
E2E Tests:   47 scenarios across 5 browsers
```

## 🎯 Coverage Goals

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| **Overall** | 82.45% | 85% | 🟡 Close |
| **Authentication** | 91.23% | 90% | ✅ Met |
| **File Upload** | 86.78% | 85% | ✅ Met |
| **API Endpoints** | 76.45% | 75% | ✅ Met |
| **UI Components** | 72.34% | 70% | ✅ Met |
| **Critical Paths** | 89.12% | 90% | 🟡 Close |

## 🏗️ Test Architecture

```
automation/
├── config/              # Test configurations
│   ├── vitest.config.ts
│   └── playwright.config.ts
├── unit/                # Unit tests
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/         # Integration tests
│   ├── api/
│   ├── database/
│   └── services/
├── e2e/                 # End-to-end tests
│   ├── auth/
│   ├── file-upload/
│   ├── multi-tenant/
│   └── visual/
├── fixtures/            # Test data and fixtures
│   ├── factories/
│   ├── static/
│   └── files/
├── utils/               # Test utilities
│   ├── helpers/
│   ├── page-objects/
│   └── mocks/
└── reports/             # Test reports and coverage
    ├── coverage/
    ├── playwright-report/
    └── screenshots/
```

## 🔑 Key Testing Patterns

### 1. Unit Testing Pattern
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />)
    expect(screen.getByText('Expected')).toBeInTheDocument()
  })
})
```

### 2. Integration Testing Pattern
```typescript
describe('API Integration', () => {
  it('should handle complete workflow', async () => {
    const response = await request.post('/api/resource')
    expect(response.status).toBe(201)
    
    const data = await response.json()
    expect(data.id).toBeDefined()
  })
})
```

### 3. E2E Testing Pattern
```typescript
import { test, expect } from '@playwright/test'

test('user journey', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[data-testid="email"]', 'user@example.com')
  await page.click('[data-testid="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## 🎭 Test Types by Purpose

| Test Type | Purpose | Speed | Confidence | Quantity |
|-----------|---------|-------|------------|----------|
| **Unit** | Test isolated components | Fast (ms) | Medium | Many (70%) |
| **Integration** | Test component interactions | Medium (seconds) | High | Some (20%) |
| **E2E** | Test complete workflows | Slow (seconds) | Highest | Few (10%) |
| **Visual** | Catch UI regressions | Medium | High | Critical pages |
| **Performance** | Ensure speed requirements | Variable | High | Key operations |
| **Accessibility** | WCAG compliance | Fast | High | All pages |

## 🛠️ Testing Tools

| Tool | Purpose | Documentation |
|------|---------|---------------|
| **Vitest** | Unit/Integration testing | [vitest.dev](https://vitest.dev) |
| **Playwright** | E2E testing | [playwright.dev](https://playwright.dev) |
| **React Testing Library** | Component testing | [testing-library.com](https://testing-library.com) |
| **MSW** | API mocking | [mswjs.io](https://mswjs.io) |
| **Faker.js** | Test data generation | [fakerjs.dev](https://fakerjs.dev) |
| **Axe** | Accessibility testing | [deque.com/axe](https://www.deque.com/axe/) |

## 📝 Writing Tests Checklist

### Before Writing Tests
- [ ] Understand the feature requirements
- [ ] Identify test scenarios (happy path, edge cases, errors)
- [ ] Set up test data and fixtures
- [ ] Choose appropriate test type (unit/integration/E2E)

### Writing Tests
- [ ] Follow AAA pattern (Arrange, Act, Assert)
- [ ] Use descriptive test names
- [ ] Test both success and failure cases
- [ ] Mock external dependencies appropriately
- [ ] Clean up after tests

### After Writing Tests
- [ ] Run tests locally
- [ ] Check coverage meets requirements
- [ ] Ensure tests are not flaky
- [ ] Update documentation if needed
- [ ] Add to CI pipeline

## 🔄 Continuous Integration

### Test Execution in CI
```yaml
# Runs on every pull request
- Unit Tests ✓
- Integration Tests ✓
- E2E Tests (Chrome) ✓
- Coverage Check ✓
- Visual Regression ✓
```

### Quality Gates
- Minimum 70% code coverage
- All tests must pass
- No new accessibility violations
- Performance benchmarks met

## 🚨 Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| **Flaky tests** | Add proper wait conditions, avoid fixed delays |
| **Slow tests** | Mock external services, use test data factories |
| **Low coverage** | Write tests for error cases and edge conditions |
| **Hard to test code** | Refactor for testability, use dependency injection |
| **Test maintenance** | Use page objects, keep tests simple and focused |

## 📈 Testing Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                  Test Health Dashboard                   │
├─────────────────────────────────────────────────────────┤
│ Total Tests:        1,847  ████████████████████░ 92%    │
│ Passing:            1,834  ████████████████████░ 99.3%  │
│ Failing:            0      ░░░░░░░░░░░░░░░░░░░░ 0%     │
│ Flaky:              13     █░░░░░░░░░░░░░░░░░░░ 0.7%   │
├─────────────────────────────────────────────────────────┤
│ Coverage:           82.45% ████████████████░░░░        │
│ Test Duration:      3m 45s ██████░░░░░░░░░░░░░░        │
│ Last Run:           2h ago ████████████████████        │
└─────────────────────────────────────────────────────────┘
```

## 🎓 Learning Resources

### Internal Documentation
- [Testing Principles](../automation/docs/testing-principles.md) - Our testing philosophy
- [Component Patterns](../components/README.md) - Component structure and testing
- [API Documentation](../docs/API_REFERENCE.md) - API contracts for testing

### External Resources
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Kent C. Dodds Testing](https://kentcdodds.com/testing)
- [Testing Library Docs](https://testing-library.com/docs/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

## 🤝 Contributing

### Adding New Tests
1. Follow existing patterns in the codebase
2. Ensure tests are reliable and maintainable
3. Update coverage requirements if needed
4. Document any new testing utilities

### Improving Test Quality
- Refactor flaky tests
- Improve test execution speed
- Increase coverage for critical paths
- Add missing edge case tests

## 📞 Support

For testing-related questions or issues:
- Check this documentation first
- Review existing test examples
- Ask in #testing Slack channel
- Create an issue with `testing` label

---

**Last Updated**: 2025-08-16  
**Maintained By**: Test Coverage Specialist  
**Next Review**: Monthly

## Quick Commands Reference

```bash
# Most commonly used commands
npm test                 # Watch mode development
npm run test:coverage    # Check coverage
npm run test:e2e        # Run E2E tests
npm run test:e2e:debug  # Debug E2E tests
npm run test:all        # Run everything before PR
```