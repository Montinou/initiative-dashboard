"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavObjectives({
  item,
}: {
  item: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }
}) {
  const pathname = usePathname()
  const isExpanded = pathname.startsWith("/dashboard/objectives") || 
                     pathname.startsWith("/dashboard/initiatives") || 
                     pathname.startsWith("/dashboard/activities")

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible defaultOpen={isExpanded} asChild>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              className={cn(
                pathname === item.url && "bg-primary/10 text-primary"
              )}
            >
              <Link href={item.url}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                className="data-[state=open]:rotate-90"
                size="sm"
              >
                <ChevronRight className="transition-transform" />
                <span className="sr-only">Toggle</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      asChild
                      className={cn(
                        pathname === subItem.url && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Link href={subItem.url}>
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  )
}