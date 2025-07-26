<task name="Client Onboarding with File Processing">

<task_objective>
Transform the current mock-data-driven client management system into a production-ready system where users can create new clients by uploading XLSX/CSV files containing client data. The system will provide file upload interfaces, data validation, processing capabilities, and downloadable templates. Output will be a complete client onboarding flow integrated with Firebase backend and Next.js frontend.
</task_objective>

<detailed_sequence_steps>
# Client Onboarding with File Processing - Detailed Sequence of Steps

## 1. Frontend Components Development

1. **Create New Client Modal Component**
   - Build modal using shadcn/ui Dialog component
   - Include file upload dropzone with drag-and-drop support
   - Add data source selection (XLSX/CSV options)
   - Implement file validation and preview
   - Add progress indicators for upload/processing

2. **File Upload Interface**
   - Implement react-dropzone for file handling
   - Add file type validation (xlsx, csv only)
   - Show file preview with basic statistics
   - Display upload progress and status messages

3. **Template Download Component**
   - Create download button for XLSX template
   - Generate template with proper headers and sample data
   - Include data format guidelines and instructions

## 2. Backend File Processing

1. **Firebase Function for File Upload**
   - Create Cloud Function to handle file uploads to Firebase Storage
   - Implement file validation and security checks
   - Return upload URLs and processing status

2. **File Processing Service**
   - Build XLSX/CSV parsing using libraries like xlsx or csv-parser
   - Implement data validation and sanitization
   - Map uploaded data to client data structure
   - Handle errors and provide detailed feedback

3. **Client Creation Integration**
   - Integrate processed data with existing client creation flow
   - Update Firestore with new client data
   - Handle organization-based multi-tenancy
   - Return client creation status and new client ID

## 3. Mock Data Removal

1. **Identify Mock Data Sources**
   - Search codebase for hardcoded mock data
   - Locate mock client arrays and sample data
   - Find placeholder data in components

2. **Replace with Dynamic Data Loading**
   - Update components to load from Firestore
   - Implement proper loading states
   - Add error handling for empty states
   - Update TypeScript interfaces if needed

## 4. Template Generation System

1. **XLSX Template Creation**
   - Define standard client data schema
   - Create properly formatted XLSX template
   - Include data validation rules and dropdowns
   - Add instructions and examples

2. **Dynamic Template Download**
   - Implement server-side template generation
   - Allow customization based on organization needs
   - Cache templates for performance
   - Track download analytics

## 5. Integration and Testing

1. **End-to-End Integration**
   - Connect frontend components to backend functions
   - Implement proper error handling and user feedback
   - Add loading states and progress indicators
   - Test file upload and processing flow

2. **Validation and Error Handling**
   - Implement comprehensive data validation
   - Provide clear error messages for invalid data
   - Handle network errors and timeouts
   - Add retry mechanisms for failed uploads

## 6. Multi-Agent Implementation Strategy

**Agent Assignments:**
- **AGENT_FRONTEND_MODAL**: New client modal and file upload UI
- **AGENT_FILE_PROCESSING**: Backend file processing and validation
- **AGENT_TEMPLATE_SYSTEM**: Template generation and download
- **AGENT_MOCK_CLEANUP**: Remove mock data and update components
- **AGENT_INTEGRATION**: Connect all components and test flow

**Progress Tracking:**
- Each agent generates unique ID with timestamp
- Create implementation-progress.md for centralized logging
- Log every modification with agent ID and file changes
- Track integration checkpoints and testing results

**Integration Verification:**
- Verify all imports/exports are correct
- Ensure UI components connect to backend functions
- Test complete file upload to client creation flow
- Validate template download functionality
- Confirm mock data removal is complete

</detailed_sequence_steps>

</task>