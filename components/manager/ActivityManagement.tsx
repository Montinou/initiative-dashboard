"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  assigned_to?: string;
}

export function ActivityManagement({ initiativeId }: { initiativeId?: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const addActivity = () => {
    if (newActivity.trim()) {
      const activity: Activity = {
        id: Date.now().toString(),
        title: newActivity,
        is_completed: false
      };
      setActivities([...activities, activity]);
      setNewActivity('');
    }
  };

  const toggleActivity = (id: string) => {
    setActivities(activities.map(activity =>
      activity.id === id
        ? { ...activity, is_completed: !activity.is_completed }
        : activity
    ));
  };

  const startEditing = (activity: Activity) => {
    setEditingId(activity.id);
    setEditingTitle(activity.title);
  };

  const saveEdit = () => {
    setActivities(activities.map(activity =>
      activity.id === editingId
        ? { ...activity, title: editingTitle }
        : activity
    ));
    setEditingId(null);
    setEditingTitle('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const deleteActivity = (id: string) => {
    setActivities(activities.filter(activity => activity.id !== id));
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Activity Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add new activity..."
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addActivity()}
              className="glass-input"
            />
            <Button onClick={addActivity} size="icon" className="glass-button">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Checkbox
                  checked={activity.is_completed}
                  onCheckedChange={() => toggleActivity(activity.id)}
                />
                
                {editingId === activity.id ? (
                  <>
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="flex-1 glass-input"
                      autoFocus
                    />
                    <Button
                      onClick={saveEdit}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={`flex-1 ${
                        activity.is_completed ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {activity.title}
                    </span>
                    <Button
                      onClick={() => startEditing(activity)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => deleteActivity(activity.id)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}

            {activities.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No activities yet. Add one to get started!
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}