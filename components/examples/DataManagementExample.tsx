"use client"

import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Target, 
  Users, 
  CheckSquare, 
  Plus, 
  Upload, 
  Download,
  Filter,
  Search,
  RefreshCw
} from "lucide-react"

// Import our enhanced components
import { 
  InitiativesTable, 
  ObjectivesTable, 
  ActivitiesTable, 
  TeamsTable 
} from "@/components/data-tables"

import { 
  InitiativeForm, 
  ObjectiveForm, 
  ActivityForm, 
  UserInviteForm,
  OKRImportForm,
  DocumentUpload
} from "@/components/forms"

// Mock data for demonstration
const mockInitiatives = [
  {
    id: "1",
    tenant_id: "tenant-1",
    area_id: "area-1",
    title: "Launch Product X",
    description: "Develop and launch our new product offering",
    status: "in_progress" as const,
    progress: 75,
    created_by: "user-1",
    due_date: "2024-12-31",
    start_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-14T00:00:00Z",
    area_name: "Product",
    created_by_name: "John Doe",
    activities_count: 12,
    completed_activities: 9,
    is_overdue: false,
    days_remaining: 138,
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    area_id: "area-2",
    title: "Expand Market Reach",
    description: "Enter new geographical markets",
    status: "planning" as const,
    progress: 25,
    created_by: "user-2",
    due_date: "2024-09-30",
    start_date: "2024-02-01",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-08-14T00:00:00Z",
    area_name: "Sales",
    created_by_name: "Jane Smith",
    activities_count: 8,
    completed_activities: 2,
    is_overdue: false,
    days_remaining: 47,
  },
]

const mockObjectives = [
  {
    id: "1",
    tenant_id: "tenant-1",
    area_id: "area-1",
    title: "Increase Revenue by 30%",
    description: "Drive significant revenue growth through new products and market expansion",
    priority: "high" as const,
    status: "in_progress" as const,
    progress: 60,
    target_date: "2024-12-31",
    created_by: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-14T00:00:00Z",
    area_name: "Product",
    created_by_name: "John Doe",
    initiatives_count: 3,
    completed_initiatives: 1,
    overall_progress: 60,
    is_on_track: true,
  },
]

const mockActivities = [
  {
    id: "1",
    initiative_id: "1",
    title: "Conduct Market Research",
    description: "Research target demographics and market conditions",
    is_completed: true,
    assigned_to: "user-3",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
    initiative_title: "Launch Product X",
    assigned_to_name: "Bob Johnson",
    area_name: "Product",
    priority: "high" as const,
  },
  {
    id: "2",
    initiative_id: "1",
    title: "Design User Interface",
    description: "Create wireframes and mockups for the product interface",
    is_completed: false,
    assigned_to: "user-4",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-08-14T00:00:00Z",
    initiative_title: "Launch Product X",
    assigned_to_name: "Alice Wilson",
    area_name: "Product",
    priority: "medium" as const,
  },
]

const mockUsers = [
  {
    id: "user-1",
    tenant_id: "tenant-1",
    email: "john.doe@company.com",
    full_name: "John Doe",
    role: "CEO" as const,
    area_id: "area-1",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-14T00:00:00Z",
    area_name: "Product",
    assigned_activities: 5,
    completed_activities: 4,
    active_initiatives: 2,
    performance_score: 95,
    last_login: "2024-08-14T08:00:00Z",
    phone: "+1-555-0101",
  },
  {
    id: "user-2",
    tenant_id: "tenant-1",
    email: "jane.smith@company.com",
    full_name: "Jane Smith",
    role: "Manager" as const,
    area_id: "area-2",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-08-14T00:00:00Z",
    area_name: "Sales",
    assigned_activities: 8,
    completed_activities: 6,
    active_initiatives: 3,
    performance_score: 88,
    last_login: "2024-08-13T16:30:00Z",
  },
]

const mockAreas = [
  { id: "area-1", name: "Product", tenant_id: "tenant-1", created_at: "", updated_at: "" },
  { id: "area-2", name: "Sales", tenant_id: "tenant-1", created_at: "", updated_at: "" },
  { id: "area-3", name: "Marketing", tenant_id: "tenant-1", created_at: "", updated_at: "" },
]

export function DataManagementExample() {
  const [activeTab, setActiveTab] = useState("initiatives")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Mock handlers
  const handleEdit = (item: any) => {
    console.log('Edit item:', item)
    setIsFormOpen(true)
  }

  const handleDelete = (item: any) => {
    console.log('Delete item:', item)
  }

  const handleView = (item: any) => {
    console.log('View item:', item)
  }

  const handleFormSubmit = async (data: any) => {
    console.log('Form submitted:', data)
    setIsFormOpen(false)
  }

  const handleImportSubmit = async (data: any, file: File) => {
    console.log('Import submitted:', data, file)
    setIsImportOpen(false)
  }

  const handleBulkAction = (action: string) => {
    console.log(`Bulk ${action} for items:`, selectedItems)
    setSelectedItems([])
  }

  const handleExport = () => {
    console.log('Exporting data...')
  }

  const handleRefresh = () => {
    console.log('Refreshing data...')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Management Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive data management with enhanced tables and forms
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import OKR Data</DialogTitle>
              </DialogHeader>
              <OKRImportForm
                availableAreas={mockAreas}
                onSubmit={handleImportSubmit}
                onCancel={() => setIsImportOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Initiatives</p>
                <p className="text-2xl font-bold">{mockInitiatives.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Objectives</p>
                <p className="text-2xl font-bold">{mockObjectives.length}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Activities</p>
                <p className="text-2xl font-bold">{mockActivities.length}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{mockUsers.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
            <TabsTrigger value="objectives">Objectives</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>
          
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add {activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1)}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Create New {activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1)}
                </DialogTitle>
              </DialogHeader>
              {activeTab === 'initiatives' && (
                <InitiativeForm
                  mode="create"
                  availableAreas={mockAreas}
                  availableUsers={mockUsers}
                  availableObjectives={mockObjectives}
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                />
              )}
              {activeTab === 'objectives' && (
                <ObjectiveForm
                  mode="create"
                  availableAreas={mockAreas}
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                />
              )}
              {activeTab === 'activities' && (
                <ActivityForm
                  mode="create"
                  availableUsers={mockUsers}
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                />
              )}
              {activeTab === 'teams' && (
                <UserInviteForm
                  mode="single"
                  availableAreas={mockAreas}
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Selection Summary */}
        {selectedItems.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{selectedItems.length} selected</Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.length} {activeTab} selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('edit')}>
                    Bulk Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                    Export Selected
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                    Delete Selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedItems([])}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <TabsContent value="initiatives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Initiatives Management</CardTitle>
              <CardDescription>
                Track and manage all initiatives with advanced filtering and bulk operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InitiativesTable
                data={mockInitiatives}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleView}
                selectedIds={selectedItems}
                onSelectionChange={setSelectedItems}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objectives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objectives Management</CardTitle>
              <CardDescription>
                Manage strategic objectives with date range filtering and progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ObjectivesTable
                data={mockObjectives}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleView}
                selectedIds={selectedItems}
                onSelectionChange={setSelectedItems}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activities Management</CardTitle>
              <CardDescription>
                Task management with assignment tracking and completion status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivitiesTable
                data={mockActivities}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleCompletion={(activity) => console.log('Toggle completion:', activity)}
                availableUsers={mockUsers}
                selectedIds={selectedItems}
                onSelectionChange={setSelectedItems}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>
                Manage team members, roles, and permissions with performance tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamsTable
                data={mockUsers}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewProfile={handleView}
                onToggleStatus={(user) => console.log('Toggle status:', user)}
                availableAreas={mockAreas}
                currentUserRole="CEO"
                selectedIds={selectedItems}
                onSelectionChange={setSelectedItems}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Features</CardTitle>
          <CardDescription>
            This dashboard demonstrates comprehensive data management capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filtering
              </h4>
              <p className="text-sm text-muted-foreground">
                Multi-criteria filtering with date ranges, status, priority, and custom filters
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <CheckSquare className="h-4 w-4 mr-2" />
                Bulk Operations
              </h4>
              <p className="text-sm text-muted-foreground">
                Select multiple items for bulk editing, deletion, and export operations
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                File Upload & Import
              </h4>
              <p className="text-sm text-muted-foreground">
                Import OKR data from CSV/Excel files with validation and progress tracking
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Real-time Search
              </h4>
              <p className="text-sm text-muted-foreground">
                Instant search across all data fields with highlighting and suggestions
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Inline Editing
              </h4>
              <p className="text-sm text-muted-foreground">
                Quick edits with optimistic updates and error handling
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export Options
              </h4>
              <p className="text-sm text-muted-foreground">
                Export to CSV, Excel, PDF with custom field selection and formatting
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}