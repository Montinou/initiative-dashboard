# Gemini AI Context Integration

## Overview

The Gemini AI assistant in the Initiative Dashboard now receives structured context data to provide more accurate and relevant responses. This system automatically provides the AI with the last 3 months of OKR data (configurable) when users interact with it.

## API Endpoint

### POST `/api/gemini-context`

Generates structured context data for the Gemini AI assistant.

#### Request Body

```json
{
  "months": 3,               // Number of months to include (default: 3)
  "includeActivities": true  // Whether to include activity details (default: true)
}
```

#### Response Structure

The API returns a comprehensive JSON structure with the following format:

```json
{
  "user": {
    "id": "user-id",
    "full_name": "User Name",
    "email": "user@example.com",
    "role": "CEO|Admin|Manager",
    "area_id": "area-id or null",
    "tenant_id": "tenant-id",
    "is_system_admin": false
  },
  "tenant": {
    "id": "tenant-id",
    "organization_name": "Organization Name",
    "subdomain": "subdomain"
  },
  "context": {
    "areas": [
      {
        "id": "area-id",
        "name": "Area Name",
        "description": "Area description",
        "manager_id": "manager-id",
        "manager_name": "Manager Name",
        "is_active": true
      }
    ],
    "objectives": [
      {
        "id": "objective-id",
        "title": "Objective Title",
        "description": "Objective description",
        "area_id": "area-id",
        "area_name": "Area Name",
        "status": "planning|in_progress|completed|overdue",
        "priority": "high|medium|low",
        "progress": 0-100,
        "quarter": "Q1|Q2|Q3|Q4",
        "target_date": "YYYY-MM-DD",
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD",
        "metrics": [
          {
            "name": "Metric Name",
            "target": "Target Value",
            "current": "Current Value"
          }
        ],
        "linked_initiative_ids": ["init-id-1", "init-id-2"]
      }
    ],
    "initiatives": [
      {
        "id": "initiative-id",
        "area_id": "area-id",
        "area_name": "Area Name",
        "title": "Initiative Title",
        "description": "Initiative description",
        "status": "planning|in_progress|completed|on_hold",
        "progress": 0-100,
        "start_date": "YYYY-MM-DD",
        "due_date": "YYYY-MM-DD",
        "completion_date": "YYYY-MM-DD or null",
        "created_by": "creator-id",
        "created_by_name": "Creator Name",
        "linked_objective_ids": ["obj-id-1", "obj-id-2"]
      }
    ],
    "activities": [
      {
        "id": "activity-id",
        "initiative_id": "initiative-id",
        "title": "Activity Title",
        "description": "Activity description",
        "is_completed": true|false,
        "assigned_to": "assignee-id",
        "assignee_name": "Assignee Name",
        "assignee_email": "assignee@example.com"
      }
    ],
    "quarters": [
      {
        "id": "quarter-id",
        "quarter_name": "Q1|Q2|Q3|Q4",
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD"
      }
    ]
  },
  "summary": {
    "total_objectives": 10,
    "total_initiatives": 25,
    "total_activities": 100,
    "activities_completed": 60,
    "avg_objective_progress": 65,
    "areas_performance": {
      "area-id-1": {
        "objectives": 3,
        "initiatives": 8,
        "avg_progress": 70
      },
      "area-id-2": {
        "objectives": 2,
        "initiatives": 5,
        "avg_progress": 55
      }
    }
  },
  "metadata": {
    "timestamp": "2024-02-15T10:30:00Z",
    "user_role": "CEO|Admin|Manager",
    "data_scope": "all_tenant_data|area_restricted",
    "language": "es",
    "months_included": 3
  }
}
```

## How It Works

### 1. Initial Context Loading

When the Gemini chat component initializes:

1. **Authentication Check**: Verifies user is authenticated
2. **Context Fetch**: Calls `/api/gemini-context` to get structured data
3. **AI Initialization**: Provides the full context to Gemini in the system prompt
4. **Welcome Message**: Shows summary statistics to the user

### 2. Dynamic Context Updates

The system can refresh context data in two ways:

#### Automatic Refresh
When users ask questions containing keywords like:
- "current"
- "latest"
- "recent"
- "today"
- "this week"
- "status"

The system automatically fetches fresh context before sending the query.

#### Manual Refresh
Users can click the refresh button in the chat header to manually update the context data.

### 3. Context-Aware Responses

Gemini uses the structured data to:
- Reference specific objectives, initiatives, and activities by name and ID
- Provide accurate progress metrics and statistics
- Understand organizational structure and team assignments
- Give role-appropriate insights based on user permissions
- Analyze trends and patterns in the data

## Configuration

### Environment Variables

```bash
NEXT_PUBLIC_GOOGLE_AI_API_KEY=your-gemini-api-key
```

### Customizing Context Period

To change the default 3-month period, modify the API call in `gemini-chat.tsx`:

```typescript
const response = await fetch('/api/gemini-context', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    months: 6,  // Change to desired number of months
    includeActivities: true 
  })
});
```

## Security Considerations

1. **Authentication Required**: The context API requires valid authentication
2. **Tenant Isolation**: Data is automatically filtered by tenant
3. **Role-Based Access**: 
   - CEO/Admin: Access to all tenant data
   - Manager: Access restricted to their area
4. **No Sensitive Data**: The context excludes sensitive information like passwords

## Usage Examples

### Example User Queries

With the structured context, users can ask:

1. **Progress Analysis**
   - "What's the average progress of our Q1 objectives?"
   - "Which initiatives are behind schedule?"
   - "Show me the completion rate for Marketing initiatives"

2. **Team Performance**
   - "How many activities does John have assigned?"
   - "Which area has the highest completion rate?"
   - "Who's responsible for the expansion initiative?"

3. **Strategic Insights**
   - "What are our high-priority objectives?"
   - "Which objectives have the most linked initiatives?"
   - "What's our overall organizational progress?"

4. **Specific Data Queries**
   - "Tell me about objective obj-001"
   - "What's the status of the Patagonia expansion?"
   - "List all initiatives in the Operations area"

## Troubleshooting

### Context Not Loading

1. Check authentication is working
2. Verify the API endpoint is accessible
3. Check browser console for errors
4. Ensure sufficient data exists in the database

### Outdated Information

1. Click the refresh button to update context
2. Check the `metadata.timestamp` to see when data was fetched
3. Verify database has recent data

### Performance Issues

1. Reduce the number of months included
2. Set `includeActivities: false` if activity details aren't needed
3. Consider implementing pagination for large datasets

## Future Enhancements

- **Streaming Updates**: Real-time context updates via WebSocket
- **Selective Context**: Load only relevant data based on conversation topic
- **Context Caching**: Cache context data with smart invalidation
- **Multi-language Support**: Provide context in user's preferred language
- **Historical Comparisons**: Include year-over-year comparisons
- **Predictive Analytics**: Add trend analysis and projections

## Related Documentation

- [Gemini Chat Component](../../components/gemini-chat.tsx)
- [API Authentication](./authentication.md)
- [Database Schema](../database/schema.md)
- [User Roles and Permissions](../TECHNICAL_DOCUMENTATION.md#security-model)