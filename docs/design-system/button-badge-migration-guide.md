# Button & Badge Migration Guide

## Quick Reference: Before & After

### 🔴 Buttons - Common Patterns to Fix

#### Pattern 1: Gradient Buttons
```tsx
// ❌ BEFORE - Custom gradient classes
<Button className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white">
  Get Started
</Button>

// ✅ AFTER - Use default variant
<Button variant="default">
  Get Started
</Button>
```

#### Pattern 2: Custom Color Buttons
```tsx
// ❌ BEFORE - Inline background colors
<Button className="bg-green-600 hover:bg-green-700">
  Save Changes
</Button>

// ✅ AFTER - Use appropriate variant
<Button variant="default">
  Save Changes
</Button>

// OR for success actions, consider:
<Button variant="default" className="bg-green-600 hover:bg-green-600/90">
  Save Changes
</Button>
```

#### Pattern 3: Ghost Buttons with Custom Hover
```tsx
// ❌ BEFORE - Custom hover states
<Button variant="ghost" className="text-white hover:bg-white/10">
  <ArrowLeft className="h-4 w-4 mr-2" />
  Back
</Button>

// ✅ AFTER - Use ghost variant properly
<Button variant="ghost">
  <ArrowLeft className="h-4 w-4 mr-2" />
  Back
</Button>
```

#### Pattern 4: Outline Buttons with Custom Colors
```tsx
// ❌ BEFORE - Custom border and hover
<Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
  View Details
</Button>

// ✅ AFTER - Use outline variant
<Button variant="outline">
  View Details
</Button>
```

### 🔴 Badges - Common Patterns to Fix

#### Pattern 1: Status Badges with Custom Colors
```tsx
// ❌ BEFORE - Inline color classes
<Badge className="bg-green-500/20 text-green-400 border-green-500/30">
  Completed
</Badge>

// ✅ AFTER - Use success variant (if available) or default
<Badge variant="success">
  Completed
</Badge>

// OR if success variant not available:
<Badge variant="default" className="bg-green-100 text-green-800">
  Completed
</Badge>
```

#### Pattern 2: Processing/Info Badges
```tsx
// ❌ BEFORE
<Badge className="bg-blue-100 text-blue-800">
  Processing
</Badge>

// ✅ AFTER
<Badge variant="secondary">
  Processing
</Badge>
```

#### Pattern 3: Error/Warning Badges
```tsx
// ❌ BEFORE
<Badge className="bg-red-500/20 text-red-400 border-red-500/30">
  Failed
</Badge>

// ✅ AFTER
<Badge variant="destructive">
  Failed
</Badge>
```

## File-Specific Migration Instructions

### 1. `/app/demo/page.tsx`
```tsx
// Line 142 & 170
// ❌ REMOVE
<Button className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white">

// ✅ REPLACE WITH
<Button variant="default" size="lg">
```

### 2. `/components/okr-upload/OKRFileUpload.tsx`
```tsx
// Line 327
// ❌ REMOVE
<Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-white">

// ✅ REPLACE WITH
<Button variant="default">
```

### 3. `/components/modals/ActivityFormModal.tsx`
```tsx
// Line 309
// ❌ REMOVE
<Button className="bg-green-600 hover:bg-green-700">

// ✅ REPLACE WITH
<Button variant="default">
```

### 4. `/components/invitations/ScheduledInvitations.tsx`
```tsx
// Line 302
// ❌ REMOVE
<Badge className="bg-blue-100 text-blue-800">Processing</Badge>

// ✅ REPLACE WITH
<Badge variant="secondary">Processing</Badge>

// Line 303
// ❌ REMOVE
<Badge variant="success">Sent</Badge>

// ✅ REPLACE WITH
<Badge variant="default">Sent</Badge>
```

### 5. `/components/okr-upload/OKRImportHistory.tsx`
```tsx
// Create a mapping function for status badges
const getStatusBadge = (status: string) => {
  const statusMap = {
    'completed': <Badge variant="default">Completed</Badge>,
    'processing': <Badge variant="secondary">Processing</Badge>,
    'failed': <Badge variant="destructive">Failed</Badge>,
    'partial': <Badge variant="outline">Partial Success</Badge>
  }
  return statusMap[status] || <Badge variant="outline">{status}</Badge>
}
```

## Recommended Button Variant Usage

### Primary Actions
```tsx
// Save, Submit, Create, Add
<Button variant="default">
  Save Changes
</Button>
```

### Secondary Actions
```tsx
// Cancel, Close, Back
<Button variant="secondary">
  Cancel
</Button>
```

### Tertiary/Ghost Actions
```tsx
// Navigation, subtle actions
<Button variant="ghost">
  View More
</Button>
```

### Destructive Actions
```tsx
// Delete, Remove, Destroy
<Button variant="destructive">
  Delete Item
</Button>
```

### Outline Actions
```tsx
// Alternative actions, filters
<Button variant="outline">
  Filter Results
</Button>
```

## Recommended Badge Variant Usage

### Status Indicators
```tsx
// Active/Success
<Badge variant="default">Active</Badge>

// Pending/Processing
<Badge variant="secondary">Pending</Badge>

// Error/Failed
<Badge variant="destructive">Failed</Badge>

// Neutral/Info
<Badge variant="outline">Draft</Badge>
```

## Testing Checklist

After migrating each component:

- [ ] Visual appearance matches design system
- [ ] Hover states work correctly
- [ ] Focus states are visible
- [ ] Disabled states are styled properly
- [ ] Loading states (if applicable) work
- [ ] Dark mode compatibility
- [ ] Mobile touch targets are adequate (min 44x44px)

## CSS Variables to Update

If keeping custom colors, define them in `globals.css`:

```css
@layer base {
  :root {
    --success: 142 71% 45%;
    --success-foreground: 0 0% 98%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 98%;
    --info: 199 89% 48%;
    --info-foreground: 0 0% 98%;
  }
}
```

Then extend button/badge variants in their respective component files.

## Migration Script Helper

Use this regex for VS Code Find & Replace:

### Find Gradient Buttons
```regex
className="[^"]*bg-gradient-to-[^"]*"
```

### Find Custom Background Buttons
```regex
className="[^"]*bg-(red|green|blue|yellow|purple|indigo)-\d{3}[^"]*"
```

### Find Custom Badge Colors
```regex
<Badge\s+className="[^"]*bg-[^"]*"
```

## Priority Migration Order

### Week 1 - High Impact
1. `/app/demo/page.tsx` - Public facing
2. `/components/okr-upload/OKRFileUpload.tsx` - Core feature
3. `/components/invitations/*.tsx` - User management

### Week 2 - Medium Impact
4. `/components/modals/*.tsx` - User interactions
5. `/components/manager/*.tsx` - Dashboard components
6. `/components/okr-dashboard.tsx` - Main dashboard

### Week 3 - Low Impact
7. `/app/profile/*.tsx` - Profile pages
8. `/components/RecentActivityFeed.tsx` - Activity feeds
9. Remaining components

## Validation Commands

After migration, run:

```bash
# Check for remaining custom classes
grep -r "bg-gradient-to-" --include="*.tsx" .
grep -r "bg-\(red\|green\|blue\|yellow\|purple\)-[0-9]" --include="*.tsx" .

# Run type checking
npm run type-check

# Run tests
npm test

# Visual regression tests
npm run test:visual
```

## Support & Questions

For questions about specific migration cases:
1. Check the shadcn/ui documentation
2. Review the design system docs at `/docs/design-system/`
3. Test in Storybook (if available)
4. Ask in the team channel

---

**Version**: 1.0.0  
**Last Updated**: 2025-08-14  
**Status**: Ready for Implementation