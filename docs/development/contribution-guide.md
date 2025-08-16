# Contribution Guide

## Welcome Contributors!

Thank you for your interest in contributing to the Initiative Dashboard project. This guide will help you understand our development process, standards, and how to submit contributions.

## Getting Started

### Prerequisites

1. **Fork the repository** to your GitHub account
2. **Clone your fork** locally:
```bash
git clone https://github.com/YOUR_USERNAME/initiative-dashboard.git
cd initiative-dashboard
```

3. **Add upstream remote**:
```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/initiative-dashboard.git
```

4. **Install dependencies**:
```bash
npm install
```

5. **Set up development environment**:
Follow the [Setup Guide](./setup-guide.md)

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

### 2. Make Your Changes

Follow our [Coding Standards](./coding-standards.md) while developing.

### 3. Write/Update Tests

```bash
# Run tests locally
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e        # E2E tests
```

### 4. Commit Your Changes

Follow our commit message format:

```bash
git add .
git commit -m "feat(scope): Add new feature"
```

Commit message types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Pull Request Guidelines

### PR Title Format

```
feat(initiatives): Add bulk update functionality
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] All tests passing
```

## Code Review Process

### What We Look For

1. **Code Quality**
   - Follows coding standards
   - Proper error handling
   - Efficient algorithms
   - No code duplication

2. **Testing**
   - Adequate test coverage
   - Tests are meaningful
   - Edge cases covered

3. **Documentation**
   - Code is self-documenting
   - Complex logic explained
   - API changes documented

4. **Security**
   - No sensitive data exposed
   - Input validation
   - Authentication checks

5. **Performance**
   - No unnecessary re-renders
   - Efficient queries
   - Proper caching

### Review Timeline

- Initial review: Within 2-3 business days
- Follow-up reviews: Within 1-2 business days
- Small fixes: Same day when possible

## Types of Contributions

### 1. Bug Reports

**Before submitting:**
- Check existing issues
- Verify it's reproducible
- Gather error details

**Include in report:**
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots/logs

### 2. Feature Requests

**Before submitting:**
- Check roadmap/existing issues
- Consider if it fits project scope

**Include in request:**
- Use case description
- Proposed solution
- Alternative solutions
- Mockups (if applicable)

### 3. Code Contributions

#### Small Changes (< 100 lines)
- Bug fixes
- Small features
- Documentation updates
- Test additions

#### Large Changes (> 100 lines)
- Discuss in issue first
- May need design review
- Break into smaller PRs

### 4. Documentation

Areas needing documentation:
- API endpoints
- Component usage
- Configuration options
- Architecture decisions
- Migration guides

### 5. Translations

Help translate the application:
1. Check `/locales` directory
2. Add/update language files
3. Follow existing structure
4. Test with language switcher

## Development Guidelines

### Component Development

```typescript
// 1. Create component file
// components/features/MyFeature.tsx

import { FC } from 'react';
import { cn } from '@/lib/utils';

interface MyFeatureProps {
  // Props interface
}

export const MyFeature: FC<MyFeatureProps> = (props) => {
  // Implementation
};

// 2. Add tests
// components/features/MyFeature.test.tsx

// 3. Add to exports
// components/features/index.ts
export { MyFeature } from './MyFeature';
```

### API Development

```typescript
// 1. Create API route
// app/api/my-endpoint/route.ts

export async function GET(request: NextRequest) {
  // Implementation
}

// 2. Add validation
// lib/validation/my-endpoint.ts

// 3. Add types
// lib/types/my-endpoint.ts

// 4. Create hook
// hooks/useMyEndpoint.ts

// 5. Add tests
// tests/api/my-endpoint.test.ts
```

### Database Changes

1. **Create migration**:
```sql
-- supabase/migrations/timestamp_description.sql
```

2. **Update types**:
```typescript
// lib/types/database.ts
```

3. **Update RLS policies** if needed

4. **Test locally**:
```bash
supabase db push
```

## Testing Requirements

### Coverage Targets

- Overall: 70%
- Critical paths: 85%
- New code: 80%

### Test Categories

#### Unit Tests
- Components
- Hooks
- Utilities
- Validators

#### Integration Tests
- API routes
- Database operations
- Authentication flows

#### E2E Tests
- User journeys
- Multi-tenant scenarios
- Role-based access

### Writing Tests

```typescript
// Good test structure
describe('FeatureName', () => {
  describe('when condition', () => {
    it('should expected behavior', () => {
      // Arrange
      const props = { /* ... */ };
      
      // Act
      const result = doSomething(props);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

## Security Guidelines

### Never Commit

- API keys
- Passwords
- Service account credentials
- Personal data
- `.env.local` files

### Always Include

- Input validation
- Authentication checks
- Authorization verification
- Error sanitization
- Rate limiting (where applicable)

## Performance Guidelines

### Frontend

- Lazy load heavy components
- Memoize expensive operations
- Use proper React keys
- Optimize images
- Minimize bundle size

### Backend

- Optimize database queries
- Implement caching
- Use pagination
- Batch operations
- Handle errors gracefully

## Documentation Standards

### Code Comments

```typescript
/**
 * Brief description of function
 * @param param - Parameter description
 * @returns Return value description
 * @throws Error description
 * @example
 * ```ts
 * const result = myFunction('value');
 * ```
 */
```

### README Updates

Update README when:
- Adding new features
- Changing setup process
- Modifying architecture
- Adding dependencies

## Release Process

### Version Numbering

We follow Semantic Versioning (SemVer):
- MAJOR.MINOR.PATCH
- Example: 2.1.3

### Release Types

1. **Patch Release** (x.x.X)
   - Bug fixes
   - Small improvements
   - Documentation updates

2. **Minor Release** (x.X.x)
   - New features
   - Non-breaking changes
   - Performance improvements

3. **Major Release** (X.x.x)
   - Breaking changes
   - Major features
   - Architecture changes

## Getting Help

### Resources

- [Setup Guide](./setup-guide.md)
- [Coding Standards](./coding-standards.md)
- [API Reference](../API_REFERENCE.md)
- [Technical Documentation](../TECHNICAL_DOCUMENTATION.md)

### Communication Channels

- GitHub Issues: Bug reports and features
- Discussions: General questions
- Pull Requests: Code reviews

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on what's best for the project
- Show empathy

## Recognition

Contributors are recognized in:
- Contributors list
- Release notes
- Documentation credits

## License

By contributing, you agree that your contributions will be licensed under the project's license.

## Questions?

If you have questions about contributing:
1. Check existing documentation
2. Search closed issues/PRs
3. Ask in GitHub Discussions
4. Contact maintainers

Thank you for contributing to Initiative Dashboard! 🚀