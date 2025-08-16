# Design System Usage Examples

## Real-World Implementation Patterns

This document provides practical examples of how to use the design system components in common scenarios across the Initiative Dashboard application.

## Dashboard Layouts

### CEO Dashboard Example

```tsx
// app/[tenant]/ceo/dashboard/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CEOMetricsGrid } from '@/components/ceo/CEOMetricsGrid'
import { ExecutiveCharts } from '@/components/ceo/ExecutiveCharts'
import { RiskDashboard } from '@/components/ceo/RiskDashboard'

export default function CEODashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Executive Dashboard</h1>
        <DateRangePicker />
      </div>
      
      {/* Metrics Grid */}
      <CEOMetricsGrid />
      
      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="objectives">Objectives</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ExecutiveCharts />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Stats content */}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="risks">
          <RiskDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Manager Dashboard with Glassmorphism

```tsx
// components/manager/ManagerDashboard.tsx
import { GlassCard } from '@/components/ui/glass-card'
import { useManagerViews } from '@/hooks/useManagerViews'

export function ManagerDashboard({ areaId }: { areaId: string }) {
  const { dashboardData, loading } = useManagerViews({ area_id: areaId })
  
  if (loading) {
    return <DashboardSkeleton />
  }
  
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Team Overview Card */}
      <GlassCard 
        variant="colored" 
        blur="xl" 
        className="lg:col-span-2"
      >
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>
            {dashboardData.team_members.length} team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamPerformanceMatrix data={dashboardData.team_members} />
        </CardContent>
      </GlassCard>
      
      {/* Quick Actions */}
      <GlassCard variant="light" blur="lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full" variant="outline">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Initiative
          </Button>
          <Button className="w-full" variant="outline">
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Assign Activity
          </Button>
          <Button className="w-full" variant="outline">
            <FileTextIcon className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </CardContent>
      </GlassCard>
    </div>
  )
}
```

## Form Patterns

### Multi-Step Initiative Form

```tsx
// components/forms/InitiativeForm/MultiStepForm.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  area_id: z.string().uuid('Please select an area'),
  objective_ids: z.array(z.string()).min(1, 'Select at least one objective'),
  start_date: z.date(),
  due_date: z.date(),
})

export function MultiStepInitiativeForm() {
  const [step, setStep] = useState(1)
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      area_id: '',
      objective_ids: [],
      start_date: new Date(),
      due_date: new Date(),
    }
  })
  
  const nextStep = () => setStep(prev => Math.min(prev + 1, 3))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Step Indicator */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-2 mx-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Provide the basic details for your initiative
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initiative Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter initiative title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the initiative"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}
        
        {/* Step 2: Assignment */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
              <CardDescription>
                Assign the initiative to areas and objectives
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="area_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="area1">Sales</SelectItem>
                        <SelectItem value="area2">Marketing</SelectItem>
                        <SelectItem value="area3">Operations</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="objective_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objectives</FormLabel>
                    <FormDescription>
                      Select objectives this initiative supports
                    </FormDescription>
                    {/* Multi-select implementation */}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}
        
        {/* Step 3: Timeline */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Set the timeline for your initiative
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value}
                          onDateChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value}
                          onDateChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
          >
            Previous
          </Button>
          
          {step < 3 ? (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="submit" loading={form.formState.isSubmitting}>
              Create Initiative
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
```

## Data Display Patterns

### Initiative Card with Actions

```tsx
// components/dashboard/InitiativeCardWithActions.tsx
export function InitiativeCardWithActions({ initiative }) {
  const [isEditing, setIsEditing] = useState(false)
  const { updateInitiative, deleteInitiative } = useInitiatives()
  
  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="line-clamp-1">
              {initiative.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(initiative.status)}>
                {initiative.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {initiative.area_name}
              </span>
            </div>
          </div>
          
          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <EditIcon className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileTextIcon className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteInitiative(initiative.id)}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{initiative.progress}%</span>
          </div>
          <Progress value={initiative.progress} className="h-2" />
        </div>
        
        {/* Activities Summary */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <CheckCircleIcon className="h-4 w-4" />
            <span>
              {initiative.completed_activities}/{initiative.total_activities} activities
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{formatDate(initiative.due_date)}</span>
          </div>
        </div>
      </CardContent>
      
      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <InitiativeForm
            initiative={initiative}
            onSuccess={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
```

## Loading States

### Skeleton Loading Pattern

```tsx
// components/dashboard/InitiativesSkeleton.tsx
export function InitiativesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-2 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

## Error Handling

### Error Boundary with Retry

```tsx
// components/ErrorBoundaryWithRetry.tsx
export function ErrorBoundaryWithRetry({ children }) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error.message || 'An unexpected error occurred'}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={resetErrorBoundary}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
```

## Mobile Responsive Patterns

### Mobile-First Navigation

```tsx
// components/MobileResponsiveNav.tsx
export function MobileResponsiveNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/initiatives">Initiatives</Link>
        <Link href="/objectives">Objectives</Link>
        <Link href="/reports">Reports</Link>
      </nav>
      
      {/* Mobile Navigation */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <MenuIcon className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-4 mt-6">
            <Link 
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg"
            >
              Dashboard
            </Link>
            <Link 
              href="/initiatives"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg"
            >
              Initiatives
            </Link>
            <Link 
              href="/objectives"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg"
            >
              Objectives
            </Link>
            <Link 
              href="/reports"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg"
            >
              Reports
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

## Tenant-Specific Theming

### Dynamic Theme Application

```tsx
// components/TenantThemedDashboard.tsx
import { useTenant } from '@/hooks/useTenant'

export function TenantThemedDashboard() {
  const { tenant } = useTenant()
  
  const themeClasses = {
    siga: 'bg-gradient-to-br from-siga-green/5 to-siga-yellow/5',
    fema: 'bg-gradient-to-br from-fema-blue/5 to-fema-yellow/5',
    stratix: 'bg-gradient-to-br from-purple-500/5 to-blue-500/5'
  }
  
  return (
    <div className={cn(
      "min-h-screen",
      themeClasses[tenant.subdomain] || themeClasses.stratix
    )}>
      {/* Themed Header */}
      <header className={cn(
        "border-b",
        tenant.subdomain === 'siga' && "border-siga-green/20",
        tenant.subdomain === 'fema' && "border-fema-blue/20",
        tenant.subdomain === 'stratix' && "border-purple-500/20"
      )}>
        {/* Header content */}
      </header>
      
      {/* Themed Cards */}
      <div className="grid gap-4 p-6">
        <Card className={cn(
          "hover:shadow-lg transition-all",
          tenant.subdomain === 'siga' && "hover:shadow-siga-green/20",
          tenant.subdomain === 'fema' && "hover:shadow-fema-blue/20"
        )}>
          {/* Card content */}
        </Card>
      </div>
    </div>
  )
}
```

## Accessibility Examples

### Accessible Form with ARIA

```tsx
// components/AccessibleForm.tsx
export function AccessibleForm() {
  const [errors, setErrors] = useState({})
  
  return (
    <form 
      aria-label="Create new initiative"
      aria-describedby="form-description"
    >
      <div id="form-description" className="sr-only">
        Fill out this form to create a new initiative. All fields marked with an asterisk are required.
      </div>
      
      <div className="space-y-4">
        <div>
          <label 
            htmlFor="title"
            className="block text-sm font-medium mb-1"
          >
            Initiative Title
            <span aria-label="required" className="text-destructive ml-1">*</span>
          </label>
          <Input
            id="title"
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "title-error" : undefined}
            placeholder="Enter initiative title"
          />
          {errors.title && (
            <p id="title-error" role="alert" className="text-sm text-destructive mt-1">
              {errors.title}
            </p>
          )}
        </div>
        
        <fieldset>
          <legend className="text-sm font-medium mb-2">
            Priority Level
          </legend>
          <RadioGroup aria-required="true">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="high" id="high" />
              <label htmlFor="high">High Priority</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="medium" />
              <label htmlFor="medium">Medium Priority</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="low" id="low" />
              <label htmlFor="low">Low Priority</label>
            </div>
          </RadioGroup>
        </fieldset>
        
        <Button type="submit" aria-busy={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Initiative"}
        </Button>
      </div>
    </form>
  )
}
```

---

Last Updated: 2025-08-16