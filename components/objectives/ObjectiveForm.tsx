"use client"

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { objectiveCreateSchema } from '@/lib/validation/schemas'
import { useAreas } from '@/hooks/useAreas'
import { useQuarters } from '@/hooks/useQuarters'
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
  const { quarters } = useQuarters()

  const form = useForm({
    resolver: zodResolver(objectiveCreateSchema),
    defaultValues: {
      title: objective?.title || '',
      description: objective?.description || '',
      area_id: objective?.area_id || undefined,
      quarter_ids: objective?.quarters?.map(q => q.id) || []
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
              <FormLabel className="text-white">Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter objective title..." 
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
                  placeholder="Describe the objective..."
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
              <FormLabel className="text-white">Area</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="glassmorphic-input">
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

        <FormField
          control={form.control}
          name="quarter_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Quarters</FormLabel>
              <div className="space-y-2">
                {quarters.map(quarter => (
                  <div key={quarter.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={field.value?.includes(quarter.id)}
                      onCheckedChange={(checked) => {
                        const current = field.value || []
                        if (checked) {
                          field.onChange([...current, quarter.id])
                        } else {
                          field.onChange(current.filter(id => id !== quarter.id))
                        }
                      }}
                      className="border-white/20"
                    />
                    <label className="text-sm text-white/80 cursor-pointer">
                      {quarter.quarter_name} {new Date(quarter.start_date).getFullYear()}
                      {quarter.status === 'active' && (
                        <span className="ml-2 text-xs text-primary">(Current)</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="glassmorphic-button"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting}
            className="glassmorphic-button"
          >
            {form.formState.isSubmitting ? 'Saving...' : objective ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  )
}