"use client"

import { type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

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

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
      <SidebarMenu>
        {/* Main Objectives Link */}
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            className={cn(
              pathname === item.url && "bg-primary/10 text-primary font-medium"
            )}
          >
            <Link href={item.url}>
              {item.icon && <item.icon />}
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        {/* Nested Items - Always Visible */}
        {item.items && item.items.length > 0 && (
          <>
            {item.items.map((subItem) => (
              <SidebarMenuItem key={subItem.title}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "pl-9",
                    pathname === subItem.url && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  <Link href={subItem.url}>
                    <span className="text-sm">{subItem.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}