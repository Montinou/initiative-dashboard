# Test Automation Framework - Mariana Project

## Overview

This comprehensive test automation framework provides end-to-end testing capabilities for the Mariana project, focusing on file upload functionality, Stratix AI integration, multi-tenant isolation, and role-based access control.

## 🏗️ Framework Architecture

### Test Types
- **Unit Tests**: Component testing with Vitest and React Testing Library
- **Integration Tests**: API endpoint and service integration testing
- **E2E Tests**: End-to-end user journey testing with Playwright
- **Multi-tenant Tests**: Tenant isolation and security testing
- **Performance Tests**: Load and performance validation
- **Visual Tests**: UI regression and visual consistency testing

### Technology Stack
- **E2E Testing**: Playwright
- **Unit/Integration Testing**: Vitest
- **Component Testing**: React Testing Library
- **Test Data**: Factories and fixtures
- **CI/CD Integration**: GitHub Actions
- **Reporting**: HTML, JUnit, and JSON reports

## 📁 Directory Structure

```
automation/
├── config/                   # Test configurations
│   ├── playwright.config.ts  # Playwright E2E configuration
│   └── vitest.config.ts      # Vitest unit/integration configuration
├── docs/                     # Testing documentation
│   └── testing-principles.md # Testing guidelines and principles
├── e2e/                      # End-to-end tests
│   ├── file-upload/          # File upload workflow tests
│   ├── stratix/              # AI assistant integration tests
│   ├── multi-tenant/         # Tenant isolation tests
│   └── auth/                 # Authentication and RBAC tests
├── integration/              # Integration tests
│   ├── api/                  # API endpoint tests
│   ├── database/             # Database operation tests
│   └── services/             # Service integration tests
├── unit/                     # Unit tests
│   ├── components/           # React component tests
│   ├── hooks/                # Custom hook tests
│   └── utils/                # Utility function tests
├── fixtures/                 # Test data and factories
│   ├── auth/                 # Authentication states
│   ├── files/                # Test files for upload
│   └── mocks/                # Mock data and responses
├── utils/                    # Test utilities and helpers
│   ├── page-objects/         # Page object models
│   ├── helpers/              # Test helper functions
│   └── test-*.ts            # Setup and configuration files
└── reports/                  # Test reports and artifacts
    ├── coverage/             # Code coverage reports
    ├── playwright-report/    # E2E test reports
    └── screenshots/          # Test screenshots and videos
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm
- Local development environment running on port 3000

### Installation
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

#### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui
```

#### Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run API integration tests only
npm run test:integration -- integration/api
```

#### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# Run specific tenant tests
npm run test:e2e:fema
npm run test:e2e:siga
npm run test:e2e:stratix

# Run mobile tests
npm run test:e2e:mobile
```

#### Visual Regression Tests
```bash
# Run visual tests
npm run test:visual

# Update visual baselines
npm run test:visual:update
```

#### All Tests
```bash
# Run complete test suite
npm run test:all
```

## 🧪 Test Categories

### File Upload Tests
Comprehensive testing of OKR Excel file upload functionality:
- **File validation**: Type, size, and format validation
- **Drag and drop**: Interactive upload testing
- **Progress tracking**: Upload progress and status updates
- **Error handling**: Network errors, validation failures
- **Success flows**: File processing and result display
- **Template download**: Excel template generation

**Location**: `/automation/e2e/file-upload/`

### Stratix AI Integration Tests
End-to-end testing of AI assistant functionality:
- **Chat interface**: Message sending and receiving
- **AI responses**: Response quality and formatting
- **Streaming**: Real-time response streaming
- **Business intelligence**: KPI analysis and insights
- **Error recovery**: Network failures and retry logic
- **Performance**: Response time validation

**Location**: `/automation/e2e/stratix/`

### Multi-tenant Isolation Tests
Security and isolation testing across tenants:
- **Subdomain routing**: Tenant-specific URL handling
- **Data isolation**: Cross-tenant data access prevention
- **Authentication**: Tenant-specific login and sessions
- **Configuration**: Tenant-specific settings and themes
- **RLS policies**: Row-level security validation
- **Audit logging**: Tenant-specific activity tracking

**Location**: `/automation/e2e/multi-tenant/`

### Role-Based Access Control Tests
Permission and access control validation:
- **CEO role**: Full system access and admin functions
- **Manager role**: Area-specific management capabilities
- **Analyst role**: Read-only access and restrictions
- **Permission boundaries**: Privilege escalation prevention
- **Dynamic permissions**: Runtime permission changes
- **Audit compliance**: Permission-sensitive action logging

**Location**: `/automation/e2e/auth/`

## 🔧 Configuration

### Environment Variables
```bash
# Application URLs
PLAYWRIGHT_BASE_URL=http://localhost:3000
FEMA_TENANT_URL=http://fema.localhost:3000
SIGA_TENANT_URL=http://siga.localhost:3000
STRATIX_TENANT_URL=http://stratix.localhost:3000

# Database
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Feature flags
NEXT_PUBLIC_ENABLE_STRATIX=true

# Test configuration
CI=false # Set to true in CI environment
```

### Test Data Setup

#### Authentication States
Authentication states are automatically created during global setup:
- `ceo-auth.json`: CEO user session
- `manager-auth.json`: Manager user session
- `analyst-auth.json`: Analyst user session
- `{tenant}-admin-auth.json`: Tenant-specific admin sessions

#### Test Files
Test files for upload scenarios:
- `valid-okr-data.xlsx`: Valid Excel file for successful uploads
- `large-file.xlsx`: File exceeding size limits
- `invalid-format.txt`: Non-Excel file for validation testing
- `empty-file.xlsx`: Empty file for edge case testing

## 📊 Test Reporting

### Coverage Reports
- **HTML Report**: `/automation/reports/coverage/index.html`
- **JSON Summary**: `/automation/reports/coverage/coverage-summary.json`
- **LCOV**: `/automation/reports/coverage/lcov.info`

### E2E Reports
- **HTML Report**: `/automation/reports/playwright-report/index.html`
- **JUnit XML**: `/automation/reports/junit-results.xml`
- **JSON Results**: `/automation/reports/test-results.json`

### Artifacts
- **Screenshots**: Captured on test failures
- **Videos**: Full test execution recordings
- **Traces**: Detailed execution traces for debugging

## 🎯 Quality Gates

### Coverage Thresholds
- **Global**: 70% minimum across all metrics
- **Critical Components**: 85% for file upload and AI components
- **Security Components**: 90% for authentication and authorization

### Test Requirements
- All tests must be independent and isolated
- No flaky tests allowed in the main suite
- Performance tests must meet response time benchmarks
- Visual tests must pass pixel-perfect comparison

## 🔄 CI/CD Integration

The framework integrates with GitHub Actions for continuous testing:

### Workflow Stages
1. **Code Quality**: ESLint, TypeScript, security audit
2. **Unit Tests**: Fast component and utility testing
3. **Integration Tests**: API and service integration
4. **E2E Tests**: Cross-browser user journey testing
5. **Performance Tests**: Load and response time validation
6. **Security Tests**: Vulnerability scanning
7. **Deployment**: Staging and production deployment with smoke tests

### Branch Protection
- All tests must pass before merge to main
- Coverage thresholds must be maintained
- Security scans must pass
- Performance benchmarks must be met

## 🛠️ Development Workflow

### Adding New Tests

1. **Identify Test Type**: Determine if unit, integration, or E2E
2. **Follow Structure**: Use established patterns and page objects
3. **Create Test Data**: Add fixtures and mock data as needed
4. **Write Tests**: Follow AAA pattern (Arrange, Act, Assert)
5. **Update Documentation**: Document complex scenarios

### Page Object Pattern
```typescript
// Example page object
export class FileUploadPage extends BasePage {
  private readonly uploadZone = '[data-testid="file-upload-zone"]'
  
  async uploadFile(fileName: string): Promise<void> {
    const filePath = path.join('automation/fixtures/files', fileName)
    await this.uploadFile(this.fileInput, filePath)
  }
  
  async waitForUploadComplete(): Promise<void> {
    await this.waitForElement('[data-testid="upload-result"]')
  }
}
```

### Test Data Factories
```typescript
// Example factory usage
const mockUser = generateMockUser('Manager', 'fema-tenant-id')
const mockInitiative = generateMockInitiative('marketing-area-id')
```

## 🐛 Debugging

### Local Debugging
```bash
# Run specific test in debug mode
npx playwright test file-upload.e2e.ts --debug

# Run with browser visible
npx playwright test --headed

# Generate and view trace
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### CI Debugging
- Check workflow artifacts for screenshots and videos
- Review test logs in GitHub Actions
- Use trace files for detailed execution analysis

## 📈 Performance Benchmarks

### Response Time Targets
- **Page Load**: < 3 seconds
- **File Upload**: Progress feedback < 1 second
- **AI Response**: < 10 seconds
- **Database Queries**: < 500ms

### Load Testing
- Concurrent file uploads: 10 users
- Simultaneous AI requests: 5 users
- Database stress testing: 100 concurrent operations

## 🔒 Security Testing

### Test Scenarios
- **Input Validation**: XSS and injection prevention
- **Authentication**: Session management and expiry
- **Authorization**: Role-based access control
- **Data Isolation**: Multi-tenant security
- **File Upload**: Malicious file detection

### Compliance
- GDPR data handling compliance
- SOC 2 security controls
- OWASP security guidelines

## 🚨 Troubleshooting

### Common Issues

#### Test Failures
```bash
# Clear test cache
npm run test:clear-cache

# Reset Playwright browsers
npx playwright install --force

# Update snapshots
npm run test:visual:update
```

#### CI/CD Issues
- Check environment variables
- Verify test data setup
- Review artifact uploads
- Confirm browser installation

#### Performance Issues
- Check network conditions
- Verify test isolation
- Review resource cleanup
- Monitor test execution times

### Getting Help
- Review `/automation/docs/testing-principles.md`
- Check existing test patterns
- Consult team documentation
- Use debugging tools and traces

## 🤝 Contributing

### Guidelines
1. Follow established testing patterns
2. Maintain test independence
3. Use descriptive test names
4. Add appropriate assertions
5. Document complex scenarios
6. Ensure proper cleanup

### Review Process
- All tests must be reviewed
- Coverage requirements must be met
- Performance impact must be considered
- Security implications must be evaluated

---

**Remember**: Quality tests lead to quality software. Each test should provide real value and catch real issues. Focus on critical user paths and edge cases that matter to the business.

For more detailed information, see the individual documentation files in `/automation/docs/`.