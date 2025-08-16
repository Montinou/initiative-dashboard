# Webhooks API Documentation

## Overview

The Webhooks API enables real-time notifications for events occurring within the Initiative Dashboard system. Webhooks allow external systems to receive immediate updates when data changes, eliminating the need for polling.

## Webhook Configuration

### Webhook URL Registration

Webhooks must be registered at the tenant level by administrators.

```http
POST /api/webhooks/register
```

#### Request Body

```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["initiative.created", "initiative.updated"],
  "secret": "your-webhook-secret",
  "description": "Production webhook for CRM integration",
  "active": true
}
```

#### Response

```json
{
  "id": "webhook-uuid",
  "url": "https://your-domain.com/webhook",
  "events": ["initiative.created", "initiative.updated"],
  "secret_hint": "your-****-****",
  "created_at": "2025-01-15T10:30:00Z",
  "active": true
}
```

## Webhook Security

### Signature Verification

All webhook payloads are signed using HMAC-SHA256 with your webhook secret.

#### Headers

```http
X-Webhook-Signature: sha256=3b5f8e7a9c2d1...
X-Webhook-Id: webhook-uuid
X-Webhook-Timestamp: 1642248330
X-Webhook-Event: initiative.created
```

#### Verification Example (Node.js)

```javascript
const crypto = require('crypto')

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')
  
  return `sha256=${expectedSignature}` === signature
}

// In your webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature']
  const payload = JSON.stringify(req.body)
  
  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature')
  }
  
  // Process webhook
  processWebhook(req.body)
  res.status(200).send('OK')
})
```

## Webhook Events

### Initiative Events

#### initiative.created

Triggered when a new initiative is created.

```json
{
  "event": "initiative.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "area_id": "uuid",
    "title": "New Initiative",
    "description": "Initiative description",
    "status": "planning",
    "progress": 0,
    "created_by": "uuid",
    "start_date": "2025-01-15",
    "due_date": "2025-03-31"
  },
  "metadata": {
    "area_name": "Sales",
    "created_by_name": "John Doe"
  }
}
```

#### initiative.updated

Triggered when an initiative is updated.

```json
{
  "event": "initiative.updated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "changes": {
      "progress": {
        "old": 50,
        "new": 75
      },
      "status": {
        "old": "in_progress",
        "new": "in_progress"
      }
    },
    "current": {
      "id": "uuid",
      "title": "Initiative Title",
      "progress": 75,
      "status": "in_progress"
    }
  },
  "metadata": {
    "updated_by": "uuid",
    "updated_by_name": "Jane Smith"
  }
}
```

#### initiative.completed

Triggered when an initiative is marked as completed.

```json
{
  "event": "initiative.completed",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "title": "Completed Initiative",
    "completion_date": "2025-01-15",
    "final_progress": 100,
    "duration_days": 45,
    "on_time": true
  },
  "metadata": {
    "area_name": "Marketing",
    "completed_by": "John Doe"
  }
}
```

#### initiative.deleted

Triggered when an initiative is deleted.

```json
{
  "event": "initiative.deleted",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "title": "Deleted Initiative",
    "deleted_by": "uuid"
  }
}
```

### Progress Events

#### progress.updated

Triggered when initiative progress is updated.

```json
{
  "event": "progress.updated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "initiative_id": "uuid",
    "initiative_title": "Q1 Campaign",
    "old_progress": 60,
    "new_progress": 75,
    "milestone_achieved": true,
    "milestone": 75
  },
  "metadata": {
    "updated_by": "uuid",
    "notes": "Completed design phase"
  }
}
```

#### progress.milestone

Triggered when a progress milestone is reached (25%, 50%, 75%, 100%).

```json
{
  "event": "progress.milestone",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "initiative_id": "uuid",
    "initiative_title": "Product Launch",
    "milestone": 50,
    "current_progress": 50,
    "estimated_completion": "2025-02-28"
  }
}
```

### Team Events

#### team.member_added

Triggered when a team member is added to an area.

```json
{
  "event": "team.member_added",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "area_id": "uuid",
    "area_name": "Sales",
    "user_id": "uuid",
    "user_name": "New Member",
    "user_email": "member@example.com",
    "role": "member"
  }
}
```

#### team.member_removed

Triggered when a team member is removed from an area.

```json
{
  "event": "team.member_removed",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "area_id": "uuid",
    "area_name": "Sales",
    "user_id": "uuid",
    "user_name": "Former Member"
  }
}
```

#### team.manager_changed

Triggered when an area manager is changed.

```json
{
  "event": "team.manager_changed",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "area_id": "uuid",
    "area_name": "Marketing",
    "old_manager": {
      "id": "uuid",
      "name": "Previous Manager"
    },
    "new_manager": {
      "id": "uuid",
      "name": "New Manager"
    }
  }
}
```

### Activity Events

#### activity.assigned

Triggered when an activity is assigned to a user.

```json
{
  "event": "activity.assigned",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "activity_id": "uuid",
    "activity_title": "Prepare presentation",
    "initiative_id": "uuid",
    "initiative_title": "Q1 Campaign",
    "assigned_to": "uuid",
    "assigned_to_name": "Jane Smith",
    "due_date": "2025-01-20"
  }
}
```

#### activity.completed

Triggered when an activity is marked as completed.

```json
{
  "event": "activity.completed",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "activity_id": "uuid",
    "activity_title": "Design review",
    "initiative_id": "uuid",
    "completed_by": "uuid",
    "completed_by_name": "John Doe",
    "completion_time": "2025-01-15T10:30:00Z"
  }
}
```

### Objective Events

#### objective.created

Triggered when a strategic objective is created.

```json
{
  "event": "objective.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "title": "Increase Market Share",
    "priority": "high",
    "area_id": "uuid",
    "created_by": "uuid"
  }
}
```

#### objective.linked

Triggered when an initiative is linked to an objective.

```json
{
  "event": "objective.linked",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "objective_id": "uuid",
    "objective_title": "Revenue Growth",
    "initiative_id": "uuid",
    "initiative_title": "New Product Launch"
  }
}
```

### Risk Events

#### risk.identified

Triggered when an at-risk initiative is identified.

```json
{
  "event": "risk.identified",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "initiative_id": "uuid",
    "initiative_title": "Critical Project",
    "risk_level": "high",
    "risk_factors": [
      "Behind schedule by 15 days",
      "Resource constraints"
    ],
    "recommended_actions": [
      "Allocate additional resources",
      "Review timeline with stakeholders"
    ]
  }
}
```

## Webhook Endpoints

### 1. Initiative Updates Webhook

```http
POST /api/webhooks/initiative-updates
```

Handles all initiative-related events.

#### Payload Structure

```json
{
  "type": "initiative.created" | "initiative.updated" | "initiative.deleted",
  "record": {
    "id": "uuid",
    "tenant_id": "uuid",
    "area_id": "uuid",
    "title": "Initiative Title",
    "progress": 75,
    "status": "in_progress",
    "old_record": {...}
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### 2. Progress Changes Webhook

```http
POST /api/webhooks/progress-changes
```

Handles progress-related events.

#### Payload Structure

```json
{
  "type": "progress.updated" | "progress.milestone",
  "initiative_id": "uuid",
  "old_progress": 50,
  "new_progress": 75,
  "milestone": 75,
  "updated_by": "uuid",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### 3. Team Notifications Webhook

```http
POST /api/webhooks/team-notifications
```

Handles team and assignment events.

#### Payload Structure

```json
{
  "type": "team.member_added" | "activity.assigned",
  "data": {...},
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Webhook Management

### List Registered Webhooks

```http
GET /api/webhooks
```

#### Response

```json
{
  "webhooks": [
    {
      "id": "uuid",
      "url": "https://your-domain.com/webhook",
      "events": ["initiative.created", "initiative.updated"],
      "description": "Production webhook",
      "active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "last_triggered": "2025-01-15T10:00:00Z",
      "success_rate": 98.5,
      "total_calls": 1250,
      "failed_calls": 18
    }
  ]
}
```

### Update Webhook

```http
PATCH /api/webhooks/{id}
```

#### Request Body

```json
{
  "url": "https://new-domain.com/webhook",
  "events": ["initiative.created"],
  "active": true
}
```

### Delete Webhook

```http
DELETE /api/webhooks/{id}
```

### Test Webhook

Send a test payload to verify webhook configuration.

```http
POST /api/webhooks/{id}/test
```

#### Response

```json
{
  "success": true,
  "status_code": 200,
  "response_time": 250,
  "response_body": "OK"
}
```

## Webhook Retry Policy

Failed webhook deliveries are retried with exponential backoff:

1. **Initial attempt**: Immediate
2. **1st retry**: After 1 minute
3. **2nd retry**: After 5 minutes
4. **3rd retry**: After 15 minutes
5. **4th retry**: After 1 hour
6. **5th retry**: After 6 hours
7. **Final retry**: After 24 hours

After 7 failed attempts, the webhook delivery is marked as failed.

## Webhook Logs

### View Webhook Logs

```http
GET /api/webhooks/{id}/logs
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| start_date | string | No | -7d | Start date for logs |
| end_date | string | No | now | End date for logs |
| status | string | No | all | Filter by status: success, failed, pending |
| limit | number | No | 100 | Maximum logs to return |

#### Response

```json
{
  "logs": [
    {
      "id": "log-uuid",
      "webhook_id": "webhook-uuid",
      "event": "initiative.created",
      "status": "success",
      "status_code": 200,
      "response_time": 145,
      "attempt": 1,
      "payload_size": 1024,
      "error": null,
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "total": 100,
    "successful": 98,
    "failed": 2,
    "average_response_time": 180
  }
}
```

## Best Practices

### Webhook Handler Implementation

1. **Acknowledge quickly**: Return 200 OK immediately, process asynchronously
2. **Idempotency**: Handle duplicate events using event IDs
3. **Order independence**: Don't assume events arrive in order
4. **Graceful failures**: Implement proper error handling and logging
5. **Security**: Always verify webhook signatures

### Example Handler (Node.js)

```javascript
const express = require('express')
const app = express()

// Webhook handler
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Verify signature
  if (!verifySignature(req)) {
    return res.status(401).send('Unauthorized')
  }
  
  // Parse payload
  const payload = JSON.parse(req.body)
  
  // Acknowledge receipt immediately
  res.status(200).send('OK')
  
  // Process asynchronously
  setImmediate(async () => {
    try {
      await processWebhookEvent(payload)
    } catch (error) {
      console.error('Webhook processing error:', error)
      // Log to error tracking service
    }
  })
})

async function processWebhookEvent(payload) {
  const { event, data } = payload
  
  // Check for duplicate processing
  if (await isDuplicate(payload.id)) {
    console.log('Duplicate event, skipping:', payload.id)
    return
  }
  
  // Process based on event type
  switch (event) {
    case 'initiative.created':
      await handleInitiativeCreated(data)
      break
    case 'initiative.updated':
      await handleInitiativeUpdated(data)
      break
    case 'progress.milestone':
      await handleProgressMilestone(data)
      break
    default:
      console.log('Unknown event type:', event)
  }
  
  // Mark as processed
  await markProcessed(payload.id)
}
```

## Error Handling

### Common Webhook Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| 401 | Invalid signature | Check webhook secret |
| 404 | Webhook URL not found | Verify URL is correct |
| 408 | Request timeout | Respond within 10 seconds |
| 413 | Payload too large | Contact support |
| 429 | Rate limited | Implement backoff |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry later |

### Monitoring Webhook Health

```http
GET /api/webhooks/{id}/health
```

#### Response

```json
{
  "webhook_id": "uuid",
  "status": "healthy",
  "success_rate": 99.5,
  "average_response_time": 150,
  "last_success": "2025-01-15T10:30:00Z",
  "last_failure": "2025-01-14T08:15:00Z",
  "consecutive_failures": 0,
  "health_checks": {
    "connectivity": "pass",
    "response_time": "pass",
    "error_rate": "pass"
  }
}
```

## Examples

### JavaScript Webhook Receiver

```javascript
// Express.js webhook receiver
const express = require('express')
const crypto = require('crypto')
const app = express()

app.post('/webhook', express.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf-8')
  }
}), (req, res) => {
  // Verify signature
  const signature = req.headers['x-webhook-signature']
  const expectedSig = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex')
  
  if (`sha256=${expectedSig}` !== signature) {
    return res.status(401).send('Invalid signature')
  }
  
  // Handle event
  const { event, data } = req.body
  console.log(`Received ${event}:`, data)
  
  // Process event asynchronously
  processEvent(event, data)
    .catch(err => console.error('Processing error:', err))
  
  // Acknowledge receipt
  res.status(200).send('OK')
})
```

### Python Webhook Receiver

```python
from flask import Flask, request, abort
import hmac
import hashlib
import json

app = Flask(__name__)
WEBHOOK_SECRET = 'your-secret'

@app.route('/webhook', methods=['POST'])
def webhook():
    # Verify signature
    signature = request.headers.get('X-Webhook-Signature')
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        request.data,
        hashlib.sha256
    ).hexdigest()
    
    if signature != expected:
        abort(401)
    
    # Parse payload
    payload = request.json
    event = payload['event']
    data = payload['data']
    
    # Process asynchronously
    process_webhook.delay(event, data)
    
    return 'OK', 200

def process_webhook(event, data):
    """Process webhook in background"""
    if event == 'initiative.created':
        handle_initiative_created(data)
    elif event == 'progress.milestone':
        handle_progress_milestone(data)
```