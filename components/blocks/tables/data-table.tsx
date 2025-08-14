"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface SimpleColumn {
  key: string
  header: string
  sortable?: boolean
  render?: (value: any, row?: any) => React.ReactNode
}

interface DataTableProps<TData = any> {
  // Support both TanStack Table columns and simple column definitions
  columns?: ColumnDef<TData>[] | SimpleColumn[]
  data: TData[]
  searchKey?: string
  searchable?: boolean
  searchPlaceholder?: string
  showViewOptions?: boolean
  showPagination?: boolean
  title?: string
  description?: string
  className?: string
}

export function DataTable<TData extends Record<string, any> = any>({
  columns: providedColumns,
  data,
  searchKey,
  searchable = false,
  searchPlaceholder = "Search...",
  showViewOptions = true,
  showPagination = true,
  title,
  description,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  // Convert simple columns to TanStack Table columns
  const columns = React.useMemo(() => {
    if (!providedColumns || providedColumns.length === 0) return []
    
    // Check if already TanStack columns
    if ('accessorKey' in providedColumns[0] || 'id' in providedColumns[0]) {
      return providedColumns as ColumnDef<TData>[]
    }
    
    // Convert simple columns to TanStack columns
    return (providedColumns as SimpleColumn[]).map((col) => ({
      accessorKey: col.key,
      header: ({ column }) => {
        if (col.sortable) {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {col.header}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        }
        return col.header
      },
      cell: ({ row, getValue }) => {
        const value = getValue()
        return col.render ? col.render(value, row.original) : value
      },
    } as ColumnDef<TData>))
  }, [providedColumns])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  const content = (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        {(searchable || searchKey) && (
          <Input
            placeholder={searchPlaceholder}
            value={searchKey ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? "" : globalFilter}
            onChange={(event) => {
              if (searchKey) {
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              } else {
                setGlobalFilter(event.target.value)
              }
            }}
            className="max-w-sm"
          />
        )}
        {showViewOptions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  if (title || description) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          {content}
        </CardContent>
      </Card>
    )
  }

  return <div className={className}>{content}</div>
}