# LLM Prompts for Initiative Dashboard

## 🎯 Purpose
These prompts help LLMs (Claude, ChatGPT, etc.) generate consistent, high-quality UI components using shadcn/ui for the Initiative Dashboard.

## 📁 Structure

```
prompts/
├── llm-config/
│   ├── component-catalog.json    # Available shadcn components
│   └── design-system.json        # Design rules & theme
├── system-prompt.md               # Main LLM instructions
├── component-selection.md        # How to choose components
├── redesign-objectives-dashboard.md  # Dashboard redesign spec
└── fix-card-heights.md           # Fix specific UI issues
```

## 🚀 Quick Start

### 1. Setup
```bash
# Run setup script
bash scripts/setup-llm-shadcn.sh
```

### 2. Use with LLM

#### With Claude/ChatGPT:
```
I need to redesign the objectives dashboard. Here are my resources:

@component-catalog = [paste component-catalog.json]
@design-system = [paste design-system.json]
@current-code = [paste ObjectivesView.tsx]

Task: Generate an improved dashboard following the design system rules.
Requirements:
- Fix card height inconsistencies (min-h-[200px])
- Use 12-column grid system
- Maintain glassmorphic theme
- Make it fully responsive
```

#### Common Tasks:

**Fix Card Heights:**
```
Use prompts/fix-card-heights.md to fix inconsistent card heights in the objectives grid.
```

**Select Components:**
```
Use prompts/component-selection.md to choose the right shadcn components for a new feature.
```

**Redesign Dashboard:**
```
Use prompts/redesign-objectives-dashboard.md for complete dashboard overhaul.
```

## 📋 Available Components

Key shadcn/ui components already installed:
- Card, Tabs, Button, Badge
- Table, Progress, Select
- Dialog, Toast, Alert
- Form, Input, Textarea
- Chart, Skeleton

## 🎨 Design System

- **Theme**: Glassmorphic with dark mode
- **Grid**: 12-column system
- **Spacing**: 4px base (gap-4)
- **Heights**:
  - KPI Cards: `h-24`
  - Objective Cards: `min-h-[200px]`
- **Breakpoints**:
  - sm: 640px
  - md: 768px
  - lg: 1024px

## 💡 Tips

1. **Always include** both JSON configs when prompting
2. **Be specific** about which components to use
3. **Request TypeScript** code explicitly
4. **Ask for responsive** design
5. **Specify loading states** and error handling

## 📝 Example Outputs

The LLM should generate code like:

```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function ImprovedObjectiveCard() {
  return (
    <Card className={cn(
      "glassmorphic-card",
      "flex flex-col min-h-[200px]",
      "hover:border-primary/30 transition-all"
    )}>
      {/* Content */}
    </Card>
  )
}
```

## 🔧 Customization

Edit the JSON configs to:
- Add new components
- Change design rules
- Update spacing/sizing
- Modify theme colors
