"use client"

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { quarterCreateSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { QuarterWithStats } from '@/hooks/useQuarters'
import { z } from 'zod'

interface QuarterFormProps {
  quarter?: QuarterWithStats | null
  onSubmit: (data: z.infer<typeof quarterCreateSchema>) => Promise<void>
  onCancel: () => void
}

export function QuarterForm({ quarter, onSubmit, onCancel }: QuarterFormProps) {
  const form = useForm({
    resolver: zodResolver(quarterCreateSchema),
    defaultValues: {
      quarter_name: quarter?.quarter_name || 'Q1',
      start_date: quarter?.start_date || '',
      end_date: quarter?.end_date || ''
    }
  })

  const handleSubmit = async (data: z.infer<typeof quarterCreateSchema>) => {
    try {
      await onSubmit(data)
      form.reset()
    } catch (error) {
      console.error('Failed to submit quarter:', error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="quarter_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Quarter Name</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="glassmorphic-input">
                    <SelectValue placeholder="Select quarter..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Q1">Q1 - First Quarter</SelectItem>
                  <SelectItem value="Q2">Q2 - Second Quarter</SelectItem>
                  <SelectItem value="Q3">Q3 - Third Quarter</SelectItem>
                  <SelectItem value="Q4">Q4 - Fourth Quarter</SelectItem>
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
                <FormLabel className="text-white">Start Date</FormLabel>
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
                      onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
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
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">End Date</FormLabel>
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
                      onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
            className="glassmorphic-button"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting}
            className="glassmorphic-button"
          >
            {form.formState.isSubmitting ? 'Saving...' : quarter ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  )
}