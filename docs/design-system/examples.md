# Design System Examples & Patterns

This document provides comprehensive examples and real-world usage patterns for the Initiative Dashboard Design System components and glassmorphism effects.

## Table of Contents

- [Dashboard Layouts](#dashboard-layouts)
- [Form Patterns](#form-patterns)
- [Data Visualization](#data-visualization)
- [Navigation Patterns](#navigation-patterns)
- [Interactive Components](#interactive-components)
- [Tenant-Specific Implementations](#tenant-specific-implementations)
- [Performance Optimizations](#performance-optimizations)
- [Accessibility Patterns](#accessibility-patterns)

---

## Dashboard Layouts

### Executive Dashboard

A comprehensive dashboard layout for executives with KPI cards, charts, and recent activity feeds.

```tsx
function ExecutiveDashboard() {
  const { data: metrics } = useExecutiveMetrics()
  const { data: activities } = useRecentActivities()
  const { theme } = useTheme()
  
  const useGlass = theme.tenant !== 'default'

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Glass Cards */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12">
        {useGlass && (
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
        )}
        
        <div className="relative container mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Strategic overview and key performance indicators
            </p>
          </div>
          
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {metrics?.kpis.map((kpi) => (
              <Card 
                key={kpi.id}
                variant={useGlass ? "glass-subtle" : "default"}
                effect={useGlass ? "hover" : "none"}
                className="p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                    <p className={cn(
                      "text-xs mt-1 flex items-center",
                      kpi.trend === 'up' ? "text-success" : 
                      kpi.trend === 'down' ? "text-destructive" : 
                      "text-muted-foreground"
                    )}>
                      {kpi.trend === 'up' && <TrendingUpIcon className="h-3 w-3 mr-1" />}
                      {kpi.trend === 'down' && <TrendingDownIcon className="h-3 w-3 mr-1" />}
                      {kpi.change}
                    </p>
                  </div>
                  <div className={cn(
                    "h-12 w-12 rounded-lg flex items-center justify-center",
                    useGlass ? "glass-effect-subtle" : "bg-primary/10"
                  )}>
                    <kpi.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card 
              variant={useGlass ? "glass" : "default"}
              className="p-6"
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  Performance Trends
                  <Button variant={useGlass ? "glass-ghost" : "ghost"} size="sm">
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics?.trends}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: useGlass ? 
                            'hsl(var(--background) / 0.9)' : 
                            'hsl(var(--background))',
                          backdropFilter: useGlass ? 'blur(24px)' : 'none',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="initiatives" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="objectives" 
                        stroke="hsl(var(--secondary))" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Progress Overview */}
            <Card 
              variant={useGlass ? "glass-subtle" : "default"}
              className="p-6"
            >
              <CardHeader>
                <CardTitle>Initiative Progress</CardTitle>
                <CardDescription>
                  Current progress across all active initiatives
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics?.initiatives.map((initiative) => (
                  <div key={initiative.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{initiative.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {initiative.progress}%
                      </span>
                    </div>
                    <Progress 
                      value={initiative.progress} 
                      variant={
                        initiative.progress >= 80 ? "success" :
                        initiative.progress >= 50 ? "default" :
                        initiative.progress >= 25 ? "warning" : "destructive"
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activities */}
            <Card 
              variant={useGlass ? "glass" : "default"}
              className="p-6"
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ActivityIcon className="h-5 w-5 mr-2" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activities?.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user.avatar} />
                      <AvatarFallback>
                        {activity.user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user.name}</span>
                        {' '}{activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(activity.createdAt)} ago
                      </p>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant={useGlass ? "glass-ghost" : "ghost"} 
                  className="w-full mt-4"
                >
                  View All Activities
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card 
              variant={useGlass ? "glass-subtle" : "default"}
              className="p-6"
            >
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant={useGlass ? "glass" : "default"} 
                  className="w-full justify-start"
                  leftIcon={<PlusIcon />}
                >
                  Create Initiative
                </Button>
                <Button 
                  variant={useGlass ? "glass-outline" : "outline"} 
                  className="w-full justify-start"
                  leftIcon={<FileTextIcon />}
                >
                  Generate Report
                </Button>
                <Button 
                  variant={useGlass ? "glass-ghost" : "ghost"} 
                  className="w-full justify-start"
                  leftIcon={<SettingsIcon />}
                >
                  Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
```

### Manager Dashboard

A focused dashboard for managers with team oversight and task management capabilities.

```tsx
function ManagerDashboard() {
  const { data: areaData } = useManagerAreaData()
  const { data: teamMetrics } = useTeamMetrics()
  const { theme } = useTheme()
  
  const useGlass = theme.tenant !== 'default'

  return (
    <div className="space-y-6">
      {/* Area Overview Header */}
      <Card 
        variant={useGlass ? "glass" : "default"}
        effect={useGlass ? "glow" : "none"}
        className="p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{areaData?.name}</h2>
            <p className="text-muted-foreground mt-1">
              {areaData?.description}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={useGlass ? "glass" : "secondary"}>
              {teamMetrics?.totalMembers} Team Members
            </Badge>
            <Button 
              variant={useGlass ? "glass" : "default"}
              leftIcon={<PlusIcon />}
            >
              Add Member
            </Button>
          </div>
        </div>

        {/* Area Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className={cn(
            "p-4 rounded-lg",
            useGlass ? "glass-effect-subtle" : "bg-muted/50"
          )}>
            <p className="text-sm text-muted-foreground">Active Initiatives</p>
            <p className="text-2xl font-bold text-primary">
              {areaData?.activeInitiatives}
            </p>
          </div>
          <div className={cn(
            "p-4 rounded-lg",
            useGlass ? "glass-effect-subtle" : "bg-muted/50"
          )}>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
            <p className="text-2xl font-bold text-success">
              {areaData?.completionRate}%
            </p>
          </div>
          <div className={cn(
            "p-4 rounded-lg",
            useGlass ? "glass-effect-subtle" : "bg-muted/50"
          )}>
            <p className="text-sm text-muted-foreground">Overdue Tasks</p>
            <p className="text-2xl font-bold text-destructive">
              {areaData?.overdueTasks}
            </p>
          </div>
          <div className={cn(
            "p-4 rounded-lg",
            useGlass ? "glass-effect-subtle" : "bg-muted/50"
          )}>
            <p className="text-sm text-muted-foreground">Team Utilization</p>
            <p className="text-2xl font-bold text-info">
              {teamMetrics?.utilization}%
            </p>
          </div>
        </div>
      </Card>

      {/* Team and Initiatives Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance */}
        <Card 
          variant={useGlass ? "glass-subtle" : "default"}
          className="p-6"
        >
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>
              Individual performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMetrics?.members.map((member) => (
                <div key={member.id} className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {member.completedTasks}/{member.totalTasks}
                      </span>
                    </div>
                    <Progress 
                      value={member.completionRate} 
                      className="h-2"
                      variant={member.completionRate >= 80 ? "success" : "default"}
                    />
                  </div>
                  <Button 
                    variant={useGlass ? "glass-ghost" : "ghost"} 
                    size="sm"
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Initiative Status */}
        <Card 
          variant={useGlass ? "glass-subtle" : "default"}
          className="p-6"
        >
          <CardHeader>
            <CardTitle>Initiative Status</CardTitle>
            <CardDescription>
              Current status of area initiatives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {areaData?.initiatives.map((initiative) => (
                <div key={initiative.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{initiative.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDate(initiative.dueDate)}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        initiative.status === 'completed' ? 'success' :
                        initiative.status === 'in_progress' ? 'default' :
                        initiative.status === 'delayed' ? 'destructive' :
                        'secondary'
                      }
                      className={useGlass ? "glassmorphic-badge" : ""}
                    >
                      {initiative.status}
                    </Badge>
                  </div>
                  <Progress 
                    value={initiative.progress} 
                    variant={
                      initiative.isOverdue ? "destructive" :
                      initiative.progress >= 80 ? "success" : "default"
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## Form Patterns

### Multi-Step Initiative Form

A comprehensive form for creating initiatives with validation and glassmorphism effects.

```tsx
function CreateInitiativeWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const { theme } = useTheme()
  const useGlass = theme.tenant !== 'default'
  
  const form = useForm({
    resolver: zodResolver(initiativeSchema),
    defaultValues: {
      title: '',
      description: '',
      objectives: [],
      activities: [],
      startDate: new Date(),
      dueDate: addMonths(new Date(), 3),
    }
  })

  const steps = [
    { title: 'Basic Info', description: 'Initiative details' },
    { title: 'Objectives', description: 'Link to objectives' },
    { title: 'Activities', description: 'Define tasks' },
    { title: 'Review', description: 'Confirm details' }
  ]

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <Card 
        variant={useGlass ? "glass-subtle" : "default"}
        className="mb-8 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Create New Initiative</h1>
          <Badge variant={useGlass ? "glass" : "secondary"}>
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                index <= currentStep 
                  ? useGlass 
                    ? "glass-primary text-primary-foreground" 
                    : "bg-primary text-primary-foreground"
                  : useGlass
                    ? "glass-effect-subtle text-muted-foreground"
                    : "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-12 h-0.5 mx-4",
                  index < currentStep 
                    ? "bg-primary" 
                    : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card 
            variant={useGlass ? "glass" : "default"}
            className="p-8"
          >
            {/* Step 1: Basic Information */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initiative Title *</FormLabel>
                          <FormControl>
                            <Input 
                              variant={useGlass ? "glass" : "default"}
                              placeholder="Enter initiative title"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            A clear, descriptive title for your initiative
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className={useGlass ? "glass-input" : ""}>
                                <SelectValue placeholder="Select area" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className={useGlass ? "glassmorphic-dropdown" : ""}>
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="operations">Operations</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the initiative's goals and scope"
                            className={cn(
                              "min-h-[120px]",
                              useGlass && "glass-input"
                            )}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Provide context and goals for this initiative
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={useGlass ? "glass-outline" : "outline"}
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent 
                              className={cn(
                                "w-auto p-0",
                                useGlass && "glassmorphic-dropdown"
                              )} 
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Due Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={useGlass ? "glass-outline" : "outline"}
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent 
                              className={cn(
                                "w-auto p-0",
                                useGlass && "glassmorphic-dropdown"
                              )} 
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Objectives */}
            {currentStep === 1 && (
              <ObjectiveSelection 
                form={form} 
                useGlass={useGlass} 
              />
            )}

            {/* Step 3: Activities */}
            {currentStep === 2 && (
              <ActivityManager 
                form={form} 
                useGlass={useGlass} 
              />
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
              <InitiativeReview 
                form={form} 
                useGlass={useGlass} 
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8 border-t">
              <Button
                type="button"
                variant={useGlass ? "glass-ghost" : "ghost"}
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={useGlass ? "glass-outline" : "outline"}
                  onClick={() => form.reset()}
                >
                  Reset
                </Button>
                
                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    variant={useGlass ? "glass" : "default"}
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant={useGlass ? "glass-success" : "default"}
                  >
                    Create Initiative
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </form>
      </Form>
    </div>
  )
}
```

### Quick Action Forms

Simple, focused forms for common actions with glassmorphism styling.

```tsx
function QuickActionForms() {
  const { theme } = useTheme()
  const useGlass = theme.tenant !== 'default'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Quick Add Activity */}
      <Card 
        variant={useGlass ? "glass-subtle" : "default"}
        className="p-6"
      >
        <CardHeader>
          <CardTitle className="flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            variant={useGlass ? "glass" : "default"}
            placeholder="Activity title"
          />
          <Select>
            <SelectTrigger className={useGlass ? "glass-input" : ""}>
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent className={useGlass ? "glassmorphic-dropdown" : ""}>
              <SelectItem value="john">John Doe</SelectItem>
              <SelectItem value="jane">Jane Smith</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant={useGlass ? "glass" : "default"}
            className="w-full"
          >
            Add Activity
          </Button>
        </CardContent>
      </Card>

      {/* Status Update */}
      <Card 
        variant={useGlass ? "glass-subtle" : "default"}
        className="p-6"
      >
        <CardHeader>
          <CardTitle className="flex items-center">
            <UpdateIcon className="h-5 w-5 mr-2" />
            Update Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select>
            <SelectTrigger className={useGlass ? "glass-input" : ""}>
              <SelectValue placeholder="Select initiative" />
            </SelectTrigger>
            <SelectContent className={useGlass ? "glassmorphic-dropdown" : ""}>
              <SelectItem value="init1">Initiative 1</SelectItem>
              <SelectItem value="init2">Initiative 2</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-2">
            <Label>Progress: 75%</Label>
            <Slider defaultValue={[75]} max={100} step={5} />
          </div>
          <Button 
            variant={useGlass ? "glass-success" : "default"}
            className="w-full"
          >
            Update Progress
          </Button>
        </CardContent>
      </Card>

      {/* Quick Note */}
      <Card 
        variant={useGlass ? "glass-subtle" : "default"}
        className="p-6"
      >
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquareIcon className="h-5 w-5 mr-2" />
            Add Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Enter your note..."
            className={cn(
              "min-h-[100px]",
              useGlass && "glass-input"
            )}
          />
          <div className="flex space-x-2">
            <Button 
              variant={useGlass ? "glass-ghost" : "ghost"}
              size="sm"
              className="flex-1"
            >
              Save Draft
            </Button>
            <Button 
              variant={useGlass ? "glass" : "default"}
              size="sm"
              className="flex-1"
            >
              Post Note
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Data Visualization

### Enhanced Charts with Glass Effects

Interactive charts that integrate with the glassmorphism theme system.

```tsx
function GlassChartsDemo() {
  const { theme } = useTheme()
  const useGlass = theme.tenant !== 'default'
  
  const chartData = [
    { month: 'Jan', initiatives: 65, objectives: 45 },
    { month: 'Feb', initiatives: 59, objectives: 52 },
    { month: 'Mar', initiatives: 80, objectives: 67 },
    { month: 'Apr', initiatives: 81, objectives: 73 },
    { month: 'May', initiatives: 56, objectives: 61 },
    { month: 'Jun', initiatives: 95, objectives: 84 },
  ]

  return (
    <div className="space-y-8">
      {/* Line Chart with Glass Container */}
      <Card 
        variant={useGlass ? "glass" : "default"}
        effect={useGlass ? "elevated" : "none"}
        className="p-6"
      >
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>
            Monthly progress across initiatives and objectives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="initiativesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="objectivesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  opacity={useGlass ? 0.2 : 0.3}
                  stroke="hsl(var(--border))"
                />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: useGlass ? 
                      'hsl(var(--background) / 0.95)' : 
                      'hsl(var(--background))',
                    backdropFilter: useGlass ? 'blur(24px)' : 'none',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: useGlass ? 
                      '0 25px 50px -12px rgba(0,0,0,0.25)' : 
                      '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="initiatives" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#initiativesGradient)"
                />
                <Area 
                  type="monotone" 
                  dataKey="objectives" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  fill="url(#objectivesGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          variant={useGlass ? "glass-subtle" : "default"}
          className="p-6"
        >
          <CardHeader>
            <CardTitle>Progress Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: useGlass ? 
                        'hsl(var(--background) / 0.9)' : 
                        'hsl(var(--background))',
                      backdropFilter: useGlass ? 'blur(16px)' : 'none',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))"
                    opacity={useGlass ? 0.8 : 1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card 
          variant={useGlass ? "glass-subtle" : "default"}
          className="p-6"
        >
          <CardHeader>
            <CardTitle>Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getStatusColor(entry.name)}
                        opacity={useGlass ? 0.8 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: useGlass ? 
                        'hsl(var(--background) / 0.9)' : 
                        'hsl(var(--background))',
                      backdropFilter: useGlass ? 'blur(16px)' : 'none',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metricsData.map((metric) => (
          <Card 
            key={metric.id}
            variant={useGlass ? "glass-subtle" : "default"}
            effect={useGlass ? "hover" : "none"}
            className="p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className={cn(
                  "text-xs flex items-center mt-1",
                  metric.trend === 'up' ? "text-success" : 
                  metric.trend === 'down' ? "text-destructive" : 
                  "text-muted-foreground"
                )}>
                  {metric.trend === 'up' && <TrendingUpIcon className="h-3 w-3 mr-1" />}
                  {metric.trend === 'down' && <TrendingDownIcon className="h-3 w-3 mr-1" />}
                  {metric.change}
                </p>
              </div>
              <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                useGlass ? "glass-effect-subtle" : "bg-primary/10"
              )}>
                <metric.icon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

## Navigation Patterns

### Enhanced Sidebar with Glass Effects

```tsx
function GlassSidebarDemo() {
  const { theme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const useGlass = theme.tenant !== 'default'

  const navigationItems = [
    { label: 'Dashboard', icon: HomeIcon, href: '/dashboard', active: true },
    { label: 'Initiatives', icon: FolderIcon, href: '/initiatives' },
    { label: 'Objectives', icon: TargetIcon, href: '/objectives' },
    { label: 'Analytics', icon: BarChartIcon, href: '/analytics' },
    { label: 'Team', icon: UsersIcon, href: '/team' },
    { label: 'Settings', icon: SettingsIcon, href: '/settings' },
  ]

  return (
    <Sidebar 
      collapsible="icon" 
      className={cn(
        "border-r",
        useGlass && "glassmorphic-card border-0"
      )}
    >
      <SidebarHeader className="p-6">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            useGlass ? "glass-primary" : "bg-primary"
          )}>
            <BuildingIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-lg">Initiative</h2>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton 
                  asChild 
                  isActive={item.active}
                  className={cn(
                    "w-full justify-start mb-1",
                    item.active && useGlass && "glass-primary",
                    !item.active && useGlass && "glass-hover"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Quick Actions */}
        <SidebarGroup className="mt-8">
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <Button 
                variant={useGlass ? "glass" : "default"}
                size="sm"
                className="w-full justify-start"
                leftIcon={<PlusIcon />}
              >
                {!collapsed && "New Initiative"}
              </Button>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Button 
                variant={useGlass ? "glass-ghost" : "ghost"}
                size="sm"
                className="w-full justify-start"
                leftIcon={<FileTextIcon />}
              >
                {!collapsed && "Report"}
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={useGlass ? "glass-ghost" : "ghost"}
              className="w-full justify-start p-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.jpg" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="ml-2 text-left">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">Manager</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className={cn(
              "w-56",
              useGlass && "glassmorphic-dropdown"
            )}
            align="end"
          >
            <DropdownMenuItem>
              <UserIcon className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOutIcon className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
```

### Enhanced Breadcrumb Navigation

```tsx
function GlassBreadcrumbDemo() {
  const { theme } = useTheme()
  const useGlass = theme.tenant !== 'default'
  
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Initiatives', href: '/initiatives' },
    { label: 'Product Development', href: '/initiatives/product' },
    { label: 'New Feature Implementation', href: null, current: true },
  ]

  return (
    <Card 
      variant={useGlass ? "glass-subtle" : "default"}
      className="p-4 mb-6"
    >
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {item.current ? (
                  <BreadcrumbPage className="font-medium">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink 
                    href={item.href}
                    className={cn(
                      "hover:text-primary transition-colors",
                      useGlass && "hover:text-primary/80"
                    )}
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < breadcrumbItems.length - 1 && (
                <BreadcrumbSeparator />
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </Card>
  )
}
```

---

## Interactive Components

### Enhanced Modals and Dialogs

```tsx
function GlassModalDemo() {
  const [open, setOpen] = useState(false)
  const { theme } = useTheme()
  const useGlass = theme.tenant !== 'default'

  return (
    <>
      <Button 
        variant={useGlass ? "glass" : "default"}
        onClick={() => setOpen(true)}
      >
        Open Glass Modal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className={cn(
            "max-w-2xl",
            useGlass && "glassmorphic-modal"
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <LayersIcon className="h-5 w-5 mr-2" />
              Initiative Details
            </DialogTitle>
            <DialogDescription>
              View and manage initiative information with team collaboration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Initiative Info */}
            <div className={cn(
              "p-4 rounded-lg space-y-3",
              useGlass ? "glass-effect-subtle" : "bg-muted/50"
            )}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">New Product Launch</h4>
                  <p className="text-sm text-muted-foreground">
                    Launch our new product line in Q2 2025
                  </p>
                </div>
                <Badge variant={useGlass ? "glass" : "default"}>
                  In Progress
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>75%</span>
                </div>
                <Progress value={75} variant="success" />
              </div>
            </div>

            {/* Team Members */}
            <div>
              <h5 className="font-medium mb-3">Team Members</h5>
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={useGlass ? "glassmorphic-badge" : ""}>
                      {member.tasksCount} tasks
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h5 className="font-medium mb-3">Recent Activity</h5>
              <div className="space-y-3 max-h-32 overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 text-sm">
                    <div className={cn(
                      "h-2 w-2 rounded-full mt-2",
                      activity.type === 'update' ? "bg-primary" :
                      activity.type === 'comment' ? "bg-info" :
                      "bg-success"
                    )} />
                    <div className="flex-1">
                      <p>{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(activity.createdAt)} ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant={useGlass ? "glass-ghost" : "ghost"}
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button 
              variant={useGlass ? "glass-outline" : "outline"}
            >
              View Full Details
            </Button>
            <Button 
              variant={useGlass ? "glass" : "default"}
            >
              Edit Initiative
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### Interactive Data Tables

```tsx
function GlassDataTableDemo() {
  const { theme } = useTheme()
  const useGlass = theme.tenant !== 'default'
  const [selectedRows, setSelectedRows] = useState([])

  return (
    <Card 
      variant={useGlass ? "glass" : "default"}
      className="p-6"
    >
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Initiative Management</CardTitle>
            <CardDescription>
              Manage and track all initiatives across your organization
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant={useGlass ? "glass-ghost" : "ghost"}
              size="sm"
              leftIcon={<FilterIcon />}
            >
              Filter
            </Button>
            <Button 
              variant={useGlass ? "glass" : "default"}
              size="sm"
              leftIcon={<PlusIcon />}
            >
              Add Initiative
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters Bar */}
        <div className={cn(
          "flex flex-wrap items-center gap-4 p-4 rounded-lg mb-6",
          useGlass ? "glass-effect-subtle" : "bg-muted/50"
        )}>
          <Select>
            <SelectTrigger className={cn("w-40", useGlass && "glass-input")}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className={useGlass ? "glassmorphic-dropdown" : ""}>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className={cn("w-40", useGlass && "glass-input")}>
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent className={useGlass ? "glassmorphic-dropdown" : ""}>
              <SelectItem value="all">All Areas</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>

          <Input 
            variant={useGlass ? "glass" : "default"}
            placeholder="Search initiatives..."
            className="w-64"
            leftIcon={<SearchIcon />}
          />

          {selectedRows.length > 0 && (
            <Badge variant={useGlass ? "glass" : "secondary"}>
              {selectedRows.length} selected
            </Badge>
          )}
        </div>

        {/* Data Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className={useGlass ? "glass-effect-subtle" : ""}>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox />
                </TableHead>
                <TableHead>Initiative</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initiatives.map((initiative) => (
                <TableRow 
                  key={initiative.id}
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
                    useGlass && "hover:glass-effect-subtle"
                  )}
                >
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{initiative.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {initiative.description?.substring(0, 50)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={useGlass ? "glassmorphic-badge" : ""}>
                      {initiative.area}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={initiative.progress} 
                        className="w-16"
                        variant={
                          initiative.progress >= 80 ? "success" :
                          initiative.progress >= 50 ? "default" :
                          "warning"
                        }
                      />
                      <span className="text-sm">{initiative.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        initiative.status === 'completed' ? 'success' :
                        initiative.status === 'in_progress' ? 'default' :
                        initiative.status === 'delayed' ? 'destructive' :
                        'secondary'
                      }
                      className={useGlass ? "glassmorphic-badge" : ""}
                    >
                      {initiative.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-sm",
                      isAfter(new Date(), new Date(initiative.dueDate)) && 
                      "text-destructive font-medium"
                    )}>
                      {formatDate(initiative.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={initiative.assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {initiative.assignee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{initiative.assignee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant={useGlass ? "glass-ghost" : "ghost"} 
                          size="sm"
                        >
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        className={useGlass ? "glassmorphic-dropdown" : ""}
                        align="end"
                      >
                        <DropdownMenuItem>
                          <EyeIcon className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <EditIcon className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing 1 to 10 of 47 initiatives
          </p>
          <div className="flex items-center space-x-2">
            <Button 
              variant={useGlass ? "glass-ghost" : "ghost"} 
              size="sm"
              disabled
            >
              Previous
            </Button>
            <Button 
              variant={useGlass ? "glass-ghost" : "ghost"} 
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Tenant-Specific Implementations

### SIGA Tourism Theme

```tsx
function SIGATourismDashboard() {
  return (
    <div data-tenant="siga" className="min-h-screen bg-background">
      {/* Hero Section with Tourism-Specific Styling */}
      <section className="relative bg-gradient-to-br from-primary/20 via-background to-accent/20 py-16">
        <div className="absolute inset-0 bg-[url('/tourism-pattern.svg')] opacity-10" />
        
        <div className="relative container mx-auto px-6">
          <Card variant="glass" effect="glow" className="p-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">SIGA Tourism Dashboard</h1>
              <p className="text-lg text-muted-foreground">
                Streamline tourism operations with intelligent initiative management
              </p>
            </div>
            
            {/* Tourism-specific KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="glass-effect-subtle rounded-full h-16 w-16 mx-auto mb-4 flex items-center justify-center">
                  <MapPinIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold">Destinations</h3>
                <p className="text-2xl font-bold text-primary">24</p>
                <p className="text-sm text-muted-foreground">Active routes</p>
              </div>
              
              <div className="text-center">
                <div className="glass-effect-subtle rounded-full h-16 w-16 mx-auto mb-4 flex items-center justify-center">
                  <UsersIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold">Visitors</h3>
                <p className="text-2xl font-bold text-primary">12.5K</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              
              <div className="text-center">
                <div className="glass-effect-subtle rounded-full h-16 w-16 mx-auto mb-4 flex items-center justify-center">
                  <StarIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold">Satisfaction</h3>
                <p className="text-2xl font-bold text-primary">4.8</p>
                <p className="text-sm text-muted-foreground">Average rating</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Tourism Operations Management */}
      <section className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card variant="glass-subtle" className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Tour Schedule Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tourSchedules.map((tour) => (
                  <div key={tour.id} className="glass-effect-subtle p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{tour.name}</h4>
                      <Badge variant="glass">{tour.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {tour.destination} • {tour.duration}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        {tour.bookings}/{tour.capacity} booked
                      </span>
                      <Progress 
                        value={(tour.bookings / tour.capacity) * 100} 
                        className="w-24"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card variant="glass-subtle" className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUpIcon className="h-5 w-5 mr-2" />
                Revenue Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background) / 0.95)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
```

### FEMA Electrical Theme

```tsx
function FEMAElectricalDashboard() {
  return (
    <div data-tenant="fema" className="min-h-screen bg-background">
      {/* Safety-focused Header */}
      <section className="relative bg-gradient-to-r from-primary/20 to-secondary/20 py-12">
        <div className="absolute inset-0 bg-[url('/electrical-grid.svg')] opacity-5" />
        
        <div className="relative container mx-auto px-6">
          <Card variant="glass" effect="elevated" className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">FEMA Electrical Operations</h1>
                <p className="text-lg text-muted-foreground">
                  Safety-first electrical infrastructure management
                </p>
              </div>
              <div className="glass-effect rounded-full h-20 w-20 flex items-center justify-center">
                <ZapIcon className="h-10 w-10 text-primary" />
              </div>
            </div>

            {/* Safety Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div className="glass-effect-subtle p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <ShieldCheckIcon className="h-6 w-6 text-success" />
                  <Badge variant="glass-success">Safe</Badge>
                </div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Safety Incidents</p>
              </div>
              
              <div className="glass-effect-subtle p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangleIcon className="h-6 w-6 text-warning" />
                  <Badge variant="glass">Monitor</Badge>
                </div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
              </div>
              
              <div className="glass-effect-subtle p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <BatteryIcon className="h-6 w-6 text-primary" />
                  <Badge variant="glass">Optimal</Badge>
                </div>
                <p className="text-2xl font-bold">98.5%</p>
                <p className="text-sm text-muted-foreground">Grid Efficiency</p>
              </div>
              
              <div className="glass-effect-subtle p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <ToolIcon className="h-6 w-6 text-info" />
                  <Badge variant="glass">Scheduled</Badge>
                </div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Maintenance Tasks</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Electrical Operations Grid */}
      <section className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Grid Status Monitor */}
          <Card variant="glass-subtle" className="p-6 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Power Grid Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gridSections.map((section) => (
                  <div key={section.id} className="glass-effect-subtle p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{section.name}</h4>
                      <Badge 
                        variant={
                          section.status === 'operational' ? 'glass-success' :
                          section.status === 'maintenance' ? 'glass' :
                          'glass-destructive'
                        }
                      >
                        {section.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Load</p>
                        <p className="font-medium">{section.load}MW</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Capacity</p>
                        <p className="font-medium">{section.capacity}MW</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Efficiency</p>
                        <p className="font-medium">{section.efficiency}%</p>
                      </div>
                    </div>
                    <Progress 
                      value={(section.load / section.capacity) * 100} 
                      variant={
                        (section.load / section.capacity) > 0.9 ? 'destructive' :
                        (section.load / section.capacity) > 0.7 ? 'warning' :
                        'success'
                      }
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Safety Alerts */}
          <Card variant="glass-subtle" className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangleIcon className="h-5 w-5 mr-2" />
                Safety Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {safetyAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={cn(
                      "p-3 rounded-lg border-l-4",
                      alert.severity === 'high' ? 'border-destructive glass-destructive' :
                      alert.severity === 'medium' ? 'border-warning bg-warning/10' :
                      'border-info bg-info/10'
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="font-medium text-sm">{alert.title}</h5>
                      <Badge 
                        variant={
                          alert.severity === 'high' ? 'destructive' :
                          alert.severity === 'medium' ? 'warning' :
                          'default'
                        }
                        className="text-xs"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {alert.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(alert.createdAt)} ago
                    </p>
                  </div>
                ))}
              </div>
              
              <Button 
                variant="glass-outline" 
                size="sm" 
                className="w-full mt-4"
              >
                View All Alerts
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
```

### Stratix Platform Theme

```tsx
function StratixPlatformDashboard() {
  return (
    <div data-tenant="stratix" className="min-h-screen bg-background">
      {/* Modern Tech Hero */}
      <section className="relative bg-gradient-to-br from-primary/30 via-background to-accent/30 py-20">
        <div className="absolute inset-0 bg-[url('/tech-pattern.svg')] opacity-10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-40 right-32 w-24 h-24 bg-secondary/20 rounded-full blur-2xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-accent/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>
        
        <div className="relative container mx-auto px-6">
          <Card variant="glass-strong" effect="glow-strong" className="p-12 max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="glass-primary rounded-full h-24 w-24 mx-auto mb-6 flex items-center justify-center">
                <CpuIcon className="h-12 w-12 text-primary-foreground" />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Stratix AI Platform
              </h1>
              <p className="text-xl text-muted-foreground">
                Next-generation initiative management powered by artificial intelligence
              </p>
            </div>
            
            {/* AI-powered features showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center glass-effect-subtle p-6 rounded-xl">
                <BrainIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">AI Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Intelligent recommendations for optimal initiative management
                </p>
              </div>
              
              <div className="text-center glass-effect-subtle p-6 rounded-xl">
                <RocketIcon className="h-12 w-12 text-secondary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Auto-Optimization</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically optimize workflows and resource allocation
                </p>
              </div>
              
              <div className="text-center glass-effect-subtle p-6 rounded-xl">
                <TrendingUpIcon className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Predictive Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Forecast outcomes and identify potential roadblocks early
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* AI Dashboard Grid */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* AI Assistant Panel */}
          <Card variant="glass" effect="glow" className="lg:col-span-1 p-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <RobotIcon className="h-5 w-5 mr-2" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="glass-effect-subtle p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="glass-primary rounded-full h-8 w-8 flex items-center justify-center">
                      <BotIcon className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        I've identified 3 initiatives that may need attention based on current progress patterns.
                      </p>
                      <Button variant="glass-ghost" size="sm" className="mt-2">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="glass-effect-subtle p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Suggested Actions</h5>
                  <div className="space-y-2">
                    <Button variant="glass-outline" size="sm" className="w-full justify-start">
                      <LightbulbIcon className="h-4 w-4 mr-2" />
                      Optimize Team Allocation
                    </Button>
                    <Button variant="glass-outline" size="sm" className="w-full justify-start">
                      <TargetIcon className="h-4 w-4 mr-2" />
                      Adjust Milestone Dates
                    </Button>
                    <Button variant="glass-outline" size="sm" className="w-full justify-start">
                      <TrendingUpIcon className="h-4 w-4 mr-2" />
                      Resource Reallocation
                    </Button>
                  </div>
                </div>

                <Button variant="glass" className="w-full">
                  <MessageSquareIcon className="h-4 w-4 mr-2" />
                  Chat with AI
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Performance Analytics */}
          <Card variant="glass-subtle" className="lg:col-span-2 p-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChartIcon className="h-5 w-5 mr-2" />
                AI-Powered Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analyticsData}>
                    <defs>
                      <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background) / 0.95)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="performance" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#performanceGradient)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="aiPrediction" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Smart Notifications */}
          <Card variant="glass-subtle" className="lg:col-span-1 p-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BellIcon className="h-5 w-5 mr-2" />
                Smart Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {smartAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className="glass-effect-subtle p-3 rounded-lg"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={cn(
                        "rounded-full h-6 w-6 flex items-center justify-center",
                        alert.type === 'prediction' ? 'glass-primary' :
                        alert.type === 'optimization' ? 'glass-secondary' :
                        'glass-accent'
                      )}>
                        {alert.type === 'prediction' && <TrendingUpIcon className="h-3 w-3" />}
                        {alert.type === 'optimization' && <SettingsIcon className="h-3 w-3" />}
                        {alert.type === 'insight' && <LightbulbIcon className="h-3 w-3" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(alert.createdAt)} ago
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
```

---

**Examples & Patterns Documentation Version**: 2.0.0  
**Last Updated**: August 14, 2025  
**Maintained By**: UI/UX Development Team

For implementation guides and migration strategies, see [Migration Guide](./migration.md).