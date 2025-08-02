"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAreaScopedData } from './ManagerAreaProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Plus, 
  CheckSquare, 
  Square, 
  Edit2, 
  Trash2, 
  Save,
  X,
  ListTodo,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Subtask {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

interface SubtaskManagementProps {
  initiativeId: string;
  initiativeTitle?: string;
  readOnly?: boolean;
  onSubtaskUpdate?: () => void;
}

/**
 * SubtaskManagement Component
 * 
 * Features:
 * - Create, edit, and delete subtasks
 * - Mark subtasks as complete/incomplete
 * - Real-time updates via subscriptions
 * - Progress tracking
 * - Bulk operations
 * - Drag-and-drop reordering (future enhancement)
 * - Area-scoped data security
 */
export function SubtaskManagement({ 
  initiativeId, 
  initiativeTitle,
  readOnly = false,
  onSubtaskUpdate 
}: SubtaskManagementProps) {
  const { getQueryFilters } = useAreaScopedData();
  const supabase = createClient();
  
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  
  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Calculate progress
  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Fetch subtasks
  const fetchSubtasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = getQueryFilters();
      
      const { data, error: fetchError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('initiative_id', initiativeId)
        .eq('tenant_id', filters.tenant_id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching subtasks:', fetchError);
        setError('Failed to load subtasks');
      } else {
        setSubtasks(data || []);
      }
    } catch (err) {
      console.error('Error in fetchSubtasks:', err);
      setError('Unexpected error loading subtasks');
    } finally {
      setLoading(false);
    }
  };

  // Create subtask
  const handleCreate = async () => {
    if (!newTitle.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const filters = getQueryFilters();
      
      const { data, error: insertError } = await supabase
        .from('subtasks')
        .insert({
          initiative_id: initiativeId,
          tenant_id: filters.tenant_id,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          completed: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating subtask:', insertError);
        setError('Failed to create subtask');
      } else {
        setSubtasks([...subtasks, data]);
        setNewTitle('');
        setNewDescription('');
        setIsCreating(false);
        onSubtaskUpdate?.();
      }
    } catch (err) {
      console.error('Error in handleCreate:', err);
      setError('Unexpected error creating subtask');
    } finally {
      setLoading(false);
    }
  };

  // Update subtask
  const handleUpdate = async (id: string, updates: Partial<Subtask>) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating subtask:', updateError);
        setError('Failed to update subtask');
      } else {
        setSubtasks(subtasks.map(s => 
          s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
        ));
        if (editingId === id) {
          setEditingId(null);
          setEditTitle('');
          setEditDescription('');
        }
        onSubtaskUpdate?.();
      }
    } catch (err) {
      console.error('Error in handleUpdate:', err);
      setError('Unexpected error updating subtask');
    } finally {
      setLoading(false);
    }
  };

  // Toggle completion
  const toggleCompletion = async (id: string, completed: boolean) => {
    await handleUpdate(id, { completed });
  };

  // Delete subtask
  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting subtask:', deleteError);
        setError('Failed to delete subtask');
      } else {
        setSubtasks(subtasks.filter(s => s.id !== id));
        setDeleteId(null);
        setSelectedIds(new Set([...selectedIds].filter(sid => sid !== id)));
        onSubtaskUpdate?.();
      }
    } catch (err) {
      console.error('Error in handleDelete:', err);
      setError('Unexpected error deleting subtask');
    } finally {
      setLoading(false);
    }
  };

  // Bulk operations
  const handleBulkComplete = async () => {
    const tasksToUpdate = subtasks.filter(s => selectedIds.has(s.id) && !s.completed);
    if (tasksToUpdate.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('subtasks')
        .update({ completed: true })
        .in('id', Array.from(selectedIds));

      if (updateError) {
        console.error('Error in bulk complete:', updateError);
        setError('Failed to complete selected tasks');
      } else {
        setSubtasks(subtasks.map(s => 
          selectedIds.has(s.id) ? { ...s, completed: true } : s
        ));
        setSelectedIds(new Set());
        onSubtaskUpdate?.();
      }
    } catch (err) {
      console.error('Error in handleBulkComplete:', err);
      setError('Unexpected error completing tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('subtasks')
        .delete()
        .in('id', Array.from(selectedIds));

      if (deleteError) {
        console.error('Error in bulk delete:', deleteError);
        setError('Failed to delete selected tasks');
      } else {
        setSubtasks(subtasks.filter(s => !selectedIds.has(s.id)));
        setSelectedIds(new Set());
        onSubtaskUpdate?.();
      }
    } catch (err) {
      console.error('Error in handleBulkDelete:', err);
      setError('Unexpected error deleting tasks');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === subtasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(subtasks.map(s => s.id)));
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSubtasks();
  }, [initiativeId]);

  // Real-time subscription
  useEffect(() => {
    const filters = getQueryFilters();
    
    const subscription = supabase
      .channel(`subtasks-${initiativeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subtasks',
          filter: `initiative_id=eq.${initiativeId}`
        },
        (payload) => {
          console.log('Subtask change:', payload);
          if (payload.eventType === 'INSERT') {
            setSubtasks(prev => [...prev, payload.new as Subtask]);
          } else if (payload.eventType === 'UPDATE') {
            setSubtasks(prev => prev.map(s => 
              s.id === payload.new.id ? payload.new as Subtask : s
            ));
          } else if (payload.eventType === 'DELETE') {
            setSubtasks(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [initiativeId, supabase]);

  return (
    <Card className="bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-sm border-muted/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Subtasks
            </CardTitle>
            {initiativeTitle && (
              <CardDescription>
                Manage subtasks for: {initiativeTitle}
              </CardDescription>
            )}
          </div>
          {!readOnly && !isCreating && (
            <Button
              size="sm"
              onClick={() => setIsCreating(true)}
              className="bg-primary/90 hover:bg-primary backdrop-blur-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Subtask
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Progress: {completedCount} of {totalCount} completed
              </span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && !readOnly && (
          <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
            <span className="text-sm font-medium">
              {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkComplete}
                disabled={loading}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Complete
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Create Form */}
        {isCreating && !readOnly && (
          <div className="space-y-3 p-4 border rounded-lg bg-background/50">
            <Input
              placeholder="Subtask title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              disabled={loading}
              className="bg-background/50"
              autoFocus
            />
            <Textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              disabled={loading}
              className="bg-background/50 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewTitle('');
                  setNewDescription('');
                }}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={loading || !newTitle.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        )}

        {/* Subtasks List */}
        {loading && subtasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading subtasks...</p>
          </div>
        ) : subtasks.length === 0 ? (
          <div className="text-center py-8">
            <ListTodo className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No subtasks yet. {!readOnly && 'Add your first subtask to get started!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select All */}
            {!readOnly && subtasks.length > 1 && (
              <div className="flex items-center space-x-3 p-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={selectedIds.size === subtasks.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span>Select all</span>
              </div>
            )}
            
            {/* Subtask Items */}
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className={`
                  group flex items-start gap-3 p-3 rounded-lg border
                  ${subtask.completed ? 'bg-muted/30 border-muted' : 'bg-background/50 border-border'}
                  hover:bg-accent/10 transition-colors
                `}
              >
                {!readOnly && (
                  <Checkbox
                    checked={selectedIds.has(subtask.id)}
                    onCheckedChange={() => toggleSelection(subtask.id)}
                    className="mt-1"
                  />
                )}
                
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={(checked) => toggleCompletion(subtask.id, checked as boolean)}
                  disabled={readOnly || loading}
                  className="mt-1"
                />

                <div className="flex-1 space-y-1">
                  {editingId === subtask.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        disabled={loading}
                        className="bg-background/50"
                        autoFocus
                      />
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        disabled={loading}
                        className="bg-background/50 resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditTitle('');
                            setEditDescription('');
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(subtask.id, {
                            title: editTitle.trim(),
                            description: editDescription.trim() || null
                          })}
                          disabled={loading || !editTitle.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={`font-medium ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {subtask.title}
                      </p>
                      {subtask.description && (
                        <p className="text-sm text-muted-foreground">
                          {subtask.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Created {new Date(subtask.created_at).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>

                {!readOnly && editingId !== subtask.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingId(subtask.id);
                          setEditTitle(subtask.title);
                          setEditDescription(subtask.description || '');
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteId(subtask.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subtask</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subtask? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={loading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}