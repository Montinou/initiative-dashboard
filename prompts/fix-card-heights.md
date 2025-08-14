# Fix Card Height Issues in Dashboard

## Problem
Cards in the objectives grid have inconsistent heights, creating an unprofessional appearance.

## Current Issues
1. Cards expand based on content
2. No minimum height constraint
3. Misaligned grid items
4. Poor mobile stacking

## Solution Requirements

### Grid Container
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards here */}
</div>
```

### Card Structure
```tsx
<Card className="glassmorphic-card flex flex-col min-h-[200px]">
  <CardHeader className="pb-3">
    {/* Fixed height header content */}
  </CardHeader>
  <CardContent className="flex-1 flex flex-col">
    {/* Flexible content that expands */}
  </CardContent>
  <CardFooter className="pt-3">
    {/* Fixed height footer if needed */}
  </CardFooter>
</Card>
```

## Key Classes to Apply
- `min-h-[200px]` - Minimum height for all cards
- `flex flex-col` - Flex container for card
- `flex-1` - Make content area expand
- `h-full` - Full height for inner containers

## Example Fixed Component

```tsx
export function ObjectiveCard({ data }: { data: Objective }) {
  return (
    <Card className="glassmorphic-card flex flex-col min-h-[200px] hover:border-primary/30 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-white line-clamp-2">
            {data.title}
          </CardTitle>
          <Badge variant={data.status}>
            {data.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between">
        <p className="text-white/60 text-sm line-clamp-3">
          {data.description}
        </p>
        
        <div className="mt-4 space-y-2">
          <Progress value={data.progress} className="h-2" />
          <span className="text-xs text-white/40">
            {data.progress}% complete
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Checklist
- [ ] All cards have `min-h-[200px]` or similar
- [ ] Cards use `flex flex-col` layout
- [ ] Content areas have `flex-1`
- [ ] Text content uses `line-clamp-*` for truncation
- [ ] Grid gaps are consistent (`gap-4`)
- [ ] Responsive breakpoints are set correctly
