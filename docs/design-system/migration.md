# Component Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from legacy components to the new design system. The migration can be done incrementally without breaking existing functionality.

## Migration Strategy

### Recommended Approach

1. **Audit Phase:** Identify all component usage
2. **Priority Mapping:** Start with most-used components
3. **Incremental Migration:** Update one component type at a time
4. **Testing Phase:** Verify functionality after each migration
5. **Cleanup Phase:** Remove deprecated code

## Component Mapping

### Legacy to New Component Reference

| Legacy Component | New Component | Breaking Changes |
|-----------------|---------------|------------------|
| `<CustomButton>` | `<Button>` | Props renamed, new variants |
| `<Card>` (custom) | `<Card>` (ui) | Different prop structure |
| `<Modal>` | `<Dialog>` | New API, better accessibility |
| `<Dropdown>` | `<DropdownMenu>` | Radix-based, new props |
| `<Input>` (custom) | `<Input>` (ui) | Validation handling changed |
| `<Loading>` | `<Skeleton>` | Different animation approach |
| `<Alert>` (custom) | `<Alert>` (ui) | New variant names |
| `<Table>` (custom) | `<Table>` (ui) | Column definition changed |

## Migration Examples

### Button Migration

#### Before (Legacy)
```tsx
// Old implementation
import CustomButton from '@/components/CustomButton'

<CustomButton 
  type="primary"
  size="large"
  isLoading={loading}
  icon="plus"
  onClick={handleClick}
>
  Add Item
</CustomButton>
```

#### After (New Design System)
```tsx
// New implementation
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@radix-ui/react-icons'

<Button 
  variant="default"  // 'primary' → 'default'
  size="lg"          // 'large' → 'lg'
  loading={loading}  // 'isLoading' → 'loading'
  leftIcon={<PlusIcon />}  // icon prop → leftIcon with component
  onClick={handleClick}
>
  Add Item
</Button>
```

#### Migration Steps
1. Update import statement
2. Map `type` prop to `variant`
3. Map size values (`large` → `lg`, `small` → `sm`)
4. Change `isLoading` to `loading`
5. Replace string icons with icon components

---

### Card Migration

#### Before (Legacy)
```tsx
// Old card implementation
import { Card as CustomCard } from '@/components/CustomCard'

<CustomCard 
  title="Dashboard Stats"
  subtitle="Last 30 days"
  shadow="large"
  padding="20px"
>
  <div className="stats-content">
    {/* content */}
  </div>
</CustomCard>
```

#### After (New Design System)
```tsx
// New card implementation
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card'

<Card variant="elevated" padding="lg">
  <CardHeader>
    <CardTitle>Dashboard Stats</CardTitle>
    <CardDescription>Last 30 days</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="stats-content">
      {/* content */}
    </div>
  </CardContent>
</Card>
```

#### Migration Steps
1. Split single Card into composed parts
2. Move `title` → `CardTitle` component
3. Move `subtitle` → `CardDescription`
4. Map `shadow` prop to `variant`
5. Use standard padding sizes

---

### Modal to Dialog Migration

#### Before (Legacy)
```tsx
// Old modal implementation
import Modal from '@/components/Modal'

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Edit Initiative"
  size="medium"
  showCloseButton
>
  <form onSubmit={handleSubmit}>
    {/* form content */}
  </form>
</Modal>
```

#### After (New Design System)
```tsx
// New dialog implementation
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Edit Initiative</DialogTitle>
      <DialogDescription>
        Make changes to your initiative below.
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      {/* form content */}
      <DialogFooter>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

#### Migration Steps
1. Replace `Modal` with `Dialog`
2. Change `isOpen` → `open`
3. Change `onClose` → `onOpenChange`
4. Use composed structure with Header/Content/Footer
5. Apply size via className instead of prop

---

### Form Input Migration

#### Before (Legacy)
```tsx
// Old input implementation
import { FormInput } from '@/components/FormInput'

<FormInput
  label="Initiative Name"
  name="name"
  value={formData.name}
  onChange={handleChange}
  error={errors.name}
  required
  placeholder="Enter name"
  helpText="This will be visible to all team members"
/>
```

#### After (New Design System)
```tsx
// New input implementation with react-hook-form
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

<FormField
  control={form.control}
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        Initiative Name
        <span className="text-destructive ml-1">*</span>
      </FormLabel>
      <FormControl>
        <Input 
          placeholder="Enter name" 
          {...field} 
        />
      </FormControl>
      <FormDescription>
        This will be visible to all team members
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Migration Steps
1. Switch to react-hook-form integration
2. Use composed Form components
3. Move validation to Zod schema
4. Replace `helpText` with `FormDescription`
5. Error handling via `FormMessage`

---

## Data Table Migration

### Before (Legacy)
```tsx
// Old table implementation
import DataTable from '@/components/DataTable'

<DataTable
  data={initiatives}
  columns={[
    { key: 'title', label: 'Title', sortable: true },
    { key: 'status', label: 'Status', render: (val) => <Badge>{val}</Badge> },
    { key: 'progress', label: 'Progress', sortable: true },
  ]}
  onSort={handleSort}
  onRowClick={handleRowClick}
  loading={isLoading}
/>
```

### After (New Design System)
```tsx
// New table implementation with @tanstack/react-table
import { DataTable } from '@/components/ui/data-table'
import { columns } from './columns'

// Define columns separately
const columns: ColumnDef<Initiative>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge>{row.getValue('status')}</Badge>,
  },
  {
    accessorKey: 'progress',
    header: 'Progress',
    cell: ({ row }) => (
      <Progress value={row.getValue('progress')} className="w-[60px]" />
    ),
  },
]

// Use DataTable
<DataTable 
  columns={columns} 
  data={initiatives}
  loading={isLoading}
/>
```

---

## Style Migration

### Legacy CSS to Tailwind

#### Before
```css
/* legacy.css */
.custom-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 16px;
}

.custom-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}
```

#### After
```tsx
// Using Tailwind utilities
<div className="bg-white rounded-lg p-5 shadow-sm mb-4 hover:shadow-md transition-shadow">
  {/* content */}
</div>

// Or using new Card component
<Card className="mb-4">
  {/* content */}
</Card>
```

---

## Hook Migration

### Custom Hooks to SWR/React Query

#### Before
```tsx
// Old custom hook
import { useData } from '@/hooks/useData'

function Component() {
  const { data, loading, error, refetch } = useData('/api/initiatives')
  
  if (loading) return <Spinner />
  if (error) return <Error />
  
  return <div>{/* use data */}</div>
}
```

#### After
```tsx
// New SWR-based hook
import { useInitiatives } from '@/hooks/useInitiatives'

function Component() {
  const { initiatives, loading, error, mutate } = useInitiatives()
  
  if (loading) return <Skeleton />
  if (error) return <Alert variant="destructive">{error.message}</Alert>
  
  return <div>{/* use initiatives */}</div>
}
```

---

## Testing Migration

### Update Test Suites

#### Before
```tsx
// Old test
import { render, fireEvent } from '@testing-library/react'
import CustomButton from '@/components/CustomButton'

test('button click', () => {
  const handleClick = jest.fn()
  const { getByText } = render(
    <CustomButton onClick={handleClick}>Click me</CustomButton>
  )
  
  fireEvent.click(getByText('Click me'))
  expect(handleClick).toHaveBeenCalled()
})
```

#### After
```tsx
// New test
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

test('button click', async () => {
  const handleClick = jest.fn()
  const user = userEvent.setup()
  
  render(<Button onClick={handleClick}>Click me</Button>)
  
  await user.click(screen.getByRole('button', { name: /click me/i }))
  expect(handleClick).toHaveBeenCalled()
})
```

---

## Migration Checklist

### Pre-Migration
- [ ] Audit all component usage in the codebase
- [ ] Create migration priority list
- [ ] Set up new design system dependencies
- [ ] Review breaking changes documentation
- [ ] Create migration branch

### During Migration
- [ ] Update imports one component type at a time
- [ ] Map old props to new props
- [ ] Update styles to use Tailwind utilities
- [ ] Replace custom hooks with standard hooks
- [ ] Update tests for migrated components

### Post-Migration
- [ ] Run full test suite
- [ ] Visual regression testing
- [ ] Performance benchmarking
- [ ] Update documentation
- [ ] Remove deprecated components
- [ ] Clean up unused dependencies

---

## Common Issues and Solutions

### Issue: Styling Differences
**Problem:** New components look different than legacy ones
**Solution:** Use className prop to add custom styles or create wrapper components with specific styling

### Issue: Event Handler Changes
**Problem:** Event handler signatures have changed
**Solution:** Update handler functions to match new API, use adapter functions if needed

### Issue: Missing Features
**Problem:** Legacy component had features not in new component
**Solution:** Compose multiple new components or extend with custom wrapper

### Issue: TypeScript Errors
**Problem:** Type mismatches after migration
**Solution:** Update type definitions, use proper generics, check new component prop types

---

## Rollback Strategy

If issues arise during migration:

1. **Feature Flag Approach**
```tsx
const useNewDesignSystem = process.env.NEXT_PUBLIC_USE_NEW_DS === 'true'

const Button = useNewDesignSystem 
  ? require('@/components/ui/button').Button
  : require('@/components/legacy/Button').default
```

2. **Gradual Rollout**
- Keep both systems temporarily
- Use A/B testing for critical components
- Monitor error rates and user feedback

3. **Component Aliasing**
```tsx
// components/compat/index.ts
export { Button as LegacyButton } from '@/components/legacy/Button'
export { Button } from '@/components/ui/button'
```

---

## Support and Resources

### Documentation
- [Component API Reference](./components.md)
- [Design System Overview](./README.md)
- [Accessibility Guidelines](./accessibility.md)

### Tools
- Component Storybook: `npm run storybook`
- Migration Script: `npm run migrate:components`
- Deprecation Warnings: Enabled in development

### Getting Help
- Check migration examples in `/examples/migration/`
- Review test files for usage patterns
- Consult design system documentation

---

Last Updated: 2025-08-16