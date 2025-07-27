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
  const { session } = useAuth();
  const [data, setData] = useState<OKRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOKRData = async () => {
    if (!session?.access_token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/okrs/departments', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch OKR data');
      }
    } catch (err) {
      console.error('Error fetching OKR data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOKRData();
  }, [session?.access_token]);

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