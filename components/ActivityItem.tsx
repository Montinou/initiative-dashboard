"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Edit2, Trash2, Check, X } from "lucide-react"
import { useActivities } from "@/hooks/useActivities"
import { useToast } from "@/hooks/use-toast"
import type { Activity } from "@/lib/types/database"
import type { CompanyTheme } from "@/lib/theme-config"

interface ActivityItemProps {
  activity: Activity
  initiativeId: string
  theme?: CompanyTheme | null
}

export function ActivityItem({ activity, initiativeId, theme }: ActivityItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(activity.title)
  const [editDescription, setEditDescription] = useState(activity.description || "")
  const [isLoading, setIsLoading] = useState(false)
  
  const { updateActivity, deleteActivity, toggleActivityCompletion } = useActivities(initiativeId)
  const { toast } = useToast()

  const handleToggleCompletion = async () => {
    try {
      setIsLoading(true)
      await toggleActivityCompletion(activity.id, !activity.completed)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update activity status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast({
        title: "Error",
        description: "Activity title cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await updateActivity(activity.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      })
      setIsEditing(false)
      toast({
        title: "Success",
        description: "Activity updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update activity",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditTitle(activity.title)
    setEditDescription(activity.description || "")
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this activity?")) return

    try {
      setIsLoading(true)
      await deleteActivity(activity.id)
      toast({
        title: "Success",
        description: "Activity deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="glassmorphic-card border-white/10">
      <CardContent className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Activity title..."
              className="glassmorphic-input"
              disabled={isLoading}
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Activity description (optional)..."
              className="glassmorphic-input min-h-[80px]"
              disabled={isLoading}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isLoading}
                className="glassmorphic-button"
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isLoading}
                className="glassmorphic-button-ghost"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Checkbox
              checked={activity.completed}
              onCheckedChange={handleToggleCompletion}
              disabled={isLoading}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-white ${
                activity.completed ? 'line-through opacity-60' : ''
              }`}>
                {activity.title}
              </h4>
              {activity.description && (
                <p className={`text-sm text-white/70 mt-1 ${
                  activity.completed ? 'line-through opacity-60' : ''
                }`}>
                  {activity.description}
                </p>
              )}
              <p className="text-xs text-white/50 mt-2">
                Created {new Date(activity.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                className="glassmorphic-button-ghost h-8 w-8 p-0"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={isLoading}
                className="glassmorphic-button-ghost h-8 w-8 p-0 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}