"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2, X } from "lucide-react"
import { InitiativeForm } from "./InitiativeForm"
import { useInitiatives } from "@/hooks/useInitiatives"
import { useToast } from "@/hooks/use-toast"
import { useTenantId } from "@/lib/auth-context"
import { getThemeFromTenant, getThemeFromDomain, type CompanyTheme } from "@/lib/theme-config"
import type { InitiativeWithRelations } from "@/lib/types/database"

interface InitiativeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
  initiative?: InitiativeWithRelations | null
}

export function InitiativeModal({ 
  open, 
  onOpenChange, 
  onClose, 
  initiative 
}: InitiativeModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { deleteInitiative } = useInitiatives()
  const { toast } = useToast()
  const tenantId = useTenantId()
  const [theme, setTheme] = useState<CompanyTheme | null>(null)

  // Get theme based on user's organization (tenant_id) after login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (tenantId) {
        // Use organization-based theme after login
        const currentTheme = getThemeFromTenant(tenantId);
        setTheme(currentTheme);
      } else {
        // Fallback to domain-based theme if no tenant
        const currentTheme = getThemeFromDomain(window.location.hostname);
        setTheme(currentTheme);
      }
    }
  }, [tenantId])

  const handleDelete = async () => {
    if (!initiative) return

    try {
      setIsDeleting(true)
      await deleteInitiative(initiative.id)
      toast({
        title: "Success",
        description: "Initiative deleted successfully",
      })
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete initiative. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSuccess = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glassmorphic-modal max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white text-xl">
            {initiative ? "Edit Initiative" : "Create New Initiative"}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {initiative && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="glassmorphic-button-ghost text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="glassmorphic-button-ghost"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <InitiativeForm 
            initiative={initiative} 
            onSuccess={handleSuccess}
            theme={theme}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}