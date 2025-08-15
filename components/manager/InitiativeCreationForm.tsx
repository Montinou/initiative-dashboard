"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAreaScopedData } from './ManagerAreaProvider';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  DollarSign, 
  Save, 
  X,
  AlertCircle,
  Info,
  Target,
  Flag,
  FileText,
  Building2
} from 'lucide-react';

interface InitiativeCreationFormProps {
  onSuccess?: (initiativeId: string) => void;
  onCancel?: () => void;
  defaultValues?: {
    title?: string;
    description?: string;
    priority?: string;
    target_date?: Date;
    budget?: number;
  };
}

/**
 * InitiativeCreationForm Component
 * 
 * Features:
 * - Auto-assigns area based on manager context
 * - Form validation with error messages
 * - Priority and status selection
 * - Date picker for target dates
 * - Budget input with formatting
 * - Success/error handling
 * - Glassmorphism design
 */
export function InitiativeCreationForm({ 
  onSuccess, 
  onCancel,
  defaultValues 
}: InitiativeCreationFormProps) {
  const router = useRouter();
  const { managedAreaId, getQueryFilters } = useAreaScopedData();
  const { profile } = useAuth();
  const userProfile = profile;
  const tenantId = profile?.tenant_id;
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState(defaultValues?.title || '');
  const [description, setDescription] = useState(defaultValues?.description || '');
  const [priority, setPriority] = useState(defaultValues?.priority || 'medium');
  const [targetDate, setTargetDate] = useState<Date | undefined>(defaultValues?.target_date);
  const [budget, setBudget] = useState(defaultValues?.budget?.toString() || '');
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }

    if (description && description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    if (budget) {
      const budgetNum = parseFloat(budget);
      if (isNaN(budgetNum)) {
        errors.budget = 'Budget must be a valid number';
      } else if (budgetNum < 0) {
        errors.budget = 'Budget cannot be negative';
      } else if (budgetNum > 999999999) {
        errors.budget = 'Budget is too large';
      }
    }

    if (targetDate && targetDate < new Date()) {
      errors.targetDate = 'Target date cannot be in the past';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!managedAreaId || !tenantId || !userProfile?.id) {
      setError('Missing required context. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const initiativeData = {
        tenant_id: tenantId,
        area_id: managedAreaId,
        created_by: userProfile.id,
        owner_id: userProfile.id,
        title: title.trim(),
        description: description.trim() || null,
        status: 'planning',
        priority: priority,
        progress: 0,
        target_date: targetDate ? format(targetDate, 'yyyy-MM-dd') : null,
        budget: budget ? parseFloat(budget) : null,
        actual_cost: null,
        metadata: {
          created_via: 'manager_dashboard',
          created_at: new Date().toISOString()
        }
      };

      const { data, error: insertError } = await supabase
        .from('initiatives')
        .insert(initiativeData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating initiative:', insertError);
        setError(insertError.message || 'Failed to create initiative');
        return;
      }

      // Create initial progress history entry
      await supabase
        .from('progress_history')
        .insert({
          tenant_id: tenantId,
          initiative_id: data.id,
          previous_progress: 0,
          new_progress: 0,
          progress_notes: 'Initiative created',
          updated_by: userProfile.id
        });

      setSuccessMessage('Initiative created successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setTargetDate(undefined);
      setBudget('');

      // Call success callback or redirect
      if (onSuccess) {
        setTimeout(() => {
          onSuccess(data.id);
        }, 1500);
      } else {
        setTimeout(() => {
          router.push(`/manager-dashboard/initiatives/${data.id}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Error creating initiative:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatBudgetInput = (value: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    return cleaned;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Create New Initiative</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            Auto-assigned to your area
          </Badge>
        </div>
        <CardDescription>
          Define a new initiative for your area. It will be automatically assigned to your managed area.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Success/Error Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {successMessage && (
            <Alert className="border-primary bg-primary/10 text-primary-foreground">
              <Info className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Basic Information</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter initiative title"
                disabled={loading}
                className={cn(
                  "bg-background",
                  validationErrors.title && "border-destructive"
                )}
              />
              {validationErrors.title && (
                <p className="text-sm text-destructive">{validationErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the initiative goals and objectives"
                rows={4}
                disabled={loading}
                className={cn(
                  "bg-background resize-none",
                  validationErrors.description && "border-destructive"
                )}
              />
              {validationErrors.description && (
                <p className="text-sm text-destructive">{validationErrors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {description.length}/1000 characters
              </p>
            </div>
          </div>

          <Separator />

          {/* Planning Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Planning Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority} disabled={loading}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center">
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border mr-2">
                          Low
                        </Badge>
                        <span className="text-sm text-muted-foreground">Minor impact</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center">
                        <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 mr-2">
                          Medium
                        </Badge>
                        <span className="text-sm text-muted-foreground">Moderate impact</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center">
                        <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/30 mr-2">
                          High
                        </Badge>
                        <span className="text-sm text-muted-foreground">Significant impact</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center">
                        <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 mr-2">
                          Critical
                        </Badge>
                        <span className="text-sm text-muted-foreground">Urgent & essential</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !targetDate && "text-muted-foreground",
                        validationErrors.targetDate && "border-destructive"
                      )}
                      disabled={loading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {targetDate ? format(targetDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={targetDate}
                      onSelect={setTargetDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {validationErrors.targetDate && (
                  <p className="text-sm text-destructive">{validationErrors.targetDate}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="budget"
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(formatBudgetInput(e.target.value))}
                  placeholder="0.00"
                  disabled={loading}
                  className={cn(
                    "pl-9 bg-background",
                    validationErrors.budget && "border-destructive"
                  )}
                />
              </div>
              {validationErrors.budget && (
                <p className="text-sm text-destructive">{validationErrors.budget}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional: Enter the estimated budget for this initiative
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end space-x-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="hover:bg-accent/10"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || !title.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Initiative
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}