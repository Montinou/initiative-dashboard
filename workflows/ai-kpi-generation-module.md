<task name="AI KPI Generation Module">

<task_objective>
Implement an AI-powered module that analyzes uploaded XLSX/CSV files and automatically generates industry-specific KPIs based on client industry and description. The module will process empty templates with field names, analyze them using Vertex AI, create data processing functions, and display KPIs through interactive charts (bar, pie, line) in the client dashboard. Focus on retail industry with sales, customer, and performance metrics.
</task_objective>

<detailed_sequence_steps>
# AI KPI Generation Module - Detailed Sequence of Steps

## Overview
This workflow implements a 4-subagent approach to build a complete KPI generation system:
- Subagent 1: Frontend Upload Interface
- Subagent 2: Backend Processing Pipeline  
- Subagent 3: AI KPI Generation Service
- Subagent 4: Visualization & Dashboard

## Subagent 1: Frontend Upload Interface

### 1. Create File Upload Component

1. Create new upload component for client workspace:
   ```typescript
   // components/kpi-file-upload.tsx
   interface KPIFileUploadProps {
     clientId: string;
     clientIndustry: string;
     onUploadComplete: (kpis: KPI[]) => void;
   }
   ```

2. Implement drag-and-drop file upload:
   - Support XLSX and CSV formats
   - Show file preview with column headers
   - Validate file structure (headers only)
   - Display upload progress

3. Integrate into client workspace:
   ```bash
   # Update client workspace page
   cd app/clientes/[clientId]
   # Add KPI upload section to page.tsx
   ```

### 2. File Validation & Preview

1. Create file parser utilities:
   ```typescript
   // lib/file-parser.ts
   export async function parseFileHeaders(file: File): Promise<string[]>
   export function validateFileStructure(headers: string[]): ValidationResult
   ```

2. Show column mapping preview:
   - Display detected columns
   - Allow user to confirm before processing
   - Show sample data if available

## Subagent 2: Backend Processing Pipeline

### 1. Firebase Function Setup

1. Create file processing function:
   ```javascript
   // functions/processKPIFile.js
   exports.processKPIFile = functions.storage.object().onFinalize(async (object) => {
     // Trigger on file upload to 'kpi-uploads/{clientId}/{filename}'
     const clientId = object.name.split('/')[1];
     
     // Parse file and extract headers
     // Store metadata in Firestore
     // Trigger AI processing
   });
   ```

2. Install required dependencies:
   ```bash
   cd functions
   npm install xlsx csv-parse
   ```

### 2. Data Processing Pipeline

1. Create processing workflow:
   - Download file from Storage
   - Parse XLSX/CSV headers
   - Extract client context (industry, description)
   - Prepare data for AI analysis

2. Store processing metadata:
   ```javascript
   // Firestore structure
   /organizations/{orgId}/clients/{clientId}/kpiUploads/{uploadId}
   {
     fileName: string,
     headers: string[],
     uploadedAt: timestamp,
     status: 'processing' | 'completed' | 'failed',
     generatedKPIs: KPI[]
   }
   ```

## Subagent 3: AI KPI Generation Service

### 1. Extend Cloud Run AI Service

1. Add KPI generation endpoint:
   ```javascript
   // ia-service/src/kpi-generator.js
   app.post('/generate-kpis', async (req, res) => {
     const { headers, clientIndustry, clientDescription } = req.body;
     
     // Industry mapping for context
     const industryContext = {
       retail: {
         focus: ['sales', 'customer', 'performance'],
         metrics: {
           sales: ['revenue', 'units_sold', 'avg_transaction'],
           customer: ['retention_rate', 'purchase_frequency', 'customer_lifetime_value'],
           performance: ['conversion_rate', 'basket_size', 'profit_margin']
         }
       }
       // Add other industries...
     };
   });
   ```

2. Implement Vertex AI prompt engineering:
   ```javascript
   const prompt = `
   Given these CSV/Excel column headers: ${headers.join(', ')}
   Client Industry: ${clientIndustry}
   Client Description: ${clientDescription}
   
   Generate KPI calculation functions for:
   1. Sales metrics (revenue trends, product performance)
   2. Customer metrics (retention, frequency)
   3. Performance metrics (conversion, AOV)
   
   Return as JSON with calculation logic.
   `;
   ```

### 2. KPI Calculation Engine

1. Generate dynamic calculation functions:
   - Map columns to KPI inputs
   - Create aggregation logic
   - Handle different time periods
   - Support filtering and grouping

2. Return structured KPI definitions:
   ```typescript
   interface GeneratedKPI {
     name: string;
     category: 'sales' | 'customer' | 'performance';
     calculation: string; // Function as string
     requiredColumns: string[];
     chartType: 'bar' | 'pie' | 'line';
     aggregation: 'sum' | 'avg' | 'count';
   }
   ```

## Subagent 4: Visualization & Dashboard

### 1. Install and Configure Recharts

1. Add Recharts dependency:
   ```bash
   npm install recharts
   ```

2. Create chart components:
   ```typescript
   // components/charts/kpi-bar-chart.tsx
   // components/charts/kpi-pie-chart.tsx
   // components/charts/kpi-line-chart.tsx
   ```

### 2. Build KPI Dashboard

1. Create KPI dashboard component:
   ```typescript
   // components/kpi-dashboard.tsx
   interface KPIDashboardProps {
     kpis: GeneratedKPI[];
     data: any[];
     clientId: string;
   }
   ```

2. Implement chart rendering:
   - Bar charts for sales comparisons
   - Pie charts for category breakdowns
   - Line charts for trends over time
   - KPI cards for key metrics

3. Add real-time updates:
   - Subscribe to Firestore KPI updates
   - Refresh charts on new data
   - Show loading states

### 3. Integration with Client Workspace

1. Update client workspace to include KPI section:
   ```typescript
   // app/clientes/[clientId]/page.tsx
   // Add KPI dashboard below existing sections
   <KPIDashboard 
     kpis={generatedKPIs}
     data={processedData}
     clientId={clientId}
   />
   ```

2. Add navigation and filters:
   - Time period selection
   - KPI category filters
   - Export functionality

## Parallel Execution Script

Create a script to spawn all 4 subagents in parallel:

```bash
#!/bin/bash
# spawn-kpi-module.sh

echo "🚀 Starting AI KPI Generation Module implementation with 4 subagents"

# Subagent 1: Frontend Upload Interface
(
  claude -p "Implement frontend file upload component for KPI module in /components/kpi-file-upload.tsx. 
  Support XLSX/CSV upload with drag-and-drop, file validation, and preview. 
  Integrate into client workspace at /app/clientes/[clientId]/page.tsx" \
  --permission-mode bypassPermissions \
  --max-turns 15
) &

# Subagent 2: Backend Processing Pipeline
(
  claude -p "Create Firebase Function for KPI file processing at /functions/processKPIFile.js. 
  Parse uploaded XLSX/CSV files, extract headers, store metadata in Firestore. 
  Install xlsx and csv-parse dependencies." \
  --permission-mode bypassPermissions \
  --max-turns 15
) &

# Subagent 3: AI KPI Generation Service
(
  claude -p "Extend Cloud Run AI service at /ia-service with KPI generation endpoint. 
  Use Vertex AI to analyze file headers and generate industry-specific KPI calculations. 
  Focus on retail with sales, customer, and performance metrics." \
  --permission-mode bypassPermissions \
  --max-turns 20
) &

# Subagent 4: Visualization & Dashboard
(
  claude -p "Create KPI visualization components using Recharts. 
  Build dashboard with bar, pie, and line charts at /components/kpi-dashboard.tsx. 
  Integrate into client workspace with real-time updates." \
  --permission-mode bypassPermissions \
  --max-turns 15
) &

wait
echo "✅ All subagents completed. KPI module ready for testing!"
```

## Testing & Validation

1. Test file upload with sample XLSX/CSV files
2. Verify KPI generation for different industries
3. Validate chart rendering with real data
4. Test real-time updates and filtering
5. Ensure proper error handling throughout

## Industry Mapping Reference

Available industries in the system:
- tecnologia (Technology)
- fintech
- retail (Primary focus)
- salud (Health)
- educacion (Education)
- manufactura (Manufacturing)
- construccion (Construction)
- servicios (Services)
- energia (Energy)
- alimentacion (Food)
- turismo (Tourism)
- otro (Other)

</detailed_sequence_steps>

</task>