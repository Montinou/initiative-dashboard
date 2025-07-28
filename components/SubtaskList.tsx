"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ListTodo } from "lucide-react"
import { useSubtasks } from "@/hooks/useSubtasks"
import { useToast } from "@/hooks/use-toast"
import { SubtaskItem } from "./SubtaskItem"
import type { CompanyTheme } from "@/lib/theme-config"

interface SubtaskListProps {
  initiativeId: string
  theme?: CompanyTheme | null
}

export function SubtaskList({ initiativeId, theme }: SubtaskListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { subtasks, loading, error, createSubtask } = useSubtasks(initiativeId)
  const { toast } = useToast()

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) {
      toast({
        title: "Error",
        description: "Subtask title cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await createSubtask({
        title: newSubtaskTitle.trim(),
      })
      setNewSubtaskTitle("")
      setIsAdding(false)
      toast({
        title: "Success",
        description: "Subtask created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create subtask",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelAdd = () => {
    setNewSubtaskTitle("")
    setIsAdding(false)
  }

  const completedCount = subtasks.filter(subtask => subtask.completed).length
  const totalCount = subtasks.length

  if (loading) {
    return (
      <Card className="glassmorphic-card">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-white/10 rounded mb-4"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-white/10 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glassmorphic-card">
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            Error loading subtasks: {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glassmorphic-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-white">
              Subtasks ({completedCount}/{totalCount})
            </CardTitle>
          </div>
          {!isAdding && (
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
              className="theme-button-secondary glassmorphic-button"
              style={theme ? { 
                backgroundColor: theme.colors.primary,
                color: '#FFFFFF'
              } : {}}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Subtask
            </Button>
          )}
        </div>
        {totalCount > 0 && (
          <div className="w-full bg-white/10 rounded-full h-2 mt-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(completedCount / totalCount) * 100}%`,
                background: theme 
                  ? `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`
                  : 'linear-gradient(to right, #8b5cf6, #06b6d4)'
              }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new subtask form */}
        {isAdding && (
          <Card className="glassmorphic-card border-white/20">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Enter subtask title..."
                  className="glassmorphic-input"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSubtask()
                    } else if (e.key === 'Escape') {
                      handleCancelAdd()
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddSubtask}
                  disabled={isLoading}
                  className="glassmorphic-button"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelAdd}
                  disabled={isLoading}
                  className="glassmorphic-button-ghost"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subtasks list */}
        {subtasks.length === 0 ? (
          <div className="text-center py-8">
            <ListTodo className="w-12 h-12 mx-auto text-white/40 mb-4" />
            <p className="text-white/70 mb-4">No subtasks yet</p>
            {!isAdding && (
              <Button 
                onClick={() => setIsAdding(true)} 
                className="theme-button-secondary glassmorphic-button"
                style={theme ? { 
                  backgroundColor: theme.colors.primary,
                  color: '#FFFFFF'
                } : {}}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Subtask
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {subtasks.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
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