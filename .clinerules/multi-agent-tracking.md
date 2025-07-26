# Multi-Agent Progress Tracking Rule

**Core Directive:** All Claude Code subagents MUST maintain detailed progress tracking with unique identifiers and structured logging throughout their execution.

---

## Mandatory Tracking Requirements

### 1. Agent Identification
Every spawned agent MUST:
- Generate a unique Agent ID in format: `AGENT_[FEATURE]_[TIMESTAMP]` 
  - Example: `AGENT_MODAL_20250112_143022`
- Log this ID at the start of every action
- Include Agent ID in all commits and file modifications

### 2. Progress Tracking File
Create and maintain: `implementation-progress.md`

**Required Structure:**
```markdown
# Multi-Agent Implementation Progress

## Active Agents
- AGENT_ID_1: [STATUS] - [CURRENT_TASK]
- AGENT_ID_2: [STATUS] - [CURRENT_TASK]

## Completed Tasks
### AGENT_ID_1
- [TIMESTAMP] ✅ Task description
- [TIMESTAMP] ✅ Task description

### AGENT_ID_2  
- [TIMESTAMP] ✅ Task description
- [TIMESTAMP] ✅ Task description

## Current Status
Last Updated: [TIMESTAMP]
Total Agents: X
Completed: X
In Progress: X
```

### 3. Baby Steps™ Logging
Following `/prompts/.clinerules/baby-steps.md`, each agent MUST:

**Log Every Single Action:**
```markdown
[AGENT_ID] [TIMESTAMP] STEP: [Action description]
[AGENT_ID] [TIMESTAMP] VALIDATE: [Validation result]
[AGENT_ID] [TIMESTAMP] COMPLETE: [Step completion status]
```

**Example:**
```markdown
AGENT_MODAL_20250112_143022 14:30:25 STEP: Creating connect-integration-modal.tsx
AGENT_MODAL_20250112_143022 14:30:45 VALIDATE: Modal component renders without errors
AGENT_MODAL_20250112_143022 14:30:50 COMPLETE: ✅ Modal component created and validated
```

### 4. File Modification Tracking
For every file created/modified, log:
```markdown
[AGENT_ID] [TIMESTAMP] FILE: [action] [filepath]
- Purpose: [Brief description]
- Changes: [Key modifications]
- Dependencies: [Related files/components]
- Status: [✅ Complete | 🔄 In Progress | ❌ Failed]
```

### 5. Integration Checkpoints
At completion, each agent MUST verify:
- [ ] All imports/exports functional
- [ ] UI components connected to handlers
- [ ] Firebase functions accessible
- [ ] End-to-end flow working
- [ ] Progress file updated with final status

### 6. Commit Message Format
All commits MUST include Agent ID:
```
[AGENT_ID] feat: implement feature name

- Detailed description of changes
- Integration points verified
- Baby Steps™ methodology applied

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Implementation Commands

### Start Tracking
```bash
echo "# Multi-Agent Implementation Progress - Started $(date)" > implementation-progress.md
echo "Agent ID: $AGENT_ID" >> implementation-progress.md
```

### Log Step
```bash
echo "[$AGENT_ID] $(date '+%H:%M:%S') STEP: [description]" >> implementation-progress.md
```

### Mark Complete
```bash
echo "[$AGENT_ID] $(date '+%H:%M:%S') ✅ COMPLETE: [task]" >> implementation-progress.md
```

---

**Enforcement:** Any agent failing to maintain proper tracking will be considered non-compliant and must restart with full tracking implementation.

**Objective:** Ensure complete visibility into multi-agent development process while maintaining Baby Steps™ methodology principles.