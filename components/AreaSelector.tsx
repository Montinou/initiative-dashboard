"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Building2, Edit2, Trash2 } from "lucide-react"
import { useAreas } from "@/hooks/useAreas"
import { useToast } from "@/hooks/use-toast"
import type { Area } from "@/types/database"

interface AreaSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function AreaSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select a company area...",
  className 
}: AreaSelectorProps) {
  const [showManageModal, setShowManageModal] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [newAreaName, setNewAreaName] = useState("")
  const [newAreaDescription, setNewAreaDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const { areas, createArea, updateArea, deleteArea } = useAreas()
  const { toast } = useToast()

  const handleCreateArea = async () => {
    if (!newAreaName.trim()) {
      toast({
        title: "Error",
        description: "Area name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const newArea = await createArea({
        name: newAreaName.trim(),
        description: newAreaDescription.trim() || undefined,
      })
      
      setNewAreaName("")
      setNewAreaDescription("")
      onValueChange(newArea.id)
      
      toast({
        title: "Success",
        description: "Company area created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create company area",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateArea = async () => {
    if (!editingArea || !newAreaName.trim()) return

    try {
      setIsLoading(true)
      await updateArea(editingArea.id, {
        name: newAreaName.trim(),
        description: newAreaDescription.trim() || undefined,
      })
      
      setEditingArea(null)
      setNewAreaName("")
      setNewAreaDescription("")
      
      toast({
        title: "Success",
        description: "Company area updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update company area",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteArea = async (area: Area) => {
    if (!confirm(`Are you sure you want to delete "${area.name}"?`)) return

    try {
      setIsLoading(true)
      await deleteArea(area.id)
      
      // If the deleted area was selected, clear the selection
      if (value === area.id) {
        onValueChange("")
      }
      
      toast({
        title: "Success",
        description: "Company area deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete company area. It may have initiatives assigned to it.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startEditArea = (area: Area) => {
    setEditingArea(area)
    setNewAreaName(area.name)
    setNewAreaDescription(area.description || "")
  }

  const cancelEdit = () => {
    setEditingArea(null)
    setNewAreaName("")
    setNewAreaDescription("")
  }

  return (
    <div className="space-y-2">
      <Select value={value || ""} onValueChange={onValueChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="glassmorphic-dropdown">
          <SelectItem value="unassigned">No area assigned</SelectItem>
          {areas.filter(area => area.id && area.name).map((area) => (
            <SelectItem key={area.id} value={area.id || `area-${Math.random()}`}>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {area.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="glassmorphic-button-ghost w-full">
            <Plus className="w-4 h-4 mr-2" />
            Manage Areas
          </Button>
        </DialogTrigger>
        <DialogContent className="glassmorphic-modal max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Company Areas</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Create/Edit Area Form */}
            <Card className="glassmorphic-card">
              <CardContent className="p-4">
                <h3 className="text-white font-medium mb-4">
                  {editingArea ? "Edit Area" : "Create New Area"}
                </h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Area name..."
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    className="glassmorphic-input"
                    disabled={isLoading}
                  />
                  <Textarea
                    placeholder="Area description (optional)..."
                    value={newAreaDescription}
                    onChange={(e) => setNewAreaDescription(e.target.value)}
                    className="glassmorphic-input min-h-[80px]"
                    disabled={isLoading}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={editingArea ? handleUpdateArea : handleCreateArea}
                      disabled={isLoading || !newAreaName.trim()}
                      className="glassmorphic-button"
                    >
                      {isLoading ? "Saving..." : editingArea ? "Update Area" : "Create Area"}
                    </Button>
                    {editingArea && (
                      <Button
                        onClick={cancelEdit}
                        variant="ghost"
                        disabled={isLoading}
                        className="glassmorphic-button-ghost"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Areas List */}
            <div className="space-y-3">
              <h3 className="text-white font-medium">Existing Areas</h3>
              {areas.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-white/40 mb-4" />
                  <p className="text-white/70">No company areas yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {areas.map((area) => (
                    <Card key={area.id} className="glassmorphic-card border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{area.name}</h4>
                            {area.description && (
                              <p className="text-white/70 text-sm mt-1">{area.description}</p>
                            )}
                            <p className="text-white/50 text-xs mt-2">
                              Created {new Date(area.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditArea(area)}
                              disabled={isLoading}
                              className="glassmorphic-button-ghost h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteArea(area)}
                              disabled={isLoading}
                              className="glassmorphic-button-ghost h-8 w-8 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}