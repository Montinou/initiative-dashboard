# Component Documentation

This document provides comprehensive API reference and usage guidelines for all components in the Initiative Dashboard Design System.

## Table of Contents

- [Core Components](#core-components)
- [Form Components](#form-components)
- [Layout Components](#layout-components)
- [Data Display Components](#data-display-components)
- [Feedback Components](#feedback-components)
- [Navigation Components](#navigation-components)
- [Overlay Components](#overlay-components)
- [Utility Components](#utility-components)

---

## Core Components

### Button

Enhanced button component with glassmorphism variants and comprehensive accessibility features.

#### API Reference

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 
           'glass' | 'glass-ghost' | 'glass-outline' | 'glass-destructive' | 'glass-success'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'touch' | 'xs' | 'xl'
  effect?: 'none' | 'glow' | 'glow-strong' | 'elevated'
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  animated?: boolean
}
```

#### Variants

**Standard Variants**
- `default`: Primary brand button with solid background
- `destructive`: Red button for dangerous actions
- `outline`: Transparent background with border
- `secondary`: Muted background color
- `ghost`: Transparent background, shows background on hover
- `link`: Styled like a text link

**Glass Variants**
- `glass`: Primary glassmorphic button with blur effect
- `glass-ghost`: Subtle glass effect with transparent background
- `glass-outline`: Glass effect with prominent border
- `glass-destructive`: Red glass button for dangerous actions
- `glass-success`: Green glass button for positive actions

#### Usage Examples

```tsx
// Basic usage
<Button>Click me</Button>

// With variants and icons
<Button variant="glass" size="lg" leftIcon={<PlusIcon />}>
  Add Item
</Button>

// Loading state
<Button loading loadingText="Saving...">
  Save Changes
</Button>

// With effects
<Button variant="glass" effect="glow" rightIcon={<ArrowRightIcon />}>
  Continue
</Button>
```

#### Accessibility Features

- Minimum 44px touch target on mobile
- Loading state announced to screen readers
- Proper ARIA attributes for disabled states
- Keyboard navigation support
- Focus indicators with 2px outline

---

### Card

Flexible container component with glassmorphism variants and customizable sections.

#### API Reference

```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline' | 'ghost' | 
           'glass' | 'glass-interactive' | 'glass-subtle' | 'glass-strong'
  padding?: 'none' | 'sm' | 'default' | 'lg'
  size?: 'default' | 'sm' | 'lg' | 'xl'
  effect?: 'none' | 'glow' | 'glow-strong' | 'elevated' | 'hover'
  as?: React.ElementType
  interactive?: boolean
  animated?: boolean
}
```

#### Sub-components

- `CardHeader`: Header section with title and description
- `CardTitle`: Semantic heading with configurable element
- `CardDescription`: Subtitle or description text
- `CardContent`: Main content area
- `CardFooter`: Actions or additional content

#### Usage Examples

```tsx
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Dashboard Overview</CardTitle>
    <CardDescription>Key metrics and insights</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>

// Interactive glass card
<Card 
  variant="glass-interactive" 
  effect="hover"
  onClick={() => navigate('/details')}
>
  <CardContent>
    <h3>Clickable Card</h3>
  </CardContent>
</Card>

// Custom card with semantic heading
<Card variant="glass-subtle">
  <CardHeader>
    <CardTitle as="h2">Section Title</CardTitle>
  </CardHeader>
</Card>
```

#### Glass Variants

- `glass`: Standard glass effect with moderate blur
- `glass-interactive`: Hover effects for clickable cards
- `glass-subtle`: Light glass effect with minimal blur
- `glass-strong`: Strong glass effect with heavy blur

---

### Input

Enhanced form input with glassmorphism support and validation states.

#### API Reference

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'glass'
  error?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
}
```

#### Usage Examples

```tsx
// Basic input
<Input placeholder="Enter your name" />

// Glass variant with icons
<Input 
  variant="glass"
  leftIcon={<SearchIcon />}
  placeholder="Search..."
/>

// Error state
<Input 
  error 
  value={formData.email}
  onChange={handleEmailChange}
  aria-describedby="email-error"
/>
{error && (
  <p id="email-error" className="text-destructive text-sm">
    Please enter a valid email address
  </p>
)}

// Loading state
<Input loading placeholder="Loading..." disabled />
```

---

## Form Components

### Form

Comprehensive form component built on react-hook-form with Zod validation.

#### API Reference

```tsx
// Based on react-hook-form's FormProvider
interface FormProps {
  children: React.ReactNode
  // Inherits all FormProvider props
}

interface FormFieldProps {
  control: Control
  name: string
  render: ({ field, fieldState, formState }) => React.ReactElement
}

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {}
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {}
interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {}
```

#### Usage Examples

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18 years old'),
})

function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      age: 18,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormDescription>
                This will be your public display name
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  variant="glass"
                  type="email" 
                  placeholder="Enter email" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" variant="glass">
          Submit
        </Button>
      </form>
    </Form>
  )
}
```

---

### Select

Enhanced select component with search functionality and glassmorphism support.

#### API Reference

```tsx
interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  disabled?: boolean
  name?: string
  required?: boolean
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  disabled?: boolean
  children: React.ReactNode
}
```

#### Usage Examples

```tsx
// Basic select
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3" disabled>Option 3 (Disabled)</SelectItem>
  </SelectContent>
</Select>

// In a form with glass styling
<FormField
  control={form.control}
  name="priority"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Priority Level</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger className="glass-input">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="glassmorphic-dropdown">
          <SelectItem value="low">Low Priority</SelectItem>
          <SelectItem value="medium">Medium Priority</SelectItem>
          <SelectItem value="high">High Priority</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Layout Components

### Sidebar

Responsive sidebar component with collapsible navigation and glassmorphism support.

#### API Reference

```tsx
interface SidebarProps {
  variant?: 'sidebar' | 'floating' | 'inset'
  side?: 'left' | 'right'
  collapsible?: 'offcanvas' | 'icon' | 'none'
  className?: string
  children?: React.ReactNode
}
```

#### Sub-components

- `SidebarHeader`: Header section with logo/title
- `SidebarContent`: Main navigation content
- `SidebarFooter`: Footer section for user info/actions
- `SidebarGroup`: Groups related navigation items
- `SidebarMenu`: Menu container
- `SidebarMenuItem`: Individual menu item
- `SidebarMenuButton`: Clickable menu button
- `SidebarTrigger`: Button to toggle sidebar

#### Usage Examples

```tsx
<Sidebar collapsible="icon">
  <SidebarHeader>
    <h2>App Name</h2>
  </SidebarHeader>
  
  <SidebarContent>
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/dashboard">
              <DashboardIcon />
              Dashboard
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/initiatives">
              <FolderIcon />
              Initiatives
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
  
  <SidebarFooter>
    <UserProfile />
  </SidebarFooter>
</Sidebar>
```

---

## Data Display Components

### Table

Enhanced table component with sorting, filtering, and bulk operations.

#### API Reference

```tsx
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}
interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}
interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {}
```

#### Usage Examples

```tsx
// Basic table
<Table>
  <TableCaption>A list of recent initiatives</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Title</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Progress</TableHead>
      <TableHead>Due Date</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {initiatives.map((initiative) => (
      <TableRow key={initiative.id}>
        <TableCell className="font-medium">{initiative.title}</TableCell>
        <TableCell>
          <Badge variant={getStatusVariant(initiative.status)}>
            {initiative.status}
          </Badge>
        </TableCell>
        <TableCell>
          <Progress value={initiative.progress} className="w-20" />
        </TableCell>
        <TableCell>{formatDate(initiative.dueDate)}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### Badge

Status indicator component with semantic colors and glassmorphism variants.

#### API Reference

```tsx
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 
           'success' | 'warning' | 'info' | 'glass'
}
```

#### Usage Examples

```tsx
// Status badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Overdue</Badge>

// Glass variant
<Badge variant="glass">Premium</Badge>

// Custom styling
<Badge className="glassmorphic-badge">
  Custom Glass Badge
</Badge>
```

---

### Progress

Progress indicator with multiple visual styles and animation support.

#### API Reference

```tsx
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}
```

#### Usage Examples

```tsx
// Basic progress
<Progress value={75} className="w-full" />

// Colored variants
<Progress value={100} variant="success" />
<Progress value={25} variant="warning" />
<Progress value={10} variant="destructive" />

// Different sizes
<Progress value={50} size="sm" />
<Progress value={50} size="lg" />

// With label
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Progress</span>
    <span>75%</span>
  </div>
  <Progress value={75} />
</div>
```

---

## Feedback Components

### Alert

Contextual feedback component with multiple severity levels and dismissible options.

#### API Reference

```tsx
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  dismissible?: boolean
  onDismiss?: () => void
}
```

#### Sub-components

- `AlertTitle`: Alert heading
- `AlertDescription`: Alert content/message

#### Usage Examples

```tsx
// Basic alert
<Alert>
  <InfoIcon className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    This is an informational alert message.
  </AlertDescription>
</Alert>

// Success alert
<Alert variant="success">
  <CheckCircleIcon className="h-4 w-4" />
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>
    Your changes have been saved successfully.
  </AlertDescription>
</Alert>

// Dismissible alert
<Alert variant="warning" dismissible onDismiss={() => setShowAlert(false)}>
  <WarningIcon className="h-4 w-4" />
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>
    Please review your input before proceeding.
  </AlertDescription>
</Alert>
```

---

### Toast

Temporary notification component with auto-dismiss and action support.

#### API Reference

```tsx
interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  action?: React.ReactNode
  duration?: number
}

// Usage with useToast hook
const { toast } = useToast()

toast({
  title: "Success",
  description: "Operation completed successfully",
  variant: "success",
  duration: 3000,
})
```

#### Usage Examples

```tsx
import { useToast } from '@/hooks/use-toast'

function MyComponent() {
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      await saveData()
      toast({
        title: "Success",
        description: "Data saved successfully",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save data",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        ),
      })
    }
  }

  return <Button onClick={handleSave}>Save</Button>
}

// Add Toaster to your layout
function Layout() {
  return (
    <div>
      {children}
      <Toaster />
    </div>
  )
}
```

---

## Navigation Components

### Breadcrumb

Navigation aid showing the current page's location within a navigational hierarchy.

#### API Reference

```tsx
interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {}
interface BreadcrumbListProps extends React.HTMLAttributes<HTMLOListElement> {}
interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLIElement> {}
interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
}
interface BreadcrumbPageProps extends React.HTMLAttributes<HTMLSpanElement> {}
interface BreadcrumbSeparatorProps extends React.HTMLAttributes<HTMLLIElement> {}
interface BreadcrumbEllipsisProps extends React.HTMLAttributes<HTMLSpanElement> {}
```

#### Usage Examples

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Initiatives</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>

// With ellipsis for long paths
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbEllipsis />
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/initiatives">Initiatives</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Create New</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

---

### Tabs

Tabbed interface component for organizing content into multiple panels.

#### API Reference

```tsx
interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  activationMode?: 'automatic' | 'manual'
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  asChild?: boolean
}
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}
```

#### Usage Examples

```tsx
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>General information and key metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Overview content goes here...</p>
      </CardContent>
    </Card>
  </TabsContent>
  
  <TabsContent value="analytics" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
        <CardDescription>Detailed analytics and reports</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Analytics content goes here...</p>
      </CardContent>
    </Card>
  </TabsContent>
  
  <TabsContent value="settings" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Configure your preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Settings content goes here...</p>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

## Overlay Components

### Dialog

Modal dialog component with accessibility features and glassmorphism support.

#### API Reference

```tsx
interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onOpenAutoFocus?: (event: Event) => void
  onCloseAutoFocus?: (event: Event) => void
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onPointerDownOutside?: (event: PointerEvent) => void
  onInteractOutside?: (event: Event) => void
}
```

#### Sub-components

- `DialogHeader`: Header section
- `DialogTitle`: Dialog title (required for accessibility)
- `DialogDescription`: Dialog description
- `DialogFooter`: Actions section
- `DialogClose`: Close button

#### Usage Examples

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open Dialog</Button>
  </DialogTrigger>
  
  <DialogContent className="glassmorphic-modal">
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete this initiative? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Controlled dialog
function ControlledDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open Controlled Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Controlled Dialog</DialogTitle>
        </DialogHeader>
        <p>This dialog is controlled by state.</p>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

### Sheet

Side panel component for additional content or actions.

#### API Reference

```tsx
interface SheetProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

interface SheetTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left'
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full'
}
```

#### Usage Examples

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open Sheet</Button>
  </SheetTrigger>
  
  <SheetContent side="right" className="w-96">
    <SheetHeader>
      <SheetTitle>Initiative Details</SheetTitle>
      <SheetDescription>
        View and edit initiative information
      </SheetDescription>
    </SheetHeader>
    
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" value="Initiative Title" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value="Initiative description..." />
      </div>
    </div>
    
    <SheetFooter>
      <SheetClose asChild>
        <Button variant="outline">Cancel</Button>
      </SheetClose>
      <Button>Save Changes</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

---

## Utility Components

### Skeleton

Loading placeholder component with animation support.

#### API Reference

```tsx
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
}
```

#### Usage Examples

```tsx
// Basic skeleton
<Skeleton className="h-4 w-64" />

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-32" />
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  </CardContent>
</Card>

// Profile skeleton
<div className="flex items-center space-x-4">
  <Skeleton variant="circular" className="h-12 w-12" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-3 w-24" />
  </div>
</div>
```

---

### Avatar

User profile image component with fallback support.

#### API Reference

```tsx
interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {}
interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}
interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  delayMs?: number
}
```

#### Usage Examples

```tsx
// Basic avatar
<Avatar>
  <AvatarImage src="/avatars/01.png" alt="User Avatar" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>

// With size variants
<Avatar className="h-8 w-8">
  <AvatarImage src="/avatars/02.png" />
  <AvatarFallback>AB</AvatarFallback>
</Avatar>

<Avatar className="h-16 w-16">
  <AvatarImage src="/avatars/03.png" />
  <AvatarFallback>CD</AvatarFallback>
</Avatar>

// Fallback with delay
<Avatar>
  <AvatarImage src="/broken-image.png" />
  <AvatarFallback delayMs={600}>CN</AvatarFallback>
</Avatar>
```

---

## Accessibility Guidelines

### General Principles

1. **Keyboard Navigation**: All interactive components support keyboard navigation
2. **Screen Reader Support**: Proper ARIA labels and semantic HTML
3. **Color Contrast**: All color combinations meet WCAG 2.1 AA standards
4. **Touch Targets**: Minimum 44px for mobile interfaces
5. **Focus Management**: Visible focus indicators and logical focus flow

### Implementation Examples

```tsx
// Proper labeling
<Button aria-label="Delete initiative" variant="destructive">
  <TrashIcon className="h-4 w-4" />
</Button>

// Form accessibility
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email Address</FormLabel>
      <FormControl>
        <Input 
          type="email"
          aria-describedby="email-description email-error"
          {...field} 
        />
      </FormControl>
      <FormDescription id="email-description">
        We'll use this to send you notifications
      </FormDescription>
      <FormMessage id="email-error" />
    </FormItem>
  )}
/>

// Loading states
<Button loading aria-busy="true">
  <span className="sr-only">Saving data, please wait</span>
  Save
</Button>

// Skip links
<a 
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded"
>
  Skip to main content
</a>
```

---

## Performance Considerations

### Bundle Size Impact

| Component Category | Base Size | Glass Extensions | Total |
|-------------------|-----------|------------------|-------|
| Core Components | ~15KB | +3KB | ~18KB |
| Form Components | ~12KB | +2KB | ~14KB |
| Layout Components | ~8KB | +1KB | ~9KB |
| Data Display | ~10KB | +2KB | ~12KB |
| Feedback | ~6KB | +1KB | ~7KB |
| Navigation | ~5KB | +1KB | ~6KB |
| Overlay | ~8KB | +2KB | ~10KB |
| Utility | ~4KB | +1KB | ~5KB |

### Optimization Strategies

1. **Tree Shaking**: Import only needed components
2. **Lazy Loading**: Load heavy components on demand
3. **Code Splitting**: Separate vendor and application code
4. **CSS Optimization**: Use CSS variables for runtime theming

```tsx
// Optimized imports
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// Instead of
import * from '@/components/ui'

// Lazy loading
const DataTable = lazy(() => import('@/components/ui/data-table'))
const ChartComponent = lazy(() => import('@/components/charts/line-chart'))

function Dashboard() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <DataTable data={data} />
      <ChartComponent data={chartData} />
    </Suspense>
  )
}
```

---

## Testing Guidelines

### Component Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  test('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  test('applies glass variant classes', () => {
    render(<Button variant="glass">Glass Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('glass-button')
  })

  test('handles loading state', () => {
    render(<Button loading>Loading Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  test('supports keyboard interaction', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<Button onClick={handleClick}>Clickable</Button>)
    
    const button = screen.getByRole('button')
    await user.tab() // Focus the button
    await user.keyboard('{Enter}') // Activate with Enter
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Accessibility Testing

```tsx
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('Button has no accessibility violations', async () => {
  const { container } = render(
    <Button variant="glass" aria-label="Save document">
      Save
    </Button>
  )
  
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

**Component Documentation Version**: 2.0.0  
**Last Updated**: August 14, 2025  
**Maintained By**: UI/UX Development Team

For additional examples and advanced usage patterns, see [Examples & Patterns](./examples.md).