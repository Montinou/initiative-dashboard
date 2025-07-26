<task name="MVP Role Configuration with Graphics and XLSX Model">

<task_objective>
Create a complete role-based access control system with standardized visualizations and downloadable XLSX template for organizational management. The workflow processes role definitions (CEO, Admin, Analyst, Manager), generates dashboard graphics including progress distribution charts and area-specific objective tracking, and produces a standardized XLSX template based on the "TABLERO DE GESTION Y SEGUIMIENTO EQUIPO GERENCIAL" format for consistent data collection and reporting across all organizational areas.
</task_objective>

<detailed_sequence_steps>
# MVP Role Configuration with Graphics and XLSX Model - Detailed Sequence of Steps

## Step 1: Configure Role Definitions and Permissions

### 1.1. Define Role Structure
1. Create role configuration schema with four primary roles:
   - **CEO**: Full access to all dashboards, user management, and area administration
   - **Admin**: User and area management without strategic data access
   - **Analyst**: Read-only access to all strategic information and reporting
   - **Manager**: Area-specific initiative management and progress tracking

2. Implement permission matrix:
   ```typescript
   interface RolePermissions {
     viewDashboards: boolean;
     manageUsers: boolean;
     manageAreas: boolean;
     createInitiatives: boolean;
     editInitiatives: boolean;
     exportData: boolean;
     viewAllAreas: boolean;
   }
   ```

### 1.2. Create Role Configuration Files
1. Generate role definition JSON files:
   - `roles/ceo-permissions.json`
   - `roles/admin-permissions.json`
   - `roles/analyst-permissions.json`
   - `roles/manager-permissions.json`

2. Create role assignment templates with organizational context (Fema divisions: Iluminación, Electricidad, Industria, Administración)

## Step 2: Create Dashboard Visualizations

### 2.1. Core Strategic Charts
1. **Distribución por Progreso (Bar Chart)**:
   - Purpose: Show initiative distribution across progress ranges (0-25%, 26-50%, 51-75%, 76-100%)
   - Implementation: Bar chart component with progress range categories
   - Data source: Initiative progress percentages

2. **Distribución por Estado (Donut Chart)**:
   - Purpose: Visualize initiative status proportions ('En Curso', 'Completado', 'Atrasado', 'En Pausa')
   - Implementation: Donut chart with status color coding
   - Data source: Initiative status classifications

3. **Progreso Promedio por Área (Bar Chart)**:
   - Purpose: Compare average progress between organizational areas
   - Implementation: Horizontal bar chart with area comparisons
   - Data source: Aggregated progress by organizational division

### 2.2. Area-Specific Objective Tracking Charts
1. **RRHH Objectives Progress Chart**:
   - Metrics: Retención de talento, Digitalización legajos
   - Chart type: Progress bars with obstacle/enabler indicators
   - Status visualization: Color-coded progress indicators

2. **Administración Objectives Progress Chart**:
   - Metrics: Reducir tiempos de facturación, Control de gastos
   - Chart type: Progress tracking with trend analysis
   - Performance indicators: Efficiency metrics visualization

3. **Comercial Objectives Progress Chart**:
   - Metrics: Implementar CRM, Forecast comercial
   - Chart type: Sales performance dashboards
   - KPI visualization: Revenue and customer metrics

4. **Producto Objectives Progress Chart**:
   - Metrics: Nueva funcionalidad, Reducir bugs críticos
   - Chart type: Development progress tracking
   - Quality indicators: Bug reduction and feature completion metrics

### 2.3. Chart Configuration and Styling
1. Implement glassmorphism design system consistency:
   - Backdrop blur effects for chart containers
   - Purple to cyan gradient color schemes
   - Responsive design for mobile and desktop
   - Custom animations and transitions

2. Create reusable chart components:
   - `components/charts/progress-distribution.tsx`
   - `components/charts/status-donut.tsx`
   - `components/charts/area-comparison.tsx`
   - `components/charts/objective-tracking.tsx`

## Step 3: Generate Standardized XLSX Template

### 3.1. Create Base Template Structure
1. Design XLSX template matching "TABLERO DE GESTION Y SEGUIMIENTO EQUIPO GERENCIAL" format:
   - Column A: **Área** (Organizational area/department)
   - Column B: **Objetivo Clave** (Key objective description)
   - Column C: **% Avance Q2** (Q2 progress percentage)
   - Column D: **Obstáculos (Lows)** (Blocking factors)
   - Column E: **Potenciadores (Highs)** (Enabling factors)
   - Column F: **Estado** (Status with emoji indicators)

### 3.2. Pre-populate Sample Data
1. Include sample data rows for each organizational area:
   - **Comercial**: CRM implementation, Commercial forecasting
   - **Administración**: Invoice time reduction, Expense control
   - **Producto**: New functionality, Critical bug reduction
   - **RRHH**: Talent retention, Digital file management

2. Add data validation rules:
   - Progress percentage constraints (0-100%)
   - Status dropdown with predefined options
   - Text length limits for obstacles and enablers

### 3.3. Template Formatting and Styling
1. Apply professional formatting:
   - Header row styling with bold text and background colors
   - Conditional formatting for progress percentages
   - Status emoji formatting (🟢, 🟡, 🔴)
   - Cell borders and alternating row colors

2. Create protected areas and user input zones:
   - Lock template structure while allowing data entry
   - Add data validation and input instructions
   - Include calculation formulas for progress aggregation

## Step 4: Package Files for User Download

### 4.1. Create Download Package Structure
1. Organize files in standardized directory structure:
   ```
   mvp-role-configuration-package/
   ├── roles/
   │   ├── ceo-permissions.json
   │   ├── admin-permissions.json
   │   ├── analyst-permissions.json
   │   └── manager-permissions.json
   ├── charts/
   │   ├── progress-distribution-config.json
   │   ├── status-donut-config.json
   │   ├── area-comparison-config.json
   │   └── objective-tracking-configs/
   │       ├── rrhh-objectives.json
   │       ├── administracion-objectives.json
   │       ├── comercial-objectives.json
   │       └── producto-objectives.json
   ├── templates/
   │   └── tablero-gestion-seguimiento.xlsx
   └── documentation/
       ├── role-implementation-guide.md
       ├── chart-integration-guide.md
       └── template-usage-instructions.md
   ```

### 4.2. Create Documentation and Implementation Guides
1. **Role Implementation Guide**:
   - Step-by-step role configuration instructions
   - Permission matrix explanations
   - User assignment procedures

2. **Chart Integration Guide**:
   - Chart component implementation details
   - Data source configuration
   - Styling and customization options

3. **Template Usage Instructions**:
   - XLSX template completion guidelines
   - Data entry best practices
   - Integration with dashboard visualizations

### 4.3. Generate Downloadable Archive
1. Create compressed package (ZIP format) containing:
   - All role configuration files
   - Chart specification files
   - XLSX template with sample data
   - Complete documentation set

2. Include version control and changelog:
   - Package version identifier
   - Release notes with feature descriptions
   - Compatibility requirements

## Tools and Services Required

- **Chart Generation**: Recharts library for React-based visualizations
- **XLSX Processing**: SheetJS (xlsx) library for spreadsheet generation
- **File Packaging**: Node.js archiver for ZIP file creation
- **Role Management**: JSON schema validation for role configurations
- **Documentation**: Markdown processing for guide generation

## Expected Output Format

1. **Role Configuration Files**: JSON format with permission schemas
2. **Chart Components**: React/TypeScript components with Tailwind styling
3. **XLSX Template**: Excel file with formatted template and sample data
4. **Documentation**: Markdown files with implementation instructions
5. **Package Archive**: ZIP file containing all standardized components

## Integration Points

- **Frontend Components**: Chart components integrate with existing glassmorphism design system
- **Role System**: Permission configurations align with current user management structure
- **Data Flow**: XLSX template structure matches dashboard data requirements
- **Download Mechanism**: Package generation integrates with existing file download functionality

</detailed_sequence_steps>

</task>