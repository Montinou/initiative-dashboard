import { createClient } from './supabase-client'
import { Database } from './supabase'

type Tables = Database['public']['Tables']
type Initiative = Tables['initiatives']['Row']
type Area = Tables['areas']['Row']
type User = Tables['users']['Row']
type Activity = Tables['activities']['Row']

export class DatabaseService {
  private supabase = createClient()

  // Initiative operations
  async getInitiatives(): Promise<Initiative[]> {
    const { data, error } = await this.supabase
      .from('initiatives')
      .select(`
        *,
        area:areas(name),
        manager:users(name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getInitiativeById(id: string): Promise<Initiative | null> {
    const { data, error } = await this.supabase
      .from('initiatives')
      .select(`
        *,
        area:areas(name),
        manager:users(name),
        activities(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createInitiative(initiative: Tables['initiatives']['Insert']): Promise<Initiative> {
    const { data, error } = await this.supabase
      .from('initiatives')
      .insert(initiative)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateInitiative(id: string, updates: Tables['initiatives']['Update']): Promise<Initiative> {
    const { data, error } = await this.supabase
      .from('initiatives')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteInitiative(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('initiatives')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Area operations
  async getAreas(): Promise<Area[]> {
    const { data, error } = await this.supabase
      .from('areas')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  }

  async createArea(area: Tables['areas']['Insert']): Promise<Area> {
    const { data, error } = await this.supabase
      .from('areas')
      .insert(area)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateArea(id: string, updates: Tables['areas']['Update']): Promise<Area> {
    const { data, error } = await this.supabase
      .from('areas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteArea(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('areas')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // User operations
  async getUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        *,
        area:areas(name)
      `)
      .order('name')

    if (error) throw error
    return data || []
  }

  async createUser(user: Tables['users']['Insert']): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateUser(id: string, updates: Tables['users']['Update']): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Activity operations
  async getActivitiesByInitiative(initiativeId: string): Promise<Activity[]> {
    const { data, error } = await this.supabase
      .from('activities')
      .select('*')
      .eq('initiative_id', initiativeId)
      .order('created_at')

    if (error) throw error
    return data || []
  }

  async createActivity(activity: Tables['activities']['Insert']): Promise<Activity> {
    const { data, error } = await this.supabase
      .from('activities')
      .insert(activity)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateActivity(id: string, updates: Tables['activities']['Update']): Promise<Activity> {
    const { data, error } = await this.supabase
      .from('activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteActivity(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('activities')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Dashboard analytics
  async getDashboardData() {
    const [initiatives, areas] = await Promise.all([
      this.getInitiatives(),
      this.getAreas()
    ])

    // Calculate analytics from the data
    const totalInitiatives = initiatives.length
    const progressData = this.calculateProgressDistribution(initiatives)
    const statusData = this.calculateStatusDistribution(initiatives)
    const areaData = this.calculateAreaProgress(initiatives, areas)

    return {
      totalInitiatives,
      progressData,
      statusData,
      areaData,
      initiatives,
      areas
    }
  }

  private calculateProgressDistribution(initiatives: Initiative[]) {
    const ranges = [
      { name: '0-25%', min: 0, max: 25 },
      { name: '26-50%', min: 26, max: 50 },
      { name: '51-75%', min: 51, max: 75 },
      { name: '76-100%', min: 76, max: 100 }
    ]

    return ranges.map(range => ({
      range: range.name,
      count: initiatives.filter(i => i.progress >= range.min && i.progress <= range.max).length
    }))
  }

  private calculateStatusDistribution(initiatives: Initiative[]) {
    const statuses = ['En Curso', 'Completado', 'Atrasado', 'En Pausa']
    
    return statuses.map(status => ({
      status,
      count: initiatives.filter(i => i.status === status).length
    }))
  }

  private calculateAreaProgress(initiatives: Initiative[], areas: Area[]) {
    return areas.map(area => {
      const areaInitiatives = initiatives.filter(i => i.area_id === area.id)
      const avgProgress = areaInitiatives.length > 0 
        ? areaInitiatives.reduce((sum, i) => sum + i.progress, 0) / areaInitiatives.length
        : 0

      return {
        area: area.name,
        progress: Math.round(avgProgress),
        count: areaInitiatives.length
      }
    })
  }
}

export const db = new DatabaseService()