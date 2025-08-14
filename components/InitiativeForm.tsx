"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AreaSelector } from "./AreaSelector"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useInitiatives } from "@/hooks/useInitiatives"
import { useObjectives } from "@/hooks/useObjectives"
import { initiativeCreateSchema } from "@/lib/validation/schemas"
import type { Initiative, Objective } from "@/lib/types/database"
import type { InitiativeWithRelations } from "@/hooks/useInitiatives"
import type { CompanyTheme } from "@/lib/theme-config"
import { ActivityList } from "./ActivityList"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface InitiativeFormProps {
  initiative?: InitiativeWithRelations | null
  onSuccess?: () => void
  theme?: CompanyTheme | null
}

export function InitiativeForm({ initiative, onSuccess, theme }: InitiativeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(initiative?.area_id)
  const { toast } = useToast()
  const { createInitiative, updateInitiative } = useInitiatives()
  const { objectives } = useObjectives()

  const form = useForm({
    resolver: zodResolver(initiativeCreateSchema),
    defaultValues: {
      title: initiative?.title || "",
      description: initiative?.description || "",
      area_id: initiative?.area_id || undefined,
      objective_ids: initiative?.objectives?.map(o => o.id) || [],
      start_date: initiative?.start_date || undefined,
      due_date: initiative?.due_date || undefined,
    },
  })

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true)

      if (initiative) {
        await updateInitiative(initiative.id, {
          title: data.title,
          description: data.description,
          progress: initiative.progress,
          start_date: data.start_date,
          due_date: data.due_date,
        })
        toast({
          title: "Success",
          description: "Initiative updated successfully",
        })
      } else {
        await createInitiative({
          title: data.title,
          description: data.description,
          area_id: data.area_id,
          objective_ids: data.objective_ids,
          start_date: data.start_date,
          due_date: data.due_date,
        })
        toast({
          title: "Success",
          description: "Initiative created successfully",
        })
        form.reset()
      }

      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: initiative 
          ? "Failed to update initiative. Please try again."
          : "Failed to create initiative. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update objectives when area changes
  useEffect(() => {
    if (form.watch("area_id") !== selectedAreaId) {
      setSelectedAreaId(form.watch("area_id"))
      form.setValue("objective_ids", [])
    }
  }, [form.watch("area_id")])

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter initiative title..." 
                    className="glassmorphic-input"
                    {...field} 
                  />
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
                <FormLabel className="text-white">Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter initiative description..."
                    className="glassmorphic-input min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="area_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Company Area</FormLabel>
                <FormControl>
                  <AreaSelector
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    className="glassmorphic-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Objective Selection - only show when area is selected */}
          {selectedAreaId && objectives.length > 0 && (
            <FormField
              control={form.control}
              name="objective_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Linked Objectives (Optional)</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value?.[0] || ""}
                      onValueChange={(value) => field.onChange(value ? [value] : [])}
                    >
                      <SelectTrigger className="glassmorphic-input">
                        <SelectValue placeholder="Select an objective..." />
                      </SelectTrigger>
                      <SelectContent>
                        {objectives.map((objective) => (
                          <SelectItem key={objective.id} value={objective.id}>
                            {objective.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Start Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal glassmorphic-input",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString())}
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
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Due Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal glassmorphic-input",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="theme-button-primary glassmorphic-button"
              style={theme ? { 
                backgroundColor: theme.colors.secondary,
                color: theme.tenantId === 'fema-electricidad' || theme.tenantId === 'siga-turismo' ? '#212529' : '#FFFFFF'
              } : {}}
            >
              {isLoading ? "Saving..." : initiative ? "Update Initiative" : "Create Initiative"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Activities section - only show for existing initiatives */}
      {initiative && (
        <div className="border-t border-white/10 pt-6">
          <ActivityList initiativeId={initiative.id} theme={theme} />
        </div>
      )}
    </div>
  )
}