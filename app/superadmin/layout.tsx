'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, 
  Shield, 
  Users, 
  Building2, 
  FileText, 
  Settings,
  Activity,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';

interface SuperadminUser {
  id: string;
  email: string;
  name: string;
  last_login: string | null;
}

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SuperadminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/superadmin/auth/session');
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.superadmin);
      } else {
        // Not authenticated, redirect to login
        router.push('/superadmin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/superadmin/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/superadmin/auth/logout', { method: 'POST' });
      router.push('/superadmin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect anyway
      router.push('/superadmin/login');
    }
  };

  // Don't render layout for login page
  if (pathname === '/superadmin/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-purple-500 animate-pulse" />
          <p className="text-white">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/superadmin/dashboard',
      icon: Activity,
    },
    {
      name: 'Tenants',
      href: '/superadmin/tenants',
      icon: Building2,
    },
    {
      name: 'Users',
      href: '/superadmin/users',
      icon: Users,
    },
    {
      name: 'Area Templates',
      href: '/superadmin/templates',
      icon: FileText,
    },
    {
      name: 'Audit Log',
      href: '/superadmin/audit',
      icon: AlertTriangle,
    },
    {
      name: 'Settings',
      href: '/superadmin/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Superadmin</p>
                <p className="text-xs text-slate-400">Platform Control</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </a>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-slate-700 p-4">
            <div className="mb-3">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                Superadmin
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {navigation.find(item => item.href === pathname)?.name || 'Superadmin'}
                </h1>
                <p className="text-sm text-slate-400">
                  Platform administration and monitoring
                </p>
              </div>
            </div>

            {/* Security indicator */}
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="border-green-500 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                Secure Session
              </Badge>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}