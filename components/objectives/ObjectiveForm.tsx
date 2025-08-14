"use client"

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { objectiveCreateSchema } from '@/lib/validation/schemas'
import { useAreas } from '@/hooks/useAreas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { ObjectiveWithRelations } from '@/hooks/useObjectives'
import { z } from 'zod'

interface ObjectiveFormProps {
  objective?: ObjectiveWithRelations | null
  onSubmit: (data: z.infer<typeof objectiveCreateSchema>) => Promise<void>
  onCancel: () => void
}

export function ObjectiveForm({ objective, onSubmit, onCancel }: ObjectiveFormProps) {
  const { areas } = useAreas()

  const form = useForm({
    resolver: zodResolver(objectiveCreateSchema),
    defaultValues: {
      title: objective?.title || '',
      description: objective?.description || '',
      area_id: objective?.area_id || undefined,
      start_date: objective?.start_date || undefined,
      end_date: objective?.end_date || undefined
    }
  })

  const handleSubmit = async (data: z.infer<typeof objectiveCreateSchema>) => {
    try {
      await onSubmit(data)
      form.reset()
    } catch (error) {
      console.error('Failed to submit objective:', error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter objective title..." 
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
              <FormLabel className="text-foreground">Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the objective..."
                  className="min-h-[100px]"
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
              <FormLabel className="text-foreground">Area</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger >
                    <SelectValue placeholder="Select an area..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {areas.map(area => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Start Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">End Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting}
            >
            {form.formState.isSubmitting ? 'Saving...' : objective ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  )
}