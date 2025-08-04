// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          subdomain: string
          description: string | null
          industry: string | null
          is_active: boolean
          settings: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subdomain: string
          description?: string | null
          industry?: string | null
          is_active?: boolean
          settings?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string
          description?: string | null
          industry?: string | null
          is_active?: boolean
          settings?: any
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string | null
          role: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
          area_id: string | null
          avatar_url: string | null
          phone: string | null
          is_active: boolean
          is_system_admin: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id?: string
          email: string
          full_name?: string | null
          role?: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
          area_id?: string | null
          avatar_url?: string | null
          phone?: string | null
          is_active?: boolean
          is_system_admin?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string | null
          role?: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
          area_id?: string | null
          avatar_url?: string | null
          phone?: string | null
          is_active?: boolean
          is_system_admin?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      areas: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      initiatives: {
        Row: {
          id: string
          tenant_id: string
          title: string
          description: string | null
          progress: number
          status: 'En Curso' | 'Completado' | 'Atrasado' | 'En Pausa'
          area_id: string
          manager_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          title: string
          description?: string | null
          progress?: number
          status?: 'En Curso' | 'Completado' | 'Atrasado' | 'En Pausa'
          area_id: string
          manager_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          description?: string | null
          progress?: number
          status?: 'En Curso' | 'Completado' | 'Atrasado' | 'En Pausa'
          area_id?: string
          manager_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          initiative_id: string
          title: string
          description: string | null
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          initiative_id: string
          title: string
          description?: string | null
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          initiative_id?: string
          title?: string
          description?: string | null
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
      initiative_status: 'En Curso' | 'Completado' | 'Atrasado' | 'En Pausa'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}