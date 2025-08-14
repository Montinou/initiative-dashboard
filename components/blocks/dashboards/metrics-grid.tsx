import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface Metric {
  id: string
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
    period: string
  }
  progress?: number
  status?: "success" | "warning" | "error" | "info"
  target?: number
}

interface MetricsGridProps {
  metrics: Metric[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}

const statusColors = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
}

export function MetricsGrid({ 
  metrics, 
  columns = 4,
  className 
}: MetricsGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.id} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                {metric.description && (
                  <CardDescription className="text-xs">
                    {metric.description}
                  </CardDescription>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {metric.status && (
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", statusColors[metric.status])}
                  >
                    {metric.status}
                  </Badge>
                )}
                {Icon && (
                  <Icon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold">
                  {metric.value}
                  {metric.target && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {metric.target}
                    </span>
                  )}
                </div>
                
                {metric.progress !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{metric.progress}%</span>
                    </div>
                    <Progress value={metric.progress} className="h-2" />
                  </div>
                )}
                
                {metric.trend && (
                  <div className="flex items-center space-x-2 text-xs">
                    <span
                      className={cn(
                        "font-medium",
                        metric.trend.isPositive
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {metric.trend.isPositive ? "↗" : "↘"} {Math.abs(metric.trend.value)}%
                    </span>
                    <span className="text-muted-foreground">
                      vs {metric.trend.period}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}