"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { canAccessManagerDashboard } from '@/lib/manager-permissions';
import { Loader2 } from 'lucide-react';

interface ManagerGuardProps {
  children: React.ReactNode;
  requireAreaAccess?: boolean;
  requiredAreaId?: string;
  fallbackPath?: string;
}

/**
 * ManagerGuard - Protects routes that require manager-level permissions
 * 
 * Features:
 * - Ensures user is authenticated and has Manager role
 * - Optionally validates area access for specific routes
 * - Redirects unauthorized users to appropriate fallback
 * - Shows loading state during authentication checks
 */
export function ManagerGuard({ 
  children, 
  requireAreaAccess = false,
  requiredAreaId,
  fallbackPath = '/unauthorized' 
}: ManagerGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  // Manager context logic inline
  const isManager = profile?.role === 'Manager';
  const managedAreaId = isManager ? profile?.area_id : null;
  const canManageArea = (areaId: string): boolean => {
    return isManager && profile?.area_id === areaId;
  };

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Not authenticated
    if (!user || !profile) {
      router.push('/auth/login');
      return;
    }

    // Not a manager
    if (!isManager || !canAccessManagerDashboard(profile.role)) {
      router.push(fallbackPath);
      return;
    }

    // Require area access but no area assigned
    if (requireAreaAccess && !managedAreaId) {
      console.error('Manager has no assigned area');
      router.push('/unauthorized');
      return;
    }

    // Require specific area access
    if (requiredAreaId && !canManageArea(requiredAreaId)) {
      console.error(`Manager cannot access area: ${requiredAreaId}`);
      router.push('/unauthorized');
      return;
    }
  }, [
    user, 
    profile, 
    loading, 
    isManager, 
    managedAreaId, 
    requireAreaAccess, 
    requiredAreaId, 
    canManageArea, 
    router, 
    fallbackPath
  ]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Verificando permisos de gerente...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user || !profile) {
    return null; // Will redirect
  }

  // Not authorized
  if (!isManager || !canAccessManagerDashboard(profile.role)) {
    return null; // Will redirect
  }

  // Area access required but not available
  if (requireAreaAccess && !managedAreaId) {
    return null; // Will redirect
  }

  // Specific area access required but not available
  if (requiredAreaId && !canManageArea(requiredAreaId)) {
    return null; // Will redirect
  }

  // All checks passed - render children
  return <>{children}</>;
}

/**
 * ManagerAreaGuard - Specifically guards routes that require area management access
 */
export function ManagerAreaGuard({ 
  children, 
  areaId 
}: { 
  children: React.ReactNode; 
  areaId?: string;
}) {
  return (
    <ManagerGuard 
      requireAreaAccess={true} 
      requiredAreaId={areaId}
      fallbackPath="/manager-dashboard"
    >
      {children}
    </ManagerGuard>
  );
}

/**
 * ManagerUploadGuard - Guards file upload routes
 */
export function ManagerUploadGuard({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();
  
  // Manager context logic inline
  const isManager = profile?.role === 'Manager';
  const managedAreaId = isManager ? profile?.area_id : null;

  useEffect(() => {
    if (!profile) return;

    if (!isManager || !managedAreaId) {
      router.push('/manager-dashboard');
      return;
    }
  }, [profile, isManager, managedAreaId, router]);

  if (!isManager || !managedAreaId) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for manager route protection
 */
export function withManagerGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requireAreaAccess?: boolean;
    requiredAreaId?: string;
    fallbackPath?: string;
  }
) {
  return function ManagerProtectedComponent(props: P) {
    return (
      <ManagerGuard {...options}>
        <Component {...props} />
      </ManagerGuard>
    );
  };
}

/**
 * Hook for checking manager access in components
 */
export function useManagerGuard() {
  const { user, profile, loading } = useAuth();
  
  // Manager context logic inline
  const isManager = profile?.role === 'Manager';
  const managedAreaId = isManager ? profile?.area_id : null;
  const canManageArea = (areaId: string): boolean => {
    return isManager && profile?.area_id === areaId;
  };

  const checkAccess = (areaId?: string) => {
    if (loading) return { loading: true, hasAccess: false };
    if (!user || !profile) return { loading: false, hasAccess: false };
    if (!isManager) return { loading: false, hasAccess: false };
    if (areaId && !canManageArea(areaId)) return { loading: false, hasAccess: false };

    return { loading: false, hasAccess: true };
  };

  return {
    isAuthenticated: !!user,
    isManager,
    managedAreaId,
    canManageArea,
    checkAccess,
    loading
  };
}