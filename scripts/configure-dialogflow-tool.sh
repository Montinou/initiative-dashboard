#!/bin/bash

# Configure Dialogflow CX Tool for getInitiativeData

echo "🔧 Configuring Dialogflow CX Tool..."

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"
TOOL_NAME="initiative_data_tool"

# Create OpenAPI schema file
cat > /tmp/openapi-schema.yaml << 'EOF'
openapi: 3.0.0
info:
  title: Initiative Dashboard API
  version: 1.0.0
servers:
  - url: https://us-central1-insaight-backend.cloudfunctions.net
paths:
  /getInitiativeData:
    post:
      summary: Retrieve initiative dashboard data
      operationId: getInitiativeData
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string
                  description: The user's query about initiatives
                filters:
                  type: object
                  description: Optional filters for the data
                  properties:
                    status:
                      type: string
                      enum: [planning, in_progress, completed, on_hold]
                      description: Filter by initiative status
                    date_range:
                      type: string
                      enum: [current_quarter, last_30_days, next_30_days]
                      description: Filter by date range
                    tenant_id:
                      type: string
                      description: Tenant ID to filter data
              required:
                - query
      responses:
        '200':
          description: Initiative data retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    description: Whether the request was successful
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                        status:
                          type: string
                        progress:
                          type: number
                        area:
                          type: string
                        metrics:
                          type: object
                          properties:
                            completion:
                              type: number
                            activities_completed:
                              type: number
                            activities_total:
                              type: number
                            activities_completion_rate:
                              type: number
                        objectives:
                          type: array
                          items:
                            type: object
                            properties:
                              title:
                                type: string
                              progress:
                                type: number
                        due_date:
                          type: string
                        start_date:
                          type: string
                  statistics:
                    type: object
                    properties:
                      total_initiatives:
                        type: number
                      average_progress:
                        type: number
                      by_status:
                        type: object
                  message:
                    type: string
                    description: Formatted message for display
EOF

echo "✅ OpenAPI schema created"

# Note: The actual tool configuration needs to be done through the Dialogflow CX Console
echo ""
echo "📝 Next steps to configure the tool in Dialogflow CX Console:"
echo ""
echo "1. Go to: https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"
echo ""
echo "2. Navigate to: Manage → Tools"
echo ""
echo "3. Click '+ Create Tool'"
echo ""
echo "4. Configure as follows:"
echo "   - Tool Name: $TOOL_NAME"
echo "   - Tool Type: OpenAPI"
echo "   - Description: Retrieves initiative dashboard data from Supabase"
echo "   - Authentication: None (function is public)"
echo "   - OpenAPI Spec: Copy content from /tmp/openapi-schema.yaml"
echo ""
echo "5. Save the tool"
echo ""
echo "6. Update your Playbook to use the tool:"
echo "   - Add instructions to call \${TOOL:$TOOL_NAME} for initiative queries"
echo "   - Add examples of when to use the tool"
echo ""
echo "📄 OpenAPI schema saved to: /tmp/openapi-schema.yaml"