# Button & Badge Audit Report

## Executive Summary
This audit identifies all buttons and badges in the codebase that don't follow shadcn/ui variant patterns. The goal is to standardize all UI components to use proper variants instead of custom Tailwind classes.

## Current Implementation Status

### ✅ Compliant Components
- `/components/ui/button.tsx` - Properly configured with shadcn variants
- `/components/ui/badge.tsx` - Properly configured with shadcn variants

### ❌ Non-Compliant Issues Found

## 1. BUTTONS WITH CUSTOM GRADIENT CLASSES

### Critical Issues - Gradient Buttons
These buttons use custom gradient classes instead of shadcn variants:

| File | Line | Current Implementation | Recommended Fix |
|------|------|----------------------|-----------------|
| `/app/demo/page.tsx` | 142, 170 | `className="bg-gradient-to-r from-indigo-500 to-pink-500"` | Use `variant="default"` |
| `/components/okr-upload/OKRFileUpload.tsx` | 327 | `className="bg-gradient-to-r from-primary to-secondary"` | Use `variant="default"` |
| `/app/page.tsx` | 27 | `className="min-h-screen bg-gradient-to-br from-slate-900"` | Background, not button - OK |
| `/app/profile/page.tsx` | 350, 461 | `className="bg-gradient-to-r from-purple-500 to-cyan-400"` | Use `variant="default"` |

### Custom Background Color Buttons
These buttons use inline background colors instead of variants:

| File | Line | Current Implementation | Recommended Fix |
|------|------|----------------------|-----------------|
| `/components/modals/ActivityFormModal.tsx` | 309 | `className="bg-green-600 hover:bg-green-700"` | Use `variant="default"` with green theme or custom variant |
| `/components/modals/InitiativeFormModal.tsx` | 524 | `className="bg-green-600 hover:bg-green-700"` | Use `variant="default"` with green theme |
| `/components/modals/ObjectiveFormModal.tsx` | 425 | `className="bg-purple-600 hover:bg-purple-700"` | Use `variant="default"` |
| `/components/manager/FallbackComponents.tsx` | 252 | `className="bg-blue-600 hover:bg-blue-700"` | Use `variant="default"` |
| `/components/manager/SecurityTestDashboard.tsx` | 646 | `className="bg-blue-600 hover:bg-blue-700"` | Use `variant="default"` |
| `/app/demo/page.tsx` | 314 | `className="bg-white text-indigo-900"` | Use `variant="secondary"` or `variant="outline"` |

### Buttons with Custom Hover States
These buttons override hover states with custom classes:

| File | Line | Current Implementation | Recommended Fix |
|------|------|----------------------|-----------------|
| `/components/role-navigation.tsx` | 214 | `className="hover:text-white hover:bg-white/10"` | Use `variant="ghost"` |
| `/components/manager/FallbackComponents.tsx` | 28, 51, 74, 125 | `className="hover:bg-white/10"` | Use `variant="ghost"` |
| `/components/app-layout.tsx` | 38 | `className="text-white hover:bg-white/10"` | Use `variant="ghost"` |
| `/app/admin/page.tsx` | 29, 53 | `className="text-white hover:bg-white/10"` | Use `variant="ghost"` |

## 2. BADGES WITH CUSTOM COLORS

### Non-Standard Badge Variants
These badges use custom color classes or non-existent variants:

| File | Line | Current Implementation | Recommended Fix |
|------|------|----------------------|-----------------|
| `/components/invitations/ScheduledInvitations.tsx` | 302 | `<Badge className="bg-blue-100 text-blue-800">` | Use `variant="secondary"` |
| `/components/invitations/ScheduledInvitations.tsx` | 303 | `<Badge variant="success">` | Use `variant="default"` with green theme |
| `/components/okr-upload/OKRImportHistory.tsx` | 88 | `<Badge className="bg-green-500/20 text-green-400">` | Use `variant="outline"` or create custom variant |
| `/components/okr-upload/OKRImportHistory.tsx` | 90 | `<Badge className="bg-blue-500/20 text-blue-400">` | Use `variant="secondary"` |
| `/components/okr-upload/OKRImportHistory.tsx` | 92 | `<Badge className="bg-red-500/20 text-red-400">` | Use `variant="destructive"` |
| `/components/okr-upload/OKRImportHistory.tsx` | 94 | `<Badge className="bg-yellow-500/20 text-yellow-400">` | Use `variant="outline"` with warning theme |
| `/components/okr-dashboard.tsx` | 163 | `<Badge className="bg-green-500/20 text-green-300">` | Use proper variant |
| `/components/okr-dashboard.tsx` | 167 | `<Badge className="bg-red-500/20 text-red-300">` | Use `variant="destructive"` |
| `/components/invitations/InvitationTable.tsx` | 250 | `<Badge className={colors[role]}>` | Map to proper variants |
| `/components/RecentActivityFeed.tsx` | 171 | `<Badge className={getActionColor(activity.action)}>` | Map action colors to variants |

### Badges Using Non-Existent Variants
The badge component defines these custom variants that should be used instead of inline classes:
- `success` (line 17-18 in badge.tsx)
- `warning` (line 19-20 in badge.tsx)  
- `info` (line 21-22 in badge.tsx)

However, these are not standard shadcn variants and should be reconsidered.

## 3. OTHER NON-COMPLIANT ELEMENTS

### Alert Components with Custom Backgrounds
These are Alert components, not buttons/badges, but show similar issues:

| File | Line | Element | Current Implementation |
|------|------|---------|----------------------|
| `/components/modals/ActivityFormModal.tsx` | 147, 284 | Alert | `className="bg-red-500/10"` |
| `/components/modals/InitiativeFormModal.tsx` | 212 | Alert | `className="bg-red-500/10"` |
| `/components/okr-upload/OKRFileUpload.tsx` | 357, 371, 507 | Alert | `className="bg-green-500/10"` |

## Recommendations

### 1. Immediate Actions
1. **Remove custom gradient classes** from all buttons
2. **Map custom background colors** to appropriate shadcn variants
3. **Replace inline Badge colors** with proper variants

### 2. Button Variant Mapping
```typescript
// Instead of custom colors, use these variants:
variant="default"     // Primary action buttons
variant="secondary"   // Secondary actions  
variant="outline"     // Bordered buttons
variant="ghost"       // Transparent hover buttons
variant="destructive" // Delete/danger actions
variant="link"        // Text-only buttons
```

### 3. Badge Variant Mapping
```typescript
// Standard shadcn badge variants:
variant="default"     // Primary badges
variant="secondary"   // Secondary badges
variant="outline"     // Bordered badges
variant="destructive" // Error/danger badges

// Consider removing custom variants (success, warning, info)
// Or properly implement them in the badge component
```

### 4. Theme-Based Approach
Instead of inline colors, consider using CSS variables for theming:
```css
/* In globals.css */
.badge-success {
  @apply bg-green-500/20 text-green-400 border-green-500/30;
}

.badge-warning {
  @apply bg-yellow-500/20 text-yellow-400 border-yellow-500/30;
}
```

### 5. Component Refactoring Priority
1. **High Priority** (Most visible/used):
   - `/app/demo/page.tsx` - Public facing demo page
   - `/components/okr-upload/OKRFileUpload.tsx` - Core feature
   - `/components/invitations/*` - User management flow

2. **Medium Priority**:
   - `/components/modals/*` - Form actions
   - `/components/manager/*` - Manager dashboard

3. **Low Priority**:
   - `/components/profile/*` - Profile pages
   - Alert components (separate refactor)

## Migration Strategy

### Phase 1: Core Components (Week 1)
- Update all Button components to use proper variants
- Remove gradient classes from buttons
- Test each change for visual regression

### Phase 2: Badge Standardization (Week 2)
- Map all custom badge colors to variants
- Update dynamic badge rendering functions
- Ensure consistency across status indicators

### Phase 3: Testing & Documentation (Week 3)
- Visual regression testing
- Update component documentation
- Create usage guidelines for developers

## Success Metrics
- ✅ 0 inline `bg-*` classes on Button components
- ✅ 0 gradient classes on interactive elements
- ✅ All badges use defined variants
- ✅ Consistent hover/focus states
- ✅ Improved maintainability

## Files Requiring Updates (Summary)
Total files with non-compliant buttons/badges: **23 files**

### Button Files (15)
1. `/app/demo/page.tsx`
2. `/components/okr-upload/OKRFileUpload.tsx`
3. `/app/profile/page.tsx`
4. `/components/modals/ActivityFormModal.tsx`
5. `/components/modals/InitiativeFormModal.tsx`
6. `/components/modals/ObjectiveFormModal.tsx`
7. `/components/manager/FallbackComponents.tsx`
8. `/components/manager/SecurityTestDashboard.tsx`
9. `/components/role-navigation.tsx`
10. `/components/app-layout.tsx`
11. `/app/admin/page.tsx`
12. `/app/profile/company/page.tsx`
13. `/components/nav-main.tsx`
14. `/components/objectives/ObjectivesView.tsx`
15. `/components/forms/ActivityManager/index.tsx`

### Badge Files (8)
1. `/components/invitations/ScheduledInvitations.tsx`
2. `/components/okr-upload/OKRImportHistory.tsx`
3. `/components/okr-dashboard.tsx`
4. `/components/invitations/InvitationTable.tsx`
5. `/components/RecentActivityFeed.tsx`
6. `/lib/performance/monitoring-dashboard.tsx`
7. `/components/invitations/RecentActivity.tsx`
8. `/app/ceo/page.tsx`

---

**Generated**: 2025-08-14
**Status**: Audit Complete - Awaiting Implementation