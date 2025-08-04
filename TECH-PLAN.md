# KPI Standardization System - Technical Implementation Plan

## Executive Summary
This technical plan provides a comprehensive implementation strategy for standardizing KPI data and improving initiative management through role-based forms, enhanced dashboards, and optimized data architecture.

## System Architecture Overview

### Current State Analysis
- **Framework**: Next.js 15.2.4 with App Router, React 19, TypeScript
- **Database**: PostgreSQL with Supabase, multi-tenant architecture
- **UI Components**: Radix UI with glassmorphism design system
- **File Processing**: Excel import system with existing infrastructure
- **Authentication**: Supabase Auth with role-based permissions

### Target Architecture Improvements
- Enhanced data models for precise KPI calculations
- Role-based form components with intelligent permissions
- Real-time progress tracking with optimistic updates
- Improved Excel import with comprehensive validation
- AI-optimized data structure for Stratix assistant

## Database Schema Enhancements

### 1. Enhanced Initiatives Table
```sql
-- Extend existing initiatives table
ALTER TABLE initiatives 
ADD COLUMN progress_method TEXT DEFAULT 'manual' CHECK (progress_method IN ('manual', 'subtask_based', 'hybrid')),
ADD COLUMN weight_factor DECIMAL(3,2) DEFAULT 1.0,  -- For weighted KPI calculations
ADD COLUMN estimated_hours INTEGER,
ADD COLUMN actual_hours INTEGER DEFAULT 0,
ADD COLUMN kpi_category TEXT DEFAULT 'operational',
ADD COLUMN is_strategic BOOLEAN DEFAULT false,
ADD COLUMN dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN success_criteria JSONB DEFAULT '{}'::jsonb;

-- Create index for better KPI query performance
CREATE INDEX idx_initiatives_kpi_calculations ON initiatives (status, progress, target_date, area_id, tenant_id);
CREATE INDEX idx_initiatives_strategic ON initiatives (is_strategic, kpi_category, tenant_id);
```

### 2. Enhanced Subtasks Table
```sql
-- Extend existing subtasks table (activities)
ALTER TABLE activities 
ADD COLUMN weight_percentage DECIMAL(5,2) DEFAULT 10.0 CHECK (weight_percentage > 0 AND weight_percentage <= 100),
ADD COLUMN estimated_hours INTEGER,
ADD COLUMN actual_hours INTEGER DEFAULT 0,
ADD COLUMN completion_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN validation_criteria TEXT,
ADD COLUMN subtask_order INTEGER DEFAULT 0;

-- Ensure weight percentages add up to 100% per initiative
CREATE OR REPLACE FUNCTION validate_subtask_weights()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if total weights exceed 100%
    IF (SELECT SUM(weight_percentage) FROM activities 
        WHERE initiative_id = NEW.initiative_id) > 100 THEN
        RAISE EXCEPTION 'Total subtask weights cannot exceed 100%% for initiative %', NEW.initiative_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subtask_weight_validation 
BEFORE INSERT OR UPDATE ON activities 
FOR EACH ROW EXECUTE FUNCTION validate_subtask_weights();
```

### 3. KPI Calculation View
```sql
-- Create materialized view for efficient KPI calculations
CREATE MATERIALIZED VIEW kpi_summary AS
SELECT 
    i.tenant_id,
    i.area_id,
    a.name as area_name,
    COUNT(i.id) as total_initiatives,
    COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_initiatives,
    ROUND(AVG(i.progress), 2) as average_progress,
    COUNT(CASE WHEN i.target_date < CURRENT_DATE AND i.status != 'completed' THEN 1 END) as overdue_initiatives,
    SUM(CASE WHEN i.is_strategic THEN i.weight_factor ELSE 0 END) as strategic_weight,
    ROUND(AVG(CASE WHEN i.is_strategic THEN i.progress ELSE NULL END), 2) as strategic_progress,
    SUM(i.budget) as total_budget,
    SUM(i.actual_cost) as total_actual_cost,
    CURRENT_TIMESTAMP as last_updated
FROM initiatives i 
JOIN areas a ON i.area_id = a.id 
WHERE i.is_active = true
GROUP BY i.tenant_id, i.area_id, a.name;

-- Create index and refresh function
CREATE UNIQUE INDEX idx_kpi_summary_unique ON kpi_summary (tenant_id, area_id);
CREATE OR REPLACE FUNCTION refresh_kpi_summary() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY kpi_summary;
END;
$$ LANGUAGE plpgsql;
```

### 4. Progress History Enhancement
```sql
-- Enhance existing progress_history table
ALTER TABLE progress_history 
ADD COLUMN progress_calculation_method TEXT DEFAULT 'manual',
ADD COLUMN subtask_completion_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN automated_calculation BOOLEAN DEFAULT false,
ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 1.0;
```

## Component Architecture

### 1. Initiative Form System

#### Core Form Component (`/components/forms/InitiativeForm.tsx`)
```typescript
interface InitiativeFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Initiative>;
  userRole: 'CEO' | 'Admin' | 'Manager' | 'Analyst';
  userAreaId?: string;
  onSubmit: (data: InitiativeFormData) => Promise<void>;
  onCancel: () => void;
}

interface InitiativeFormData {
  title: string;
  description: string;
  area_id: string;
  owner_id: string;
  priority: Priority;
  status: InitiativeStatus;
  target_date: Date;
  budget?: number;
  progress_method: 'manual' | 'subtask_based' | 'hybrid';
  estimated_hours?: number;
  kpi_category: string;
  is_strategic: boolean;
  success_criteria: Record<string, any>;
  subtasks: SubtaskFormData[];
  tags: string[];
}
```

#### Role-Based Form Wrapper (`/components/forms/RoleBasedInitiativeForm.tsx`)
```typescript
const RoleBasedInitiativeForm: React.FC<InitiativeFormProps> = ({ userRole, userAreaId, ...props }) => {
  const { data: areas } = useAreas();
  const { data: users } = useUsers();
  
  // Filter areas based on role
  const availableAreas = useMemo(() => {
    if (userRole === 'CEO' || userRole === 'Admin') {
      return areas;
    }
    return areas?.filter(area => area.id === userAreaId) || [];
  }, [areas, userRole, userAreaId]);

  // Filter users based on role and area selection
  const availableUsers = useMemo(() => {
    // Implementation for filtering users based on role permissions
  }, [users, userRole]);

  return (
    <FormProvider>
      <InitiativeForm
        {...props}
        availableAreas={availableAreas}
        availableUsers={availableUsers}
        rolePermissions={{
          canEditArea: userRole === 'CEO' || userRole === 'Admin',
          canSetBudget: userRole !== 'Analyst',
          canAssignCrossFunctional: userRole === 'CEO' || userRole === 'Admin',
          canMarkStrategic: userRole === 'CEO' || userRole === 'Admin'
        }}
      />
    </FormProvider>
  );
};
```

### 2. Subtask Management System

#### Dynamic Subtask Manager (`/components/forms/SubtaskManager.tsx`)
```typescript
interface SubtaskManagerProps {
  initiativeId?: string;
  subtasks: SubtaskFormData[];
  onSubtasksChange: (subtasks: SubtaskFormData[]) => void;
  progressMethod: 'manual' | 'subtask_based' | 'hybrid';
  readonly?: boolean;
}

const SubtaskManager: React.FC<SubtaskManagerProps> = ({ 
  subtasks, 
  onSubtasksChange, 
  progressMethod,
  readonly = false 
}) => {
  const [totalWeight, setTotalWeight] = useState(0);
  
  // Auto-calculate initiative progress from subtasks
  const calculateProgress = useCallback(() => {
    if (progressMethod === 'manual') return null;
    
    const completedWeight = subtasks.reduce((sum, subtask) => {
      return sum + (subtask.progress / 100) * subtask.weight_percentage;
    }, 0);
    
    return Math.round(completedWeight);
  }, [subtasks, progressMethod]);

  // Weight validation
  useEffect(() => {
    const total = subtasks.reduce((sum, subtask) => sum + subtask.weight_percentage, 0);
    setTotalWeight(total);
  }, [subtasks]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Subtasks</h3>
        <div className="text-sm text-muted-foreground">
          Weight: {totalWeight}% / 100%
        </div>
      </div>
      
      <DndContext>
        <SortableContext items={subtasks.map(s => s.id)}>
          {subtasks.map((subtask, index) => (
            <SortableSubtaskItem
              key={subtask.id}
              subtask={subtask}
              index={index}
              readonly={readonly}
              onUpdate={(updatedSubtask) => {
                const newSubtasks = [...subtasks];
                newSubtasks[index] = updatedSubtask;
                onSubtasksChange(newSubtasks);
              }}
              onDelete={() => {
                onSubtasksChange(subtasks.filter((_, i) => i !== index));
              }}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!readonly && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const newSubtask: SubtaskFormData = {
              id: `temp-${Date.now()}`,
              title: '',
              description: '',
              weight_percentage: Math.max(0, 100 - totalWeight),
              progress: 0,
              assigned_to: null,
              due_date: null,
              subtask_order: subtasks.length
            };
            onSubtasksChange([...subtasks, newSubtask]);
          }}
          disabled={totalWeight >= 100}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Subtask
        </Button>
      )}
    </div>
  );
};
```

### 3. Enhanced KPI Dashboard

#### KPI Dashboard Container (`/components/dashboard/EnhancedKPIDashboard.tsx`)
```typescript
interface KPIDashboardProps {
  userRole: UserRole;
  userAreaId?: string;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  viewType: 'overview' | 'detailed' | 'strategic';
}

const EnhancedKPIDashboard: React.FC<KPIDashboardProps> = ({
  userRole,
  userAreaId,
  timeRange,
  viewType
}) => {
  const { data: kpiData, isLoading } = useKPIData({
    userRole,
    userAreaId,
    timeRange,
    viewType
  });

  if (isLoading) {
    return <KPIDashboardSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Overview Cards */}
      <KPIOverviewCard
        title="Total Initiatives"
        value={kpiData.totalInitiatives}
        trend={kpiData.initiativesTrend}
        role={userRole}
      />
      
      <KPIOverviewCard
        title="Completion Rate"
        value={`${kpiData.completionRate}%`}
        trend={kpiData.completionTrend}
        role={userRole}
      />
      
      <KPIOverviewCard
        title="Average Progress"
        value={`${kpiData.averageProgress}%`}
        trend={kpiData.progressTrend}
        role={userRole}
      />
      
      {userRole === 'CEO' || userRole === 'Admin' ? (
        <KPIOverviewCard
          title="Strategic Progress"
          value={`${kpiData.strategicProgress}%`}
          trend={kpiData.strategicTrend}
          role={userRole}
        />
      ) : null}
      
      {/* Detailed Views */}
      {viewType === 'detailed' && (
        <>
          <div className="col-span-full">
            <AreaPerformanceChart data={kpiData.areaPerformance} />
          </div>
          
          <div className="col-span-full lg:col-span-2">
            <InitiativeProgressChart data={kpiData.initiativeProgress} />
          </div>
          
          <div className="col-span-full lg:col-span-2">
            <ResourceUtilizationChart data={kpiData.resourceUtilization} />
          </div>
        </>
      )}
    </div>
  );
};
```

### 4. Excel Import Enhancement

#### Enhanced Excel Import Wizard (`/components/import/ExcelImportWizard.tsx`)
```typescript
interface ExcelImportWizardProps {
  onImportComplete: (results: ImportResults) => void;
  userRole: UserRole;
  userAreaId?: string;
}

const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({
  onImportComplete,
  userRole,
  userAreaId
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);

  const steps = [
    { id: 1, title: 'Upload File', component: FileUploadStep },
    { id: 2, title: 'Map Columns', component: ColumnMappingStep },
    { id: 3, title: 'Validate Data', component: DataValidationStep },
    { id: 4, title: 'Import Options', component: ImportOptionsStep },
    { id: 5, title: 'Confirm & Import', component: ConfirmationStep }
  ];

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    
    // Parse Excel file
    const parsed = await parseExcelFile(file);
    setParsedData(parsed);
    
    // Auto-detect column mapping
    const autoMapping = autoDetectColumns(parsed.headers, userRole);
    setColumnMapping(autoMapping);
    
    setCurrentStep(2);
  };

  const handleColumnMapping = async (mapping: ColumnMapping) => {
    setColumnMapping(mapping);
    
    // Validate data with column mapping
    const validation = await validateImportData(parsedData!, mapping, {
      userRole,
      userAreaId
    });
    setValidationResults(validation);
    
    setCurrentStep(3);
  };

  return (
    <Dialog open onOpenChange={() => onImportComplete({ success: false })}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Initiatives from Excel</DialogTitle>
          <div className="flex items-center space-x-2 mt-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center space-x-2",
                  index < steps.length - 1 && "flex-1"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    currentStep >= step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.id}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-px bg-muted" />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {steps.map((step) => {
            if (currentStep !== step.id) return null;
            
            const StepComponent = step.component;
            return (
              <StepComponent
                key={step.id}
                onNext={() => setCurrentStep(step.id + 1)}
                onBack={() => setCurrentStep(step.id - 1)}
                onComplete={onImportComplete}
                // Pass relevant props based on step
                {...(step.id === 1 && { onFileUpload: handleFileUpload })}
                {...(step.id === 2 && { 
                  parsedData, 
                  columnMapping, 
                  onMappingChange: handleColumnMapping 
                })}
                {...(step.id === 3 && { validationResults })}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

## API Architecture

### 1. Enhanced Initiatives API (`/app/api/initiatives/route.ts`)
```typescript
// GET /api/initiatives - Enhanced filtering and KPI calculation
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userProfile = await getUserProfile();
  
  const filters = {
    area_id: searchParams.get('area_id'),
    status: searchParams.get('status'),
    priority: searchParams.get('priority'),
    kpi_category: searchParams.get('kpi_category'),
    is_strategic: searchParams.get('is_strategic') === 'true',
    date_range: searchParams.get('date_range')
  };

  // Apply role-based filtering
  const roleFilter = applyRoleBasedFilter(userProfile.role, userProfile.area_id, filters);
  
  const initiatives = await getInitiativesWithKPIs(roleFilter);
  
  return Response.json({
    initiatives,
    kpi_summary: await calculateKPISummary(roleFilter),
    metadata: {
      total_count: initiatives.length,
      user_role: userProfile.role,
      user_area: userProfile.area_id
    }
  });
}

// POST /api/initiatives - Enhanced creation with subtasks
export async function POST(request: Request) {
  const body = await request.json();
  const userProfile = await getUserProfile();
  
  // Validate role permissions
  validateInitiativeCreationPermissions(userProfile, body);
  
  // Create initiative with subtasks in transaction
  const result = await createInitiativeWithSubtasks({
    ...body,
    created_by: userProfile.id,
    tenant_id: userProfile.tenant_id
  });
  
  // Refresh KPI materialized view
  await refreshKPISummary();
  
  return Response.json(result);
}
```

### 2. Subtasks API (`/app/api/initiatives/[id]/subtasks/route.ts`)
```typescript
// GET /api/initiatives/[id]/subtasks
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userProfile = await getUserProfile();
  const initiative = await getInitiativeWithPermissionCheck(params.id, userProfile);
  
  const subtasks = await getSubtasksWithProgress(params.id);
  
  return Response.json({
    subtasks,
    calculated_progress: calculateInitiativeProgress(subtasks),
    weight_validation: validateWeights(subtasks)
  });
}

// PUT /api/initiatives/[id]/subtasks/[subtaskId]
export async function PUT(
  request: Request,
  { params }: { params: { id: string; subtaskId: string } }
) {
  const body = await request.json();
  const userProfile = await getUserProfile();
  
  // Update subtask with weight validation
  const updatedSubtask = await updateSubtaskWithValidation(
    params.subtaskId,
    body,
    userProfile
  );
  
  // Recalculate initiative progress if using subtask-based method
  await recalculateInitiativeProgress(params.id);
  
  return Response.json(updatedSubtask);
}
```

### 3. KPI Analytics API (`/app/api/analytics/kpi/route.ts`)
```typescript
// GET /api/analytics/kpi
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userProfile = await getUserProfile();
  
  const timeRange = searchParams.get('time_range') || 'month';
  const viewType = searchParams.get('view_type') || 'overview';
  const areaId = searchParams.get('area_id');
  
  // Apply role-based data filtering
  const dataFilter = createRoleBasedDataFilter(userProfile, areaId);
  
  const kpiData = await calculateKPIMetrics({
    filter: dataFilter,
    timeRange,
    viewType,
    includeStrategic: userProfile.role === 'CEO' || userProfile.role === 'Admin'
  });
  
  return Response.json(kpiData);
}
```

## Data Processing & Validation

### 1. Excel Import Processing (`/lib/import/excel-processor.ts`)
```typescript
interface ExcelProcessorOptions {
  userRole: UserRole;
  userAreaId?: string;
  allowCrossFunctional: boolean;
  validateStrategic: boolean;
}

export class EnhancedExcelProcessor {
  private options: ExcelProcessorOptions;
  
  constructor(options: ExcelProcessorOptions) {
    this.options = options;
  }
  
  async processFile(file: File): Promise<ProcessingResult> {
    // Parse Excel with enhanced validation
    const rawData = await this.parseExcelFile(file);
    
    // Apply role-based column validation
    const columnValidation = this.validateColumns(rawData.headers);
    if (!columnValidation.valid) {
      throw new Error(`Invalid columns: ${columnValidation.errors.join(', ')}`);
    }
    
    // Process rows with business rule validation
    const processedRows = await Promise.all(
      rawData.rows.map(row => this.processRow(row, rawData.headers))
    );
    
    // Group by area for batch processing
    const groupedByArea = this.groupByArea(processedRows);
    
    // Validate area permissions
    this.validateAreaPermissions(groupedByArea);
    
    return {
      initiatives: processedRows.filter(row => row.valid),
      errors: processedRows.filter(row => !row.valid),
      summary: this.generateProcessingSummary(processedRows)
    };
  }
  
  private async processRow(row: any[], headers: string[]): Promise<ProcessedRow> {
    const rowData = this.mapRowToInitiative(row, headers);
    
    // Enhanced validation
    const validationResult = await this.validateInitiativeData(rowData);
    
    // Process subtasks if included
    const subtasks = await this.processSubtasks(rowData.subtasks_data);
    
    return {
      data: { ...rowData, subtasks },
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings
    };
  }
}
```

### 2. KPI Calculation Engine (`/lib/kpi/calculator.ts`)
```typescript
export class KPICalculator {
  static async calculateInitiativeProgress(
    initiativeId: string,
    method: 'manual' | 'subtask_based' | 'hybrid'
  ): Promise<number> {
    switch (method) {
      case 'manual':
        return this.getManualProgress(initiativeId);
      
      case 'subtask_based':
        return this.calculateSubtaskBasedProgress(initiativeId);
      
      case 'hybrid':
        return this.calculateHybridProgress(initiativeId);
      
      default:
        throw new Error(`Unknown progress calculation method: ${method}`);
    }
  }
  
  private static async calculateSubtaskBasedProgress(
    initiativeId: string
  ): Promise<number> {
    const subtasks = await getSubtasks(initiativeId);
    
    if (subtasks.length === 0) return 0;
    
    // Weighted average based on subtask weights
    const totalWeight = subtasks.reduce((sum, subtask) => sum + subtask.weight_percentage, 0);
    
    if (totalWeight === 0) return 0;
    
    const weightedProgress = subtasks.reduce((sum, subtask) => {
      return sum + (subtask.progress * subtask.weight_percentage) / 100;
    }, 0);
    
    return Math.round((weightedProgress / totalWeight) * 100);
  }
  
  static async calculateAreaKPIs(
    areaId: string,
    timeRange: TimeRange
  ): Promise<AreaKPIs> {
    const initiatives = await getAreaInitiatives(areaId, timeRange);
    
    const completedCount = initiatives.filter(i => i.status === 'completed').length;
    const totalCount = initiatives.length;
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    
    const averageProgress = initiatives.reduce((sum, i) => sum + i.progress, 0) / totalCount;
    
    const overdueCount = initiatives.filter(i => 
      i.target_date < new Date() && i.status !== 'completed'
    ).length;
    
    const budgetUtilization = this.calculateBudgetUtilization(initiatives);
    const strategicProgress = this.calculateStrategicProgress(initiatives);
    
    return {
      total_initiatives: totalCount,
      completed_initiatives: completedCount,
      completion_rate: Math.round(completionRate),
      average_progress: Math.round(averageProgress),
      overdue_initiatives: overdueCount,
      budget_utilization: budgetUtilization,
      strategic_progress: strategicProgress,
      trend_data: await this.calculateTrendData(areaId, timeRange)
    };
  }
}
```

## Performance Optimizations

### 1. Database Optimizations
```sql
-- Additional indexes for KPI queries
CREATE INDEX CONCURRENTLY idx_initiatives_performance 
ON initiatives (tenant_id, area_id, status, target_date, is_strategic) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_activities_progress 
ON activities (initiative_id, weight_percentage, progress) 
WHERE completed = false;

-- Partial index for overdue initiatives
CREATE INDEX CONCURRENTLY idx_initiatives_overdue 
ON initiatives (area_id, target_date, status) 
WHERE target_date < CURRENT_DATE AND status != 'completed';
```

### 2. Caching Strategy (`/lib/cache/kpi-cache.ts`)
```typescript
export class KPICache {
  private static readonly CACHE_TTL = {
    overview: 5 * 60 * 1000,      // 5 minutes
    detailed: 15 * 60 * 1000,     // 15 minutes
    strategic: 30 * 60 * 1000     // 30 minutes
  };
  
  static async getKPIData(
    cacheKey: string,
    dataType: 'overview' | 'detailed' | 'strategic',
    fetchFunction: () => Promise<any>
  ): Promise<any> {
    const cached = await this.getCached(cacheKey);
    
    if (cached && this.isValid(cached, dataType)) {
      return cached.data;
    }
    
    const freshData = await fetchFunction();
    await this.setCached(cacheKey, freshData, dataType);
    
    return freshData;
  }
  
  static async invalidateAreaKPIs(areaId: string): Promise<void> {
    const keys = [
      `kpi:area:${areaId}:*`,
      `kpi:global:*`  // Global KPIs might be affected
    ];
    
    await Promise.all(keys.map(pattern => this.deletePattern(pattern)));
  }
}
```

## Implementation Sequence

### Phase 1: Foundation (Weeks 1-2)
1. **Database Schema Updates**
   - Deploy enhanced initiative and subtask tables
   - Create KPI calculation views and functions
   - Set up performance indexes

2. **Core API Enhancements**
   - Enhance initiatives API with KPI calculations
   - Implement subtasks API with progress calculation
   - Create KPI analytics endpoints

3. **Basic Form Components**
   - Role-based initiative form
   - Basic subtask management
   - Form validation system

### Phase 2: Enhanced Features (Weeks 3-4)
1. **Advanced Form Features**
   - Dynamic subtask weight management
   - Progress calculation options
   - Enhanced validation and error handling

2. **KPI Dashboard Enhancement**
   - Real-time KPI cards
   - Area performance visualization
   - Strategic initiative tracking

3. **Excel Import Improvements**
   - Multi-step import wizard
   - Enhanced validation and error reporting
   - Column mapping intelligence

### Phase 3: Optimization & Polish (Weeks 5-6)
1. **Performance Optimization**
   - Implement caching strategy
   - Database query optimization
   - Real-time updates via WebSocket

2. **Advanced Features**
   - AI data structure optimization
   - Advanced analytics views
   - Mobile responsiveness enhancements

3. **Testing & Quality Assurance**
   - Comprehensive testing suite
   - Performance benchmarking
   - User acceptance testing

## Integration Points

### 1. Existing File Upload System
- Maintain compatibility with current Excel templates
- Enhance validation to work with new data structure
- Preserve existing file processing workflow

### 2. Stratix AI Assistant
- Optimize data structure for AI queries
- Provide structured KPI data for intelligent insights
- Enable natural language querying of initiative data

### 3. Authentication & Authorization
- Leverage existing Supabase Auth integration
- Enhance role-based permissions for new features
- Maintain tenant isolation and security

## Success Criteria

### Technical Metrics
- KPI calculation accuracy: 99.9%
- Form submission success rate: > 98%
- Dashboard load time: < 2 seconds
- Excel import processing: < 30 seconds for 1000 records

### User Experience Metrics
- Form completion rate: > 85%
- User satisfaction: > 4.5/5
- Support tickets reduction: 50%
- Feature adoption rate: > 70%

This technical plan provides a comprehensive roadmap for implementing the KPI standardization system while maintaining compatibility with existing infrastructure and ensuring optimal performance and user experience.