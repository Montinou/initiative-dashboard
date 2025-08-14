## Database Guidelines
- Always make sure you are following @public/schema-public.sql for everything related to database, in auth schema we only have users

## Development Quality Assurance Guidelines
- Whenever coordinating Devs - QA agents, follow these principles:
  1. Batch QA Reviews - Let agents complete 2-3 tasks, then deep QA analysis
  2. Code-First Validation - Always verify actual implementation exists
  3. Technical Debt Scanning - Automated tools to detect violations
  4. Quality Gates - Block progress until real quality standards met

## Documentation Guidelines
- keep everything as is actually documented in @docs/API_REFERENCE.md, @docs/TECHNICAL_DOCUMENTATION.md. If something needs changing from that core structure you have to specifically tell me to confirm.

## File Management Guidelines
- Always create new files in an appropriate folder if it doesn't exist. When finished using a file that isn't worth keeping (especially temporary test files), clean it up thoroughly

## Credentials
- Supabase CLI password: bWSg6ONuXWdZsDVP

### Quick Reference Card for CLAUDE.md

```markdown
## Agent Task Mapping (Quick Reference)

| Task Type | Primary Agent | Support Agents | Sequence |
|-----------|--------------|----------------|----------|
| New Feature | Developer | DB Architect, QA, Security, Testing | Design → Build → Review → Test |
| Bug Fix | QA Engineer | Developer, Testing | Analyze → Fix → Test |
| DB Schema | DB Architect | Security, Developer | Design → Secure → Implement |
| UI Component | UI/UX Designer | Developer, QA | Design → Build → Review |
| API Integration | Integration Specialist | Security, QA | Design → Implement → Validate |
| Performance | Performance Agent | DB Architect, Developer | Profile → Optimize → Implement |
| Security Audit | security-auditor | DB Architect, Developer | Scan → Fix → Validate |
| Documentation | Documentation Agent | - | Write → Review |
| Testing | test-coverage-specialist | QA Engineer | Write Tests → Validate Coverage |
| Deployment | DevOps Engineer | Security, QA | Prepare → Deploy → Monitor |

### Orchestration Triggers
- DB changes detected → Add DB Architect
- Auth/User data → Add security-auditor  
- UI changes → Add UI/UX Designer
- External APIs → Add Integration Specialist
- Slow queries → Add Performance Agent
- Missing tests → Add test-coverage-specialist

### Agent Prompt Template
"As [Agent Type]: 
1. Review [relevant files/docs]
2. [Primary task action]
3. Ensure [quality criteria]
4. Report: [expected outputs]"
```

- always use cookies to auth supabase