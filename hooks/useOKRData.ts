import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface OKRActivity {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: string;
  responsiblePerson: string;
  dueDate: string;
}

interface OKRInitiative {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  priority: string;
  leader: string;
  startDate: string;
  targetDate: string;
  completionDate?: string;
  obstacles: string;
  enablers: string;
  activitiesCount: number;
  activities: OKRActivity[];
}

interface CriticalInitiative {
  id: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  leader: string;
}

interface DepartmentOKR {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  manager?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  metrics: {
    totalInitiatives: number;
    completedInitiatives: number;
    inProgressInitiatives: number;
    planningInitiatives: number;
    onHoldInitiatives: number;
    totalActivities: number;
    criticalCount: number;
  };
  initiatives: OKRInitiative[];
  criticalInitiatives: CriticalInitiative[];
}

interface TenantSummary {
  totalDepartments: number;
  totalInitiatives: number;
  totalActivities: number;
  avgTenantProgress: number;
  departmentsByStatus: {
    green: number;
    yellow: number;
    red: number;
  };
  criticalInitiatives: number;
}

interface OKRData {
  departments: DepartmentOKR[];
  summary: TenantSummary;
  lastUpdated: string;
}

interface UseOKRDataReturn {
  data: OKRData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOKRDepartments(): UseOKRDataReturn {
  const { session, profile } = useAuth();
  const [data, setData] = useState<OKRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOKRData = async () => {
    console.log('useOKRDepartments: fetchOKRData called, session:', session ? 'Found' : 'None');
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        includeStats: 'true'
      });
      
      if (profile?.tenant_id) {
        params.append('tenant_id', profile.tenant_id);
      }

      const response = await fetch(`/api/areas?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('useOKRDepartments: API error:', {
          status: response.status,
          error: errorData.error,
          userId: session?.user?.id
        });
        
        // Handle 404 as empty data instead of error for missing tenant data
        if (response.status === 404) {
          console.log('useOKRDepartments: No OKR data found (404), returning empty data');
          setData({
            departments: [],
            summary: {
              totalDepartments: 0,
              totalInitiatives: 0,
              totalActivities: 0,
              avgTenantProgress: 0,
              departmentsByStatus: { green: 0, yellow: 0, red: 0 },
              criticalInitiatives: 0
            },
            lastUpdated: new Date().toISOString()
          });
          setLoading(false);
          return;
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Transform areas data to match OKR data structure
      if (result.areas) {
        const transformedData = {
          departments: result.areas.map((area: any) => ({
            id: area.id,
            name: area.name,
            description: area.description || '',
            status: area.stats?.completed > 0 ? 'completed' : 
                    area.stats?.in_progress > 0 ? 'in_progress' : 
                    area.stats?.planning > 0 ? 'planning' : 'not_started',
            progress: area.stats?.averageProgress || 0,
            manager: area.user_profiles || null,
            metrics: {
              totalInitiatives: area.stats?.total || 0,
              completedInitiatives: area.stats?.completed || 0,
              inProgressInitiatives: area.stats?.in_progress || 0,
              planningInitiatives: area.stats?.planning || 0,
              onHoldInitiatives: area.stats?.on_hold || 0,
              totalActivities: 0, // Not available in areas API
              criticalCount: 0    // Not available in areas API
            },
            initiatives: [], // Would need separate API call
            criticalInitiatives: [] // Would need separate API call
          })),
          summary: {
            totalDepartments: result.areas.length,
            totalInitiatives: result.areas.reduce((sum: number, area: any) => sum + (area.stats?.total || 0), 0),
            totalActivities: 0, // Not available
            avgTenantProgress: result.areas.length > 0 ? 
              Math.round(result.areas.reduce((sum: number, area: any) => sum + (area.stats?.averageProgress || 0), 0) / result.areas.length) : 0,
            departmentsByStatus: {
              green: result.areas.filter((area: any) => (area.stats?.averageProgress || 0) >= 75).length,
              yellow: result.areas.filter((area: any) => {
                const progress = area.stats?.averageProgress || 0;
                return progress >= 25 && progress < 75;
              }).length,
              red: result.areas.filter((area: any) => (area.stats?.averageProgress || 0) < 25).length
            },
            criticalInitiatives: 0 // Not available in areas API
          },
          lastUpdated: new Date().toISOString()
        };
        
        setData(transformedData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching OKR data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useOKRDepartments: useEffect triggered');
    fetchOKRData();
  }, [session, profile]);

  return {
    data,
    loading,
    error,
    refetch: fetchOKRData
  };
}

// Hook for individual department OKR data
export function useDepartmentOKRs(departmentId: string) {
  const { data, loading, error, refetch } = useOKRDepartments();
  
  const departmentData = data?.departments.find(dept => dept.id === departmentId);
  
  return {
    data: departmentData || null,
    loading,
    error,
    refetch
  };
}