"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"

// Chart Colors using CSS variables
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

interface ChartData {
  [key: string]: any
}

interface BaseChartProps {
  title: string
  description?: string
  data: ChartData[]
  className?: string
}

interface LineChartBlockProps extends BaseChartProps {
  xKey: string
  yKey: string
  config: ChartConfig
}

export function LineChartBlock({
  title,
  description,
  data,
  xKey,
  yKey,
  config,
  className,
}: LineChartBlockProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xKey} 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey={yKey}
              type="monotone"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-1))" }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

interface BarChartBlockProps extends BaseChartProps {
  xKey: string
  yKey: string
  config: ChartConfig
}

export function BarChartBlock({
  title,
  description,
  data,
  xKey,
  yKey,
  config,
  className,
}: BarChartBlockProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={yKey} fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

interface AreaChartBlockProps extends BaseChartProps {
  xKey: string
  yKey: string
  config: ChartConfig
}

export function AreaChartBlock({
  title,
  description,
  data,
  xKey,
  yKey,
  config,
  className,
}: AreaChartBlockProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey={yKey}
              type="monotone"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.6}
              stroke="hsl(var(--chart-1))"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

interface PieChartBlockProps extends BaseChartProps {
  dataKey: string
  nameKey: string
  config: ChartConfig
}

export function PieChartBlock({
  title,
  description,
  data,
  dataKey,
  nameKey,
  config,
  className,
}: PieChartBlockProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CHART_COLORS[index % CHART_COLORS.length]} 
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

interface MultiLineChartBlockProps extends BaseChartProps {
  xKey: string
  lines: { yKey: string; color?: string; label?: string }[]
  config: ChartConfig
}

export function MultiLineChartBlock({
  title,
  description,
  data,
  xKey,
  lines,
  config,
  className,
}: MultiLineChartBlockProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {lines.map((line, index) => (
              <Line
                key={line.yKey}
                dataKey={line.yKey}
                type="monotone"
                stroke={line.color || CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ fill: line.color || CHART_COLORS[index % CHART_COLORS.length] }}
                name={line.label || line.yKey}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}