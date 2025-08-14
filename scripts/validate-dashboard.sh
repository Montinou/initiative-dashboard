#!/bin/bash

# Dashboard Improvement Validation Script
# This script validates that all components are properly generated and configured

echo "🔍 Dashboard Improvement Validation"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAILED++))
        return 1
    fi
}

# Function to check for pattern in file
check_pattern() {
    if [ -f "$1" ]; then
        if grep -q "$2" "$1"; then
            echo -e "${GREEN}✓${NC} Pattern found in $1: $2"
            ((PASSED++))
            return 0
        else
            echo -e "${YELLOW}⚠${NC} Pattern not found in $1: $2"
            ((WARNINGS++))
            return 1
        fi
    else
        echo -e "${RED}✗${NC} Cannot check pattern - file missing: $1"
        ((FAILED++))
        return 1
    fi
}

echo "1. Checking Prompt Files"
echo "------------------------"
check_file "prompts/complete/01-system-analysis.md"
check_file "prompts/complete/02-fixed-objective-card.md"
check_file "prompts/complete/03-kpi-cards.md"
check_file "prompts/complete/04-integrated-dashboard.md"
check_file "prompts/complete/README.md"
echo ""

echo "2. Checking Component Structure"
echo "-------------------------------"
check_file "components/objectives/improved/FixedHeightObjectiveCard.tsx"
check_file "components/objectives/improved/KPICards.tsx"
check_file "components/objectives/improved/ImprovedObjectivesDashboard.tsx"
echo ""

echo "3. Checking shadcn/ui Components"
echo "--------------------------------"
check_file "components/ui/card.tsx"
check_file "components/ui/button.tsx"
check_file "components/ui/badge.tsx"
check_file "components/ui/progress.tsx"
check_file "components/ui/skeleton.tsx"
check_file "components/ui/tabs.tsx"
check_file "components/ui/select.tsx"
check_file "components/ui/input.tsx"
echo ""

echo "4. Checking Glass Styles in CSS"
echo "-------------------------------"
check_pattern "app/globals.css" "glass-card"
check_pattern "app/globals.css" "glass-button"
check_pattern "app/globals.css" "glass-input"
echo ""

echo "5. Checking Fixed Heights Implementation"
echo "---------------------------------------"
if [ -f "components/objectives/improved/FixedHeightObjectiveCard.tsx" ]; then
    check_pattern "components/objectives/improved/FixedHeightObjectiveCard.tsx" "min-h-\[200px\]"
    check_pattern "components/objectives/improved/FixedHeightObjectiveCard.tsx" "flex flex-col"
    check_pattern "components/objectives/improved/FixedHeightObjectiveCard.tsx" "flex-1"
fi

if [ -f "components/objectives/improved/KPICards.tsx" ]; then
    check_pattern "components/objectives/improved/KPICards.tsx" "h-24"
fi
echo ""

echo "6. Checking Grid System"
echo "----------------------"
if [ -f "components/objectives/improved/ImprovedObjectivesDashboard.tsx" ]; then
    check_pattern "components/objectives/improved/ImprovedObjectivesDashboard.tsx" "grid-cols-12"
    check_pattern "components/objectives/improved/ImprovedObjectivesDashboard.tsx" "col-span-"
    check_pattern "components/objectives/improved/ImprovedObjectivesDashboard.tsx" "gap-4"
fi
echo ""

echo "7. Checking Responsive Design"
echo "-----------------------------"
if [ -f "components/objectives/improved/ImprovedObjectivesDashboard.tsx" ]; then
    check_pattern "components/objectives/improved/ImprovedObjectivesDashboard.tsx" "md:grid-cols-"
    check_pattern "components/objectives/improved/ImprovedObjectivesDashboard.tsx" "lg:grid-cols-"
    check_pattern "components/objectives/improved/ImprovedObjectivesDashboard.tsx" "sm:"
fi
echo ""

echo "8. Running TypeScript Check"
echo "---------------------------"
if command -v npx &> /dev/null; then
    echo "Running TypeScript compiler check..."
    npx tsc --noEmit 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} TypeScript compilation successful"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} TypeScript compilation has issues"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} npx not found, skipping TypeScript check"
    ((WARNINGS++))
fi
echo ""

echo "===================================="
echo "VALIDATION SUMMARY"
echo "===================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ All validations passed! Your dashboard is ready.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Validation completed with warnings. Review the warnings above.${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ Validation failed. Please fix the issues above before proceeding.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run the setup script: bash scripts/setup-llm-shadcn.sh"
    echo "2. Execute the prompts in order (see prompts/complete/README.md)"
    echo "3. Generate missing components using the LLM prompts"
    echo "4. Run this validation again"
    exit 1
fi
