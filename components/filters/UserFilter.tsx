"use client"

import { useState, useEffect, useMemo } from "react"
import { User, Search, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { createClient } from '@/utils/supabase/client'

interface UserFilterProps {
  selected: string[]
  onChange: (userIds: string[]) => void
  areaId?: string // Optional area filter
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: string
  area?: {
    id: string
    name: string
  }
}

export function UserFilter({ selected, onChange, areaId }: UserFilterProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  // Fetch users from database
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      const supabase = createClient()
      
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          role,
          area:areas(id, name)
        `)
        .eq('is_active', true)
      
      // Filter by area if provided
      if (areaId) {
        query = query.eq('area_id', areaId)
      }
      
      const { data, error } = await query.order('full_name')
      
      if (!error && data) {
        setUsers(data as UserProfile[])
      }
      setLoading(false)
    }

    fetchUsers()
  }, [areaId])

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    
    const query = searchQuery.toLowerCase()
    return users.filter(user => 
      user.full_name?.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.area?.name.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  // Get selected user details
  const selectedUsers = useMemo(() => {
    return users.filter(user => selected.includes(user.id))
  }, [users, selected])

  const toggleUser = (userId: string) => {
    if (selected.includes(userId)) {
      onChange(selected.filter(id => id !== userId))
    } else {
      onChange([...selected, userId])
    }
  }

  const clearSelection = () => {
    onChange([])
    setSearchQuery("")
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Asignado a</span>
        {selected.length > 0 && (
          <Badge 
            variant="secondary"
            className="bg-purple-500/20 text-purple-100 border-purple-400/30"
          >
            {selected.length}
          </Badge>
        )}
      </div>

      {/* Trigger Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-between p-3 h-auto rounded-xl border transition-all duration-200",
          selected.length > 0
            ? "bg-purple-500/20 text-purple-100 border-purple-400/30"
            : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
        )}
      >
        <span className="text-sm">
          {selected.length === 0 
            ? "Seleccionar usuarios" 
            : `${selected.length} usuario${selected.length > 1 ? 's' : ''} seleccionado${selected.length > 1 ? 's' : ''}`
          }
        </span>
        <User className="h-4 w-4" />
      </Button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, email o área..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-400/50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-white/10"
              >
                <X className="h-3 w-3 text-white/70" />
              </Button>
            )}
          </div>

          {/* Users List */}
          <ScrollArea className="h-[240px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-20 text-white/50 text-sm">
                Cargando usuarios...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-white/50 text-sm">
                No se encontraron usuarios
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => {
                  const isSelected = selected.includes(user.id)
                  
                  return (
                    <Button
                      key={user.id}
                      variant="ghost"
                      onClick={() => toggleUser(user.id)}
                      className={cn(
                        "w-full justify-start p-2 h-auto rounded-lg transition-all duration-200",
                        isSelected
                          ? "bg-purple-500/20 hover:bg-purple-500/30"
                          : "hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {/* Avatar */}
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-purple-500/20 text-purple-100 text-xs">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* User Info */}
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-white/90">
                            {user.full_name || user.email}
                          </div>
                          <div className="text-xs text-white/60 flex items-center gap-2">
                            <span>{user.email}</span>
                            {user.area && (
                              <>
                                <span className="text-white/40">•</span>
                                <span>{user.area.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/30 border border-purple-400/50">
                            <Check className="h-3 w-3 text-purple-100" />
                          </div>
                        )}
                      </div>
                    </Button>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Selected Users Display */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="text-xs text-white/70 mb-2">Usuarios seleccionados:</div>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="bg-purple-500/20 text-purple-100 border-purple-400/30 pr-1"
                  >
                    <span className="text-xs">
                      {user.full_name || user.email.split('@')[0]}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleUser(user.id)
                      }}
                      className="ml-1 h-4 w-4 p-0 hover:bg-purple-500/30"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              
              {/* Clear Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="w-full text-xs text-white/60 hover:text-white/80 hover:bg-white/5"
              >
                Limpiar selección
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}