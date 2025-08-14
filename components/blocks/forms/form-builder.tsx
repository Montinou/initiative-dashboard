"use client"

import * as React from "react"
import { useForm, UseFormReturn, FieldValues, Path } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export type FieldType = 
  | "text" 
  | "email" 
  | "password" 
  | "number" 
  | "textarea" 
  | "select" 
  | "checkbox" 
  | "radio" 
  | "switch" 
  | "date"

export interface FormFieldConfig {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  description?: string
  options?: { value: string; label: string }[]
  required?: boolean
  validation?: z.ZodTypeAny
}

interface FormBuilderProps<T extends FieldValues> {
  fields: FormFieldConfig[]
  schema: z.ZodSchema<T>
  onSubmit: (data: T) => void | Promise<void>
  defaultValues?: Partial<T>
  submitLabel?: string
  isLoading?: boolean
  className?: string
}

export function FormBuilder<T extends FieldValues>({
  fields,
  schema,
  onSubmit,
  defaultValues,
  submitLabel = "Submit",
  isLoading = false,
  className,
}: FormBuilderProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  })

  const renderField = (field: FormFieldConfig) => {
    const fieldName = field.name as Path<T>
    
    return (
      <FormField
        key={field.name}
        control={form.control}
        name={fieldName}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>{field.label}</FormLabel>
            <FormControl>
              {(() => {
                switch (field.type) {
                  case "text":
                  case "email":
                  case "password":
                  case "number":
                    return (
                      <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        {...formField}
                      />
                    )
                  
                  case "textarea":
                    return (
                      <Textarea
                        placeholder={field.placeholder}
                        {...formField}
                      />
                    )
                  
                  case "select":
                    return (
                      <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  
                  case "checkbox":
                    return (
                      <Checkbox
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                      />
                    )
                  
                  case "radio":
                    return (
                      <RadioGroup
                        onValueChange={formField.onChange}
                        defaultValue={formField.value}
                        className="flex flex-col space-y-1"
                      >
                        {field.options?.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={option.value} />
                            <label htmlFor={option.value} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    )
                  
                  case "switch":
                    return (
                      <Switch
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                      />
                    )
                  
                  case "date":
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formField.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formField.value ? (
                              format(formField.value, "PPP")
                            ) : (
                              <span>{field.placeholder || "Pick a date"}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formField.value}
                            onSelect={formField.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )
                  
                  default:
                    return null
                }
              })()}
            </FormControl>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className={cn("space-y-6", className)}
      >
        {fields.map(renderField)}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Submitting..." : submitLabel}
        </Button>
      </form>
    </Form>
  )
}