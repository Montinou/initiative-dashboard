"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Target, 
  Edit, 
  Trash2, 
  Calendar,
  Users,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ObjectiveWithRelations } from '@/hooks/useObjectives'

interface FixedHeightObjectiveCardProps {
  objective: ObjectiveWithRelations
  onEdit: () => void
  onDelete: () => void
  className?: string
}

export function FixedHeightObjectiveCard({ 
  objective, 
  onEdit, 
  onDelete,
  className 
}: FixedHeightObjectiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Determine status color and icon
  const isOnTrack = objective.is_on_track
  const statusIcon = isOnTrack ? <TrendingUp className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />
  const progressPercentage = objective.completion_percentage || 0

  return (
    <Card className={cn(
      "glass-card flex flex-col min-h-[200px] hover:border-primary/30 transition-all",
      "hover:shadow-lg