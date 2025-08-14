/**
 * Optimized Import Manager
 * Provides tree-shakeable imports and dynamic loading for shadcn/ui components
 */

// ============================================================================
// DYNAMIC COMPONENT IMPORTS FOR LAZY LOADING
// ============================================================================

import { lazy } from 'react';

// Heavy Components - Lazy Loaded
export const Dialog = lazy(() => import('@/components/ui/dialog').then(mod => ({ default: mod.Dialog })));
export const DialogContent = lazy(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogContent })));
export const DialogHeader = lazy(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogHeader })));
export const DialogTitle = lazy(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogTitle })));
export const DialogDescription = lazy(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogDescription })));
export const DialogFooter = lazy(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogFooter })));
export const DialogTrigger = lazy(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogTrigger })));

export const Sheet = lazy(() => import('@/components/ui/sheet').then(mod => ({ default: mod.Sheet })));
export const SheetContent = lazy(() => import('@/components/ui/sheet').then(mod => ({ default: mod.SheetContent })));
export const SheetHeader = lazy(() => import('@/components/ui/sheet').then(mod => ({ default: mod.SheetHeader })));
export const SheetTitle = lazy(() => import('@/components/ui/sheet').then(mod => ({ default: mod.SheetTitle })));
export const SheetDescription = lazy(() => import('@/components/ui/sheet').then(mod => ({ default: mod.SheetDescription })));
export const SheetFooter = lazy(() => import('@/components/ui/sheet').then(mod => ({ default: mod.SheetFooter })));
export const SheetTrigger = lazy(() => import('@/components/ui/sheet').then(mod => ({ default: mod.SheetTrigger })));

export const Calendar = lazy(() => import('@/components/ui/calendar'));
export const DateRangePicker = lazy(() => import('@/components/ui/date-range-picker'));
export const Command = lazy(() => import('@/components/ui/command'));
export const Carousel = lazy(() => import('@/components/ui/carousel'));
export const Chart = lazy(() => import('@/components/ui/chart'));

// ============================================================================
// TREE-SHAKEABLE ICON IMPORTS
// ============================================================================

// Instead of importing entire lucide-react, import specific icons
export const createOptimizedIconImport = (iconName: string) => {
  return lazy(() => import(`lucide-react/${iconName}`));
};

// Commonly used icons with optimized imports
export const TrendingUp = lazy(() => import('lucide-react/icons/trending-up'));
export const TrendingDown = lazy(() => import('lucide-react/icons/trending-down'));
export const Target = lazy(() => import('lucide-react/icons/target'));
export const Users = lazy(() => import('lucide-react/icons/users'));
export const AlertTriangle = lazy(() => import('lucide-react/icons/alert-triangle'));
export const CheckCircle = lazy(() => import('lucide-react/icons/check-circle'));
export const AlertCircle = lazy(() => import('lucide-react/icons/alert-circle'));
export const Download = lazy(() => import('lucide-react/icons/download'));
export const Upload = lazy(() => import('lucide-react/icons/upload'));
export const Plus = lazy(() => import('lucide-react/icons/plus'));
export const RefreshCw = lazy(() => import('lucide-react/icons/refresh-cw'));
export const Settings = lazy(() => import('lucide-react/icons/settings'));
export const Calendar as CalendarIcon = lazy(() => import('lucide-react/icons/calendar'));
export const Clock = lazy(() => import('lucide-react/icons/clock'));
export const Activity = lazy(() => import('lucide-react/icons/activity'));
export const BarChart3 = lazy(() => import('lucide-react/icons/bar-chart-3'));
export const PieChart = lazy(() => import('lucide-react/icons/pie-chart'));

// ============================================================================
// OPTIMIZED UI COMPONENT BUNDLE
// ============================================================================

// Lightweight components that can be imported directly
export { Button } from '@/components/ui/button';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
export { Badge } from '@/components/ui/badge';
export { Input } from '@/components/ui/input';
export { Label } from '@/components/ui/label';
export { Textarea } from '@/components/ui/textarea';
export { Switch } from '@/components/ui/switch';
export { Checkbox } from '@/components/ui/checkbox';
export { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
export { Separator } from '@/components/ui/separator';
export { Progress } from '@/components/ui/progress';
export { Skeleton } from '@/components/ui/skeleton';
export { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================================================
// DYNAMIC COMPONENT LOADER WITH ERROR BOUNDARIES
// ============================================================================

import { Suspense, ComponentType } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface DynamicComponentProps {
  component: ComponentType<any>;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  props?: any;
}

export const DynamicComponent: React.FC<DynamicComponentProps> = ({
  component: Component,
  fallback = <LoadingSpinner />,
  errorFallback = <div>Failed to load component</div>,
  props = {}
}) => {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// ============================================================================
// PERFORMANCE OPTIMIZED COMPONENT GROUPS
// ============================================================================

// Form components - grouped for form pages
export const FormComponents = {
  Form: lazy(() => import('@/components/ui/form').then(mod => ({ default: mod.Form }))),
  FormField: lazy(() => import('@/components/ui/form').then(mod => ({ default: mod.FormField }))),
  FormItem: lazy(() => import('@/components/ui/form').then(mod => ({ default: mod.FormItem }))),
  FormLabel: lazy(() => import('@/components/ui/form').then(mod => ({ default: mod.FormLabel }))),
  FormControl: lazy(() => import('@/components/ui/form').then(mod => ({ default: mod.FormControl }))),
  FormDescription: lazy(() => import('@/components/ui/form').then(mod => ({ default: mod.FormDescription }))),
  FormMessage: lazy(() => import('@/components/ui/form').then(mod => ({ default: mod.FormMessage }))),
};

// Table components - grouped for data display pages
export const TableComponents = {
  Table: lazy(() => import('@/components/ui/table').then(mod => ({ default: mod.Table }))),
  TableHeader: lazy(() => import('@/components/ui/table').then(mod => ({ default: mod.TableHeader }))),
  TableBody: lazy(() => import('@/components/ui/table').then(mod => ({ default: mod.TableBody }))),
  TableFooter: lazy(() => import('@/components/ui/table').then(mod => ({ default: mod.TableFooter }))),
  TableRow: lazy(() => import('@/components/ui/table').then(mod => ({ default: mod.TableRow }))),
  TableHead: lazy(() => import('@/components/ui/table').then(mod => ({ default: mod.TableHead }))),
  TableCell: lazy(() => import('@/components/ui/table').then(mod => ({ default: mod.TableCell }))),
  TableCaption: lazy(() => import('@/components/ui/table').then(mod => ({ default: mod.TableCaption }))),
};

// Navigation components - grouped for layout
export const NavigationComponents = {
  Tabs: lazy(() => import('@/components/ui/tabs').then(mod => ({ default: mod.Tabs }))),
  TabsList: lazy(() => import('@/components/ui/tabs').then(mod => ({ default: mod.TabsList }))),
  TabsTrigger: lazy(() => import('@/components/ui/tabs').then(mod => ({ default: mod.TabsTrigger }))),
  TabsContent: lazy(() => import('@/components/ui/tabs').then(mod => ({ default: mod.TabsContent }))),
  Breadcrumb: lazy(() => import('@/components/ui/breadcrumb')),
  NavigationMenu: lazy(() => import('@/components/ui/navigation-menu')),
};

// ============================================================================
// BUNDLED COMPONENT IMPORTS FOR CRITICAL PATH
// ============================================================================

// Critical components that should be in main bundle
export const CriticalComponents = {
  Button: require('@/components/ui/button').Button,
  Card: require('@/components/ui/card').Card,
  CardContent: require('@/components/ui/card').CardContent,
  CardHeader: require('@/components/ui/card').CardHeader,
  CardTitle: require('@/components/ui/card').CardTitle,
  Input: require('@/components/ui/input').Input,
  Label: require('@/components/ui/label').Label,
};

// ============================================================================
// EXPORT OPTIMIZATION UTILITIES
// ============================================================================

export const loadComponent = (importFn: () => Promise<any>) => {
  return lazy(() => importFn());
};

export const createAsyncComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>
) => {
  return lazy(() => 
    importFn().then(mod => ({ 
      default: 'default' in mod ? mod.default : mod 
    }))
  );
};

// Component size tracker for debugging
export const ComponentSizeTracker = {
  track: (componentName: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Loading component: ${componentName}`);
    }
  },
  
  measureBundle: () => {
    if (process.env.NODE_ENV === 'development' && 'performance' in window) {
      const entries = performance.getEntriesByType('navigation');
      console.log('Bundle performance metrics:', entries);
    }
  }
};