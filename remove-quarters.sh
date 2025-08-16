#!/bin/bash

echo "Removing all quarter references from the codebase..."

# Remove from TypeScript/JavaScript files
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -not -path "./*backup*" \
  -not -path "./*migration*" \
  -exec sed -i '' '/quarter/Id' {} \; 2>/dev/null

# Remove from JSON files
find . -type f -name "*.json" \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -exec sed -i '' '/quarter/Id' {} \; 2>/dev/null

# Remove from Markdown files  
find . -type f -name "*.md" \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -exec sed -i '' '/quarter/Id' {} \; 2>/dev/null

echo "Done!"