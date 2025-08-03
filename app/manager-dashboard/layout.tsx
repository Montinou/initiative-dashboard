import { Metadata } from 'next';
import { ManagerGuard } from '@/components/manager/ManagerGuard';
import { ManagerAreaProvider } from '@/components/manager/ManagerAreaProvider';
import { ManagerHeader } from '@/components/manager/ManagerHeader';
import { ManagerNavigation } from '@/components/manager/ManagerNavigation';
import { ErrorBoundary } from '@/components/manager/ErrorBoundary';
import { PageErrorFallbackWrapper } from '@/components/manager/PageErrorFallbackWrapper';

export const metadata: Metadata = {
  title: 'Manager Dashboard | Mariana',
  description: 'Area-specific management dashboard for initiative oversight and file uploads',
};

interface ManagerDashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Manager Dashboard Layout
 * 
 * Provides:
 * - Manager role authentication and area access validation
 * - Area context for all child components
 * - Consistent layout structure for manager pages
 * - Security boundaries for area-isolated data
 */
export default function ManagerDashboardLayout({ 
  children 
}: ManagerDashboardLayoutProps) {
  return (
    <ErrorBoundary 
      level="page" 
      fallback={<PageErrorFallbackWrapper />}
    >
      <ManagerGuard requireAreaAccess={true}>
        <ManagerAreaProvider>
          <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background">
            <div className="flex flex-col lg:flex-row">
              {/* Manager Navigation Sidebar */}
              <ErrorBoundary level="component" retryable={true}>
                <aside className="w-full lg:w-72 lg:min-h-screen border-r border-border/50 bg-gradient-to-b from-card/80 via-card/60 to-card/80 backdrop-blur-xl">
                  <div className="p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        Manager Portal
                      </h2>
                      <div className="h-px bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
                    </div>
                    <ManagerNavigation />
                  </div>
                </aside>
              </ErrorBoundary>

              {/* Main Content Area */}
              <main className="flex-1 min-h-screen flex flex-col">
                {/* Header */}
                <ErrorBoundary level="component" retryable={true}>
                  <ManagerHeader />
                </ErrorBoundary>
                
                {/* Content */}
                <div className="flex-1 bg-gradient-to-br from-background/50 via-transparent to-background/30">
                  <ErrorBoundary level="page" retryable={true}>
                    {children}
                  </ErrorBoundary>
                </div>
              </main>
            </div>
          </div>
        </ManagerAreaProvider>
      </ManagerGuard>
    </ErrorBoundary>
  );
}