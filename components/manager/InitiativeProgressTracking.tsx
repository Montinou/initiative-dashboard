"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAreaScopedData } from './ManagerAreaProvider';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  TrendingUp, 
  Save, 
  History, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  BarChart3,
  Eye,
  Calendar,
  User,
  MessageSquare,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface ProgressHistoryEntry {
  id: number;
  previous_progress: number;
  new_progress: number;
  progress_notes: string | null;
  obstacles: string | null;
  enhancers: string | null;
  created_at: string;
  updated_by: string;
  updater_name?: string;
}

interface Initiative {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  target_date: string | null;
  budget: number | null;
  actual_cost: number | null;
  created_at: string;
  updated_at: string;
}

interface InitiativeProgressTrackingProps {
  initiativeId: string;
  onProgressUpdate?: (newProgress: number) => void;
  showHistory?: boolean;
}

/**
 * InitiativeProgressTracking Component
 * 
 * Features:
 * - Visual progress tracking with slider and charts
 * - Progress history with detailed notes
 * - Obstacles and enhancers tracking
 * - Status updates based on progress
 * - Real-time updates and notifications
 * - Historical trend visualization
 * - Team collaboration notes
 */
export function InitiativeProgressTracking({ 
  initiativeId, 
  onProgressUpdate,
  showHistory = true 
}: InitiativeProgressTrackingProps) {
  const { managedAreaId } = useAreaScopedData();
  const { profile: userProfile } = useAuth();
  const supabase = createClient();
  
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Progress update form
  const [newProgress, setNewProgress] = useState<number[]>([0]);
  const [progressNotes, setProgressNotes] = useState('');
  const [obstacles, setObstacles] = useState('');
  const [enhancers, setEnhancers] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  
  // UI state
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  // Fetch initiative data
  const fetchInitiative = async () => {
    setLoading(true);
    setError(null);

    try {
      // RLS automatically filters by tenant
      
      const { data, error: fetchError } = await supabase
        .from('initiatives')
        .select('*')
        .eq('id', initiativeId)
        .eq('area_id', managedAreaId)
        .single();

      if (fetchError) {
        console.error('Error fetching initiative:', fetchError);
        setError('Initiative not found or access denied');
      } else {
        setInitiative(data);
        setNewProgress([data.progress || 0]);
        setNewStatus(data.status);
      }
    } catch (err) {
      console.error('Error in fetchInitiative:', err);
      setError('Unexpected error loading initiative');
    } finally {
      setLoading(false);
    }
  };

  // Fetch progress history
  const fetchProgressHistory = async () => {
    try {
      // RLS automatically filters by tenant
      
      const { data, error: fetchError } = await supabase
        .from('progress_history')
        .select(`
          *,
          updater:user_profiles!progress_history_updated_by_fkey(full_name)
        `)
        .eq('initiative_id', initiativeId)
        
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        console.error('Error fetching progress history:', fetchError);
      } else {
        const historyWithNames = data?.map(entry => ({
          ...entry,
          updater_name: entry.updater?.full_name || 'Unknown User'
        })) || [];
        setProgressHistory(historyWithNames);
      }
    } catch (err) {
      console.error('Error in fetchProgressHistory:', err);
    }
  };

  // Update progress
  const handleProgressUpdate = async () => {
    if (!initiative || !userProfile?.id) return;

    const progressValue = newProgress[0];
    
    if (progressValue === initiative.progress) {
      setError('No progress change detected');
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // RLS automatically filters by tenant
      
      // Determine new status based on progress
      let autoStatus = newStatus;
      if (progressValue === 100 && autoStatus !== 'completed') {
        autoStatus = 'completed';
      } else if (progressValue > 0 && progressValue < 100 && autoStatus === 'planning') {
        autoStatus = 'in_progress';
      }

      // Update initiative progress and status
      const { error: updateError } = await supabase
        .from('initiatives')
        .update({
          progress: progressValue,
          status: autoStatus,
          completion_date: progressValue === 100 ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', initiativeId);

      if (updateError) {
        console.error('Error updating initiative:', updateError);
        setError('Failed to update initiative progress');
        return;
      }

      // Create progress history entry
      const { error: historyError } = await supabase
        .from('progress_history')
        .insert({
          tenant_id: userProfile?.tenant_id,
          initiative_id: initiativeId,
          previous_progress: initiative.progress,
          new_progress: progressValue,
          progress_notes: progressNotes.trim() || null,
          obstacles: obstacles.trim() || null,
          enhancers: enhancers.trim() || null,
          updated_by: userProfile.id
        });

      if (historyError) {
        console.error('Error creating progress history:', historyError);
        // Don't fail the whole operation for this
      }

      // Update local state
      setInitiative({
        ...initiative,
        progress: progressValue,
        status: autoStatus,
        updated_at: new Date().toISOString()
      });

      // Reset form
      setProgressNotes('');
      setObstacles('');
      setEnhancers('');
      setShowUpdateForm(false);
      
      setSuccessMessage(`Progress updated to ${progressValue}%${autoStatus !== newStatus ? ` and status changed to ${autoStatus}` : ''}`);
      
      // Refresh history
      await fetchProgressHistory();
      
      // Notify parent component
      onProgressUpdate?.(progressValue);

    } catch (err) {
      console.error('Error in handleProgressUpdate:', err);
      setError('Unexpected error updating progress');
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate progress trend
  const getProgressTrend = () => {
    if (progressHistory.length < 2) return null;
    
    const recent = progressHistory.slice(0, 5);
    const trend = recent.reduce((acc, entry, index) => {
      if (index === recent.length - 1) return acc;
      return acc + (entry.new_progress - entry.previous_progress);
    }, 0);
    
    return trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-primary';
    if (progress >= 50) return 'text-accent-foreground';
    if (progress >= 20) return 'text-destructive';
    return 'text-destructive';
  };

  // Initial fetch
  useEffect(() => {
    fetchInitiative();
    if (showHistory) {
      fetchProgressHistory();
    }
  }, [initiativeId]);

  // Real-time subscriptions
  useEffect(() => {
    const subscription = supabase
      .channel(`initiative-progress-${initiativeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'initiatives',
          filter: `id=eq.${initiativeId}`
        },
        (payload) => {
          console.log('Initiative updated:', payload);
          setInitiative(payload.new as Initiative);
          setNewProgress([payload.new.progress || 0]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'progress_history',
          filter: `initiative_id=eq.${initiativeId}`
        },
        () => {
          console.log('Progress history updated');
          fetchProgressHistory();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [initiativeId, supabase]);

  if (loading && !initiative) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading initiative...</p>
      </div>
    );
  }

  if (error && !initiative) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!initiative) {
    return null;
  }

  const trend = getProgressTrend();

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="border-primary bg-primary/10 text-primary-foreground">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Current Progress */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Progress Tracking
              </CardTitle>
              <CardDescription>{initiative.title}</CardDescription>
            </div>
            <Badge variant="outline" className={getProgressColor(initiative.progress)}>
              {initiative.progress}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Visualization */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Progress</span>
              {trend && (
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className={`h-3 w-3 mr-1 ${trend === 'increasing' ? 'text-primary' : trend === 'decreasing' ? 'text-destructive' : 'text-muted-foreground'}`} />
                  {trend}
                </Badge>
              )}
            </div>
            <Progress value={initiative.progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Initiative Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-2xl font-bold text-primary">{initiative.progress}%</div>
              <div className="text-xs text-muted-foreground">Progress</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-sm font-medium capitalize">{initiative.status.replace('_', ' ')}</div>
              <div className="text-xs text-muted-foreground">Status</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <div className="text-sm font-medium">
                {initiative.target_date 
                  ? format(new Date(initiative.target_date), 'MMM d, yyyy')
                  : 'No target'
                }
              </div>
              <div className="text-xs text-muted-foreground">Target Date</div>
            </div>
          </div>

          {/* Update Button */}
          {!showUpdateForm && (
            <Button
              onClick={() => setShowUpdateForm(true)}
              className="w-full"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Update Progress
            </Button>
          )}

          {/* Progress Update Form */}
          {showUpdateForm && (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label>New Progress ({newProgress[0]}%)</Label>
                <Slider
                  value={newProgress}
                  onValueChange={setNewProgress}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span className="font-medium">{newProgress[0]}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Progress Notes</Label>
                <Textarea
                  placeholder="What progress has been made? What was accomplished?"
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Obstacles
                  </Label>
                  <Textarea
                    placeholder="What challenges or blockers were encountered?"
                    value={obstacles}
                    onChange={(e) => setObstacles(e.target.value)}
                    rows={3}
                    className="bg-background resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Enhancers
                  </Label>
                  <Textarea
                    placeholder="What helped accelerate progress or went well?"
                    value={enhancers}
                    onChange={(e) => setEnhancers(e.target.value)}
                    rows={3}
                    className="bg-background resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUpdateForm(false);
                    setProgressNotes('');
                    setObstacles('');
                    setEnhancers('');
                    setNewProgress([initiative.progress]);
                    setNewStatus(initiative.status);
                  }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProgressUpdate}
                  disabled={isUpdating || newProgress[0] === initiative.progress}
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Progress
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress History */}
      {showHistory && (
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Progress History
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Chart
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Progress Timeline</DialogTitle>
                    <DialogDescription>
                      Visual representation of progress over time
                    </DialogDescription>
                  </DialogHeader>
                  {/* Chart visualization will be implemented in future sprint */}
                  <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground">Chart visualization coming soon</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {progressHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No progress history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {progressHistory.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {entry.previous_progress}% → {entry.new_progress}%
                          </span>
                          {entry.new_progress > entry.previous_progress ? (
                            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                              +{entry.new_progress - entry.previous_progress}%
                            </Badge>
                          ) : entry.new_progress < entry.previous_progress ? (
                            <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">
                              {entry.new_progress - entry.previous_progress}%
                            </Badge>
                          ) : (
                            <Badge variant="outline">No change</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {entry.updater_name}
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                      
                      {entry.progress_notes && (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <p className="text-sm">{entry.progress_notes}</p>
                        </div>
                      )}
                      
                      {(entry.obstacles || entry.enhancers) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          {entry.obstacles && (
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-destructive">Obstacles</p>
                                <p className="text-sm">{entry.obstacles}</p>
                              </div>
                            </div>
                          )}
                          {entry.enhancers && (
                            <div className="flex items-start gap-2">
                              <Zap className="h-4 w-4 text-primary mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-primary">Enhancers</p>
                                <p className="text-sm">{entry.enhancers}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}