"use client"

import React from "react"
import { TrendingUp, Users, FileText, BarChart3 } from "lucide-react"
import { z } from "zod"
import {
  StatsCard,
  MetricsGrid,
  DataTable,
  FormBuilder,
  LineChartBlock,
  BarChartBlock,
  FileUploadZone,
} from "@/components/blocks"
import { ColumnDef } from "@tanstack/react-table"

// Demo data
const sampleMetrics = [
  {
    id: "1",
    title: "Total Revenue",
    value: "$45,231.89",
    description: "Monthly revenue",
    icon: TrendingUp,
    trend: { value: 20.1, isPositive: true, period: "last month" },
    progress: 75,
    status: "success" as const,
  },
  {
    id: "2",
    title: "Active Users",
    value: "2,350",
    description: "Currently active",
    icon: Users,
    trend: { value: 5.3, isPositive: true, period: "last week" },
    progress: 60,
    status: "warning" as const,
  },
  {
    id: "3",
    title: "Documents",
    value: "124",
    description: "Total uploaded",
    icon: FileText,
    progress: 90,
    status: "info" as const,
  },
  {
    id: "4",
    title: "Analytics Score",
    value: "89%",
    description: "Performance metric",
    icon: BarChart3,
    trend: { value: 2.1, isPositive: false, period: "yesterday" },
    progress: 89,
    status: "error" as const,
  },
]

const sampleTableData = [
  { id: "1", name: "John Doe", email: "john@example.com", role: "Admin", status: "Active" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", role: "User", status: "Inactive" },
  { id: "3", name: "Bob Johnson", email: "bob@example.com", role: "Manager", status: "Active" },
]

const tableColumns: ColumnDef<typeof sampleTableData[0]>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
]

const sampleChartData = [
  { month: "Jan", revenue: 4000, users: 2400 },
  { month: "Feb", revenue: 3000, users: 1398 },
  { month: "Mar", revenue: 2000, users: 9800 },
  { month: "Apr", revenue: 2780, users: 3908 },
  { month: "May", revenue: 1890, users: 4800 },
  { month: "Jun", revenue: 2390, users: 3800 },
]

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Please select a role"),
  bio: z.string().optional(),
  notifications: z.boolean().default(false),
})

const formFields = [
  {
    name: "name",
    label: "Full Name",
    type: "text" as const,
    placeholder: "Enter your full name",
    required: true,
  },
  {
    name: "email",
    label: "Email",
    type: "email" as const,
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "role",
    label: "Role",
    type: "select" as const,
    placeholder: "Select a role",
    options: [
      { value: "user", label: "User" },
      { value: "admin", label: "Admin" },
      { value: "manager", label: "Manager" },
    ],
    required: true,
  },
  {
    name: "bio",
    label: "Bio",
    type: "textarea" as const,
    placeholder: "Tell us about yourself",
    description: "A brief description about yourself",
  },
  {
    name: "notifications",
    label: "Enable Notifications",
    type: "switch" as const,
    description: "Receive email notifications",
  },
]

export function BlocksDemo() {
  const handleFormSubmit = (data: any) => {
    console.log("Form submitted:", data)
  }

  const handleFilesSelected = (files: File[]) => {
    console.log("Files selected:", files)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Shadcn Blocks Demo</h1>
        <p className="text-muted-foreground">
          Showcase of reusable dashboard blocks built with shadcn/ui components
        </p>
      </div>

      {/* Stats Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Stats Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Revenue"
            value="$45,231.89"
            description="+20.1% from last month"
            icon={TrendingUp}
            trend={{ value: 20.1, isPositive: true }}
          />
          <StatsCard
            title="Users"
            value="2,350"
            description="+5.3% from last week"
            icon={Users}
            trend={{ value: 5.3, isPositive: true }}
          />
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Metrics Grid</h2>
        <MetricsGrid metrics={sampleMetrics} columns={4} />
      </section>

      {/* Data Table */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Data Table</h2>
        <DataTable
          columns={tableColumns}
          data={sampleTableData}
          searchKey="name"
          showViewOptions={true}
          showPagination={true}
        />
      </section>

      {/* Charts */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Charts</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LineChartBlock
            title="Revenue Trend"
            description="Monthly revenue over time"
            data={sampleChartData}
            xKey="month"
            yKey="revenue"
            config={{
              revenue: {
                label: "Revenue",
                color: "hsl(var(--chart-1))",
              },
            }}
          />
          <BarChartBlock
            title="User Growth"
            description="User acquisition by month"
            data={sampleChartData}
            xKey="month"
            yKey="users"
            config={{
              users: {
                label: "Users",
                color: "hsl(var(--chart-2))",
              },
            }}
          />
        </div>
      </section>

      {/* Form Builder */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Builder</h2>
        <div className="max-w-md">
          <FormBuilder
            fields={formFields}
            schema={formSchema}
            onSubmit={handleFormSubmit}
            submitLabel="Create User"
          />
        </div>
      </section>

      {/* File Upload */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">File Upload Zone</h2>
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          maxFiles={5}
          acceptedFileTypes={[".pdf", ".doc", ".docx", ".csv", ".xlsx"]}
          maxSize={10 * 1024 * 1024} // 10MB
        />
      </section>
    </div>
  )
}