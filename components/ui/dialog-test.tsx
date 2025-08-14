"use client"

import * as React from "react"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Textarea } from "./textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Badge } from "./badge"
import { Trash2, AlertTriangle, Settings, Plus, Check } from "lucide-react"

// Import all our new dialog components
import { StandardDialog, ConfirmDialog, FormDialog } from "./standard-dialog"
import { WizardDialog, MultiTabDialog } from "./complex-dialog"
import { DrawerDialog, MobileDrawer, BottomSheet, SideNavigation } from "./drawer-dialog"

interface DialogTestProps {
  variant?: "default" | "dark" | "glass"
}

export function DialogTest({ variant = "dark" }: DialogTestProps) {
  // State for each dialog type
  const [standardOpen, setStandardOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [wizardOpen, setWizardOpen] = React.useState(false)
  const [tabOpen, setTabOpen] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [bottomOpen, setBottomOpen] = React.useState(false)
  const [navOpen, setNavOpen] = React.useState(false)

  // Form data state
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    message: ""
  })

  // Wizard state
  const [wizardStep, setWizardStep] = React.useState(0)
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([])

  // Tab state
  const [activeTab, setActiveTab] = React.useState("general")

  // Navigation state
  const [activeNav, setActiveNav] = React.useState("dashboard")

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log("Form submitted:", formData)
    setFormOpen(false)
  }

  const handleConfirm = async () => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 800))
    console.log("Confirmed deletion")
  }

  const wizardSteps = [
    {
      id: "basic",
      title: "Basic Information",
      description: "Enter your basic details",
      content: (
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={variant !== "default" ? "bg-white/5 border-white/10 text-white" : ""}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={variant !== "default" ? "bg-white/5 border-white/10 text-white" : ""}
            />
          </div>
        </div>
      ),
      validation: () => Boolean(formData.name && formData.email)
    },
    {
      id: "message",
      title: "Your Message",
      description: "Tell us more about yourself",
      content: (
        <div className="space-y-4">
          <div>
            <Label>Message</Label>
            <Textarea 
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className={variant !== "default" ? "bg-white/5 border-white/10 text-white" : ""}
              rows={4}
            />
          </div>
        </div>
      ),
      validation: () => Boolean(formData.message)
    },
    {
      id: "review",
      title: "Review & Submit",
      description: "Please review your information",
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
            <h4 className="font-medium mb-2">Review Information:</h4>
            <p><strong>Name:</strong> {formData.name}</p>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Message:</strong> {formData.message}</p>
          </div>
        </div>
      )
    }
  ]

  const tabs = [
    {
      id: "general",
      label: "General",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">General Settings</h3>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select defaultValue="en">
              <SelectTrigger className={variant !== "default" ? "bg-white/5 border-white/10 text-white" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    },
    {
      id: "account",
      label: "Account",
      badge: "2",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Account Settings</h3>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input 
              defaultValue="user123"
              className={variant !== "default" ? "bg-white/5 border-white/10 text-white" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input 
              type="email"
              defaultValue="user@example.com"
              className={variant !== "default" ? "bg-white/5 border-white/10 text-white" : ""}
            />
          </div>
        </div>
      )
    },
    {
      id: "notifications",
      label: "Notifications",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Preferences</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Email notifications</span>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Push notifications</span>
              <Badge variant="secondary">Disabled</Badge>
            </div>
          </div>
        </div>
      )
    }
  ]

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: <Settings className="h-4 w-4" />, active: true },
    { id: "projects", label: "Projects", icon: <Plus className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    { id: "help", label: "Help", icon: <AlertTriangle className="h-4 w-4" /> }
  ]

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-6">Dialog Component Tests</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Standard Dialog Test */}
        <div className="space-y-2">
          <h3 className="font-medium">Standard Dialog</h3>
          <Button onClick={() => setStandardOpen(true)}>
            Open Standard Dialog
          </Button>
        </div>

        {/* Confirm Dialog Test */}
        <div className="space-y-2">
          <h3 className="font-medium">Confirm Dialog</h3>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Item
          </Button>
        </div>

        {/* Form Dialog Test */}
        <div className="space-y-2">
          <h3 className="font-medium">Form Dialog</h3>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Form
          </Button>
        </div>

        {/* Wizard Dialog Test */}
        <div className="space-y-2">
          <h3 className="font-medium">Wizard Dialog</h3>
          <Button onClick={() => setWizardOpen(true)}>
            Start Wizard
          </Button>
        </div>

        {/* Multi-Tab Dialog Test */}
        <div className="space-y-2">
          <h3 className="font-medium">Multi-Tab Dialog</h3>
          <Button onClick={() => setTabOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Open Settings
          </Button>
        </div>

        {/* Drawer Dialog Test */}
        <div className="space-y-2">
          <h3 className="font-medium">Drawer Dialog</h3>
          <Button onClick={() => setDrawerOpen(true)}>
            Open Drawer
          </Button>
        </div>

        {/* Mobile Drawer Test */}
        <div className="space-y-2">
          <h3 className="font-medium">Mobile Drawer</h3>
          <Button onClick={() => setMobileOpen(true)}>
            Mobile Menu
          </Button>
        </div>

        {/* Bottom Sheet Test */}
        <div className="space-y-2">
          <h3 className="font-medium">Bottom Sheet</h3>
          <Button onClick={() => setBottomOpen(true)}>
            Bottom Sheet
          </Button>
        </div>

        {/* Side Navigation Test */}
        <div className="space-y-2">
          <h3 className="font-medium">Side Navigation</h3>
          <Button onClick={() => setNavOpen(true)}>
            Open Navigation
          </Button>
        </div>
      </div>

      {/* Dialog Components */}
      
      {/* Standard Dialog */}
      <StandardDialog
        open={standardOpen}
        onOpenChange={setStandardOpen}
        title="Standard Dialog Example"
        description="This is a basic dialog with custom content"
        variant={variant}
      >
        <div className="space-y-4">
          <p>This is content inside a standard dialog. You can put any React content here.</p>
          <div className="flex gap-2">
            <Badge>Feature 1</Badge>
            <Badge variant="secondary">Feature 2</Badge>
          </div>
        </div>
      </StandardDialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        variant="destructive"
        icon={<Trash2 className="h-5 w-5 text-red-500" />}
      />

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Create New Item"
        description="Fill out the form below to create a new item"
        onSubmit={handleFormSubmit}
        variant={variant}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="form-name">Name</Label>
            <Input
              id="form-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={variant !== "default" ? "bg-white/5 border-white/10 text-white" : ""}
            />
          </div>
          <div>
            <Label htmlFor="form-email">Email</Label>
            <Input
              id="form-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={variant !== "default" ? "bg-white/5 border-white/10 text-white" : ""}
            />
          </div>
        </div>
      </FormDialog>

      {/* Wizard Dialog */}
      <WizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        title="Setup Wizard"
        description="Complete the setup process step by step"
        steps={wizardSteps}
        onComplete={async () => {
          console.log("Wizard completed:", formData)
          setWizardOpen(false)
        }}
        variant={variant}
        completedSteps={completedSteps}
      />

      {/* Multi-Tab Dialog */}
      <MultiTabDialog
        open={tabOpen}
        onOpenChange={setTabOpen}
        title="Settings"
        description="Manage your application settings"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant={variant}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTabOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setTabOpen(false)}>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        }
      />

      {/* Drawer Dialog */}
      <DrawerDialog
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Drawer Example"
        description="This is a side drawer"
        side="right"
        variant={variant}
      >
        <div className="space-y-4">
          <p>Content in a drawer slides in from the side.</p>
          <div className="space-y-2">
            <Button className="w-full">Action 1</Button>
            <Button variant="outline" className="w-full">Action 2</Button>
          </div>
        </div>
      </DrawerDialog>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        title="Mobile Menu"
        description="Mobile-optimized drawer"
        variant={variant}
      >
        <div className="space-y-4">
          <p>This drawer is optimized for mobile devices.</p>
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <Button key={item.id} variant="ghost" className="w-full justify-start">
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </MobileDrawer>

      {/* Bottom Sheet */}
      <BottomSheet
        open={bottomOpen}
        onOpenChange={setBottomOpen}
        title="Bottom Sheet"
        description="iOS-style bottom sheet with snap points"
        snapPoints={["30%", "60%", "90%"]}
        defaultSnap={1}
        variant={variant}
      >
        <div className="space-y-4">
          <p>This sheet slides up from the bottom like iOS modals.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button>Option 1</Button>
            <Button variant="outline">Option 2</Button>
            <Button variant="secondary">Option 3</Button>
            <Button variant="destructive">Option 4</Button>
          </div>
        </div>
      </BottomSheet>

      {/* Side Navigation */}
      <SideNavigation
        open={navOpen}
        onOpenChange={setNavOpen}
        title="Navigation"
        description="App navigation menu"
        navigation={{ items: navigationItems }}
        activeItem={activeNav}
        onItemSelect={setActiveNav}
        variant={variant}
      >
        <div className="space-y-2">
          <h4 className="font-medium">Quick Actions</h4>
          <Button size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </SideNavigation>
    </div>
  )
}