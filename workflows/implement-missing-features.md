<task name="Implement Missing Features with Full Firebase Integration">

<task_objective>
Implement all missing feature modals (conectar, generar nuevo informe, configuración, crear nuevo cliente, etc.) with complete Firebase integration and AI service connection. This workflow eliminates all mocks and technical debt by creating production-ready components connected to real backend services, utilizing Claude Code subagents for parallel implementation.
</task_objective>

<detailed_sequence_steps>
# Implement Missing Features Process - Detailed Sequence of Steps

## 🚨 CRITICAL INSTRUCTIONS FOR IMPLEMENTATION 🚨
- **MUST** eliminate ALL mock data and placeholder functions
- **MUST** connect every modal to its corresponding Firebase function
- **MUST** integrate the ia-service for AI-powered features
- **NEVER** use setTimeout for fake delays or mock responses
- **ALWAYS** implement proper error handling and loading states
- **MUST** follow existing shadcn/ui component patterns

## 1. Audit Current Implementation

1. Identify all mocked features and disconnected components:
   ```bash
   # Search for mock implementations
   rg -i "mock|todo|placeholder|fake|dummy" --type tsx --type ts
   
   # Find setTimeout delays (common in mocks)
   rg "setTimeout.*\d{4}" --type tsx
   
   # Locate disconnected modals
   rg "onClick.*console\.log|alert\(" --type tsx
   ```

2. Create comprehensive feature list:
   ```bash
   # Check all client action buttons
   cat components/client-card.tsx
   
   # Review dashboard actions
   cat app/dashboard/page.tsx
   
   # List all modal components
   ls components/*modal*.tsx components/*dialog*.tsx
   ```

3. Map features to required Firebase functions:
   - **Conectar** → `connectIntegration` function
   - **Generar Informe** → `generateAIReport` function  
   - **Configuración** → `updateClientSettings` function
   - **Crear Cliente** → `createClient` function
   - **Ver Reportes** → `listReports` function

## 2. Parallel Implementation Strategy Using Claude Code Subagents

### Set up parallel development branches:
```bash
#!/bin/bash
# spawn-feature-implementations.sh

# Create base branch for all features
git checkout -b feature/implement-all-modals

# Define features to implement
FEATURES=(
  "connect-integration-modal"
  "generate-report-modal"
  "client-settings-modal"
  "create-client-modal"
  "reports-list-modal"
)

# Spawn Claude Code subagents for each feature
for feature in "${FEATURES[@]}"; do
  git checkout -b "feature/$feature" feature/implement-all-modals
  
  # Create feature-specific prompt based on effective clinerules
  cat > "prompt-$feature.md" << EOF
## Task: Implement $feature with Full Firebase Integration

### 🚨 CRITICAL REQUIREMENTS 🚨
- **MUST** create a production-ready modal component
- **MUST** connect to existing Firebase functions
- **MUST** use shadcn/ui components from /components/ui/
- **NEVER** use mock data or setTimeout delays
- **ALWAYS** implement proper TypeScript types
- **MUST** handle loading, error, and success states

### Specific Instructions for $feature:
$(case $feature in
  "connect-integration-modal")
    echo "- Implement third-party service connection flow
- Use Secret Manager integration pattern from /instructins/third_party_software.md
- Support Google Analytics, Salesforce, HubSpot
- Show connection status and last sync info"
    ;;
  "generate-report-modal")
    echo "- Connect to ia-service for AI report generation
- Support multiple report types (strategic, financial, operational)
- Show real-time generation progress
- Enable report preview and download"
    ;;
  "client-settings-modal")
    echo "- Allow editing client name, industry, description
- Configure report preferences
- Manage notification settings
- Set data retention policies"
    ;;
  "create-client-modal")
    echo "- Full client creation form with validation
- Industry selection dropdown
- Initial KPI configuration
- Automatic navigation to new client page"
    ;;
  "reports-list-modal")
    echo "- Display paginated report history
- Filter by type, date, status
- Download and preview actions
- Delete with confirmation"
    ;;
esac)

### File Locations:
- Modal component: /components/${feature//-/_}.tsx
- Firebase integration: /lib/firebase-${feature%%-modal}.ts
- Types: /types/${feature%%-modal}.ts

### Firebase Functions to Use:
- Check /functions/src/index.ts for available functions
- Use httpsCallable from Firebase SDK
- Handle auth context properly

EOF

  # Spawn Claude Code subagent with full autonomy
  (
    claude -p "$(cat prompt-$feature.md)" \
      --permission-mode bypassPermissions \
      --max-turns 20 \
      --system-prompt "You are implementing production-ready features for consultant-copilot. Follow the critical requirements exactly. Use existing patterns from the codebase."
  ) &
done

# Wait for all subagents to complete
wait
echo "✅ All feature implementations complete"
```

## 3. Core Modal Implementation Pattern

Each modal MUST follow this pattern (based on effective clinerules):

### ✅ ALWAYS GENERATE THIS EXACT PATTERN:
```typescript
// components/feature_name_modal.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

interface FeatureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId?: string
  onSuccess?: () => void
}

export function FeatureModal({ open, onOpenChange, clientId, onSuccess }: FeatureModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSubmit = async (data: any) => {
    setLoading(true)
    setError(null)
    
    try {
      // Call Firebase function - NO MOCKS!
      const functionName = httpsCallable(functions, 'functionName')
      const result = await functionName({ ...data, clientId })
      
      toast({
        title: "Éxito",
        description: "Operación completada correctamente",
      })
      
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud")
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título del Modal</DialogTitle>
        </DialogHeader>
        
        {/* Form content here */}
        
        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
        
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            "Confirmar"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

### ❌ NEVER GENERATE THIS CODE:
```typescript
// WRONG - Mock implementation
const handleSubmit = async () => {
  setLoading(true)
  setTimeout(() => {
    console.log("Mock submit")
    setLoading(false)
    onOpenChange(false)
  }, 2000)
}

// WRONG - Alert instead of toast
alert("Success!")

// WRONG - No error handling
const result = await functionName(data)
onOpenChange(false)
```

## 4. Firebase Functions Implementation

1. Ensure all functions exist in `/functions/src/`:
   ```typescript
   // functions/src/index.ts
   export const createClient = functions.https.onCall(async (data, context) => {
     // Validate auth
     if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
     
     // Validate input
     const { name, industry, description } = data
     if (!name) throw new functions.https.HttpsError('invalid-argument', 'Client name is required')
     
     // Create in Firestore
     const client = {
       name,
       industry,
       description,
       createdAt: admin.firestore.FieldValue.serverTimestamp(),
       createdBy: context.auth.uid,
       organizationId: data.organizationId
     }
     
     const docRef = await admin.firestore()
       .collection('organizations')
       .doc(data.organizationId)
       .collection('clients')
       .add(client)
     
     return { id: docRef.id, ...client }
   })
   ```

2. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

## 5. AI Service Integration

1. Update ia-service for report generation:
   ```javascript
   // ia-service/src/index.js
   app.post('/generate-report', async (req, res) => {
     const { clientData, reportType, language = 'es' } = req.body
     
     try {
       // Initialize Vertex AI
       const vertexAI = new VertexAI({
         project: process.env.GCP_PROJECT_ID,
         location: 'us-central1'
       })
       
       const model = vertexAI.preview.getGenerativeModel({
         model: 'gemini-pro',
       })
       
       // Generate report based on type
       const prompt = buildReportPrompt(reportType, clientData, language)
       const result = await model.generateContent(prompt)
       
       res.json({
         success: true,
         content: result.response.text(),
         reportType,
         generatedAt: new Date().toISOString()
       })
     } catch (error) {
       res.status(500).json({ error: error.message })
     }
   })
   ```

## 6. Integration Testing

1. Test each modal with Firebase emulators:
   ```bash
   # Terminal 1: Start emulators
   firebase emulators:start
   
   # Terminal 2: Start AI service
   cd ia-service && npm start
   
   # Terminal 3: Start Next.js
   npm run dev
   ```

2. Verification checklist for each modal:
   - [ ] Opens and closes properly
   - [ ] Form validation works
   - [ ] Loading states display correctly
   - [ ] Firebase function is called (check Network tab)
   - [ ] Success state updates UI
   - [ ] Error states show proper messages
   - [ ] Data persists in Firestore
   - [ ] No console errors or warnings

## 7. Merge and Cleanup

1. After all features are implemented:
   ```bash
   # Merge all feature branches
   git checkout feature/implement-all-modals
   
   for feature in "${FEATURES[@]}"; do
     git merge "feature/$feature" --no-ff
   done
   
   # Run final verification
   npm run lint
   npm run build
   ```

2. Remove all technical debt:
   ```bash
   # Verify no mocks remain
   rg -i "mock|todo|placeholder" --type tsx --type ts
   
   # Check for console.logs
   rg "console\.(log|error|warn)" --type tsx --type ts
   
   # Ensure all buttons have real handlers
   rg "onClick=\{[^}]*\}" components/ | grep -v "handle"
   ```

## 8. Production Deployment

1. Update environment variables:
   ```bash
   # Ensure all are set in production
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_IA_SERVICE_URL
   ```

2. Deploy everything:
   ```bash
   # Deploy functions
   firebase deploy --only functions
   
   # Deploy AI service
   gcloud run deploy ia-service --source ia-service/
   
   # Build and deploy frontend
   npm run build
   firebase deploy --only hosting
   ```

## AI MODEL VERIFICATION STEPS

<thinking>
Before implementing any feature, I must verify:
1. The modal connects to a real Firebase function (no mocks)
2. All TypeScript types are properly defined
3. Error handling covers all edge cases
4. The UI follows existing shadcn/ui patterns
5. Spanish translations are correct
6. Loading states use proper spinner components
7. Success/error messages use toast notifications
8. The feature integrates with existing auth context
</thinking>

## Success Criteria

The implementation is complete when:
- ✅ All modals open from their respective buttons
- ✅ Each modal performs its intended function
- ✅ No mock data or artificial delays exist
- ✅ All Firebase functions are connected
- ✅ AI report generation works end-to-end
- ✅ Error handling is comprehensive
- ✅ The app builds without warnings
- ✅ All features work in production

</detailed_sequence_steps>

</task>