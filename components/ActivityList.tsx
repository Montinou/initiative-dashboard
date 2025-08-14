"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ListTodo } from "lucide-react"
import { useActivities } from "@/hooks/useActivities"
import { useToast } from "@/hooks/use-toast"
import { ActivityItem } from "./ActivityItem"
import type { CompanyTheme } from "@/lib/theme-config"

interface ActivityListProps {
  initiativeId: string
  theme?: CompanyTheme | null
}

export function ActivityList({ initiativeId, theme }: ActivityListProps) {
  const [newActivityTitle, setNewActivityTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { activities, loading, error, createActivity } = useActivities(initiativeId)
  const { toast } = useToast()

  const handleAddActivity = async () => {
    if (!newActivityTitle.trim()) {
      toast({
        title: "Error",
        description: "Activity title cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await createActivity({
        title: newActivityTitle.trim(),
      })
      setNewActivityTitle("")
      setIsAdding(false)
      toast({
        title: "Success",
        description: "Activity created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create activity",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelAdd = () => {
    setNewActivityTitle("")
    setIsAdding(false)
  }

  const completedCount = activities.filter(activity => activity.completed).length
  const totalCount = activities.length

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded mb-4"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Error loading activities: {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-primary" />
            <CardTitle className="text-card-foreground">
              Activities ({completedCount}/{totalCount})
            </CardTitle>
          </div>
          {!isAdding && (
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
              variant="default"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Activity
            </Button>
          )}
        </div>
        {totalCount > 0 && (
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ 
                width: `${(completedCount / totalCount) * 100}%`
              }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new activity form */}
        {isAdding && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  value={newActivityTitle}
                  onChange={(e) => setNewActivityTitle(e.target.value)}
                  placeholder="Enter activity title..."
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddActivity()
                    } else if (e.key === 'Escape') {
                      handleCancelAdd()
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddActivity}
                  disabled={isLoading}
                  variant="default"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelAdd}
                  disabled={isLoading}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activities list */}
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No activities yet</p>
            {!isAdding && (
              <Button 
                onClick={() => setIsAdding(true)} 
                variant="default"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Activity
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                initiativeId={initiativeId}
                theme={theme}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}