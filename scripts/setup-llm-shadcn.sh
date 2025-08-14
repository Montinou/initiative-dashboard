#!/bin/bash

echo "🚀 Setting up LLM + shadcn/ui integration..."

# Create prompt directories if not exist
mkdir -p prompts/templates
mkdir -p lib/llm
mkdir -p components/objectives/improved

# Check for missing shadcn components
echo "📦 Checking shadcn/ui components..."

# Components that might be missing based on your needs
components_to_check=(
  "chart"
  "breadcrumb" 
  "sonner"
)

for component in "${components_to_check[@]}"; do
  if [ ! -f "components/ui/$component.tsx" ]; then
    echo "Would install $component (run: npx shadcn-ui@latest add $component)"
  else
    echo "✓ $component already installed"
  fi
done

# Create LLM helper utilities
cat > lib/llm/component-selector.ts << 'EOF'
import componentCatalog from '@/prompts/llm-config/component-catalog.json'
import designSystem from '@/prompts/llm-config/design-system.json'

export interface ComponentSelection {
  component: string
  variant?: string
  props: Record<string, any>
  subcomponents?: string[]
  justification: string
}

export function getComponentImports(selections: ComponentSelection[]): string[] {
  const imports = new Set<string>()
  
  selections.forEach(selection => {
    const component = findComponentInCatalog(selection.component)
    if (component?.path) {
      imports.add(`import { ${selection.component} } from '${component.path}'`)
    }
  })
  
  return Array.from(imports)
}

function findComponentInCatalog(componentName: string) {
  for (const category of Object.values(componentCatalog.components)) {
    for (const [name, details] of Object.entries(category as any)) {
      if (name === componentName) {
        return details
      }
    }
  }
  return null
}

export { componentCatalog, designSystem }
EOF

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Use the prompts in prompts/ folder with your LLM"
echo "2. Generate improved components"
echo "3. Test in development: npm run dev"
echo ""
echo "📚 Available prompts:"
echo "  - prompts/system-prompt.md"
echo "  - prompts/redesign-objectives-dashboard.md"
echo "  - prompts/component-selection.md"
