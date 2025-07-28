"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AreaSelector } from "./AreaSelector"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useInitiatives } from "@/hooks/useInitiatives"
import { initiativeSchema, type InitiativeFormData } from "@/lib/validations/initiative"
import type { InitiativeWithDetails } from "@/types/database"
import type { CompanyTheme } from "@/lib/theme-config"
import { SubtaskList } from "./SubtaskList"

interface InitiativeFormProps {
  initiative?: InitiativeWithDetails | null
  onSuccess?: () => void
  theme?: CompanyTheme | null
}

export function InitiativeForm({ initiative, onSuccess, theme }: InitiativeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { createInitiative, updateInitiative } = useInitiatives()

  const form = useForm<InitiativeFormData>({
    resolver: zodResolver(initiativeSchema),
    defaultValues: {
      title: initiative?.title || "",
      description: initiative?.description || "",
      area_id: initiative?.area_id || undefined,
    },
  })

  const onSubmit = async (data: InitiativeFormData) => {
    try {
      setIsLoading(true)

      if (initiative) {
        await updateInitiative(initiative.id, data)
        toast({
          title: "Success",
          description: "Initiative updated successfully",
        })
      } else {
        await createInitiative(data)
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

      {/* Subtasks section - only show for existing initiatives */}
      {initiative && (
        <div className="border-t border-white/10 pt-6">
          <SubtaskList initiativeId={initiative.id} theme={theme} />
        </div>
      )}
    </div>
  )
}