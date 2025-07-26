import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          email: string
          name: string
          role: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
          area_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          name: string
          role: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
          area_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          name?: string
          role?: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
          area_id?: string | null
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
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