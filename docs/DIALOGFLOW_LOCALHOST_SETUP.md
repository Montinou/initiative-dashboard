# Dialogflow Messenger - Local Development Setup

## Problem
Dialogflow Messenger requires domains to be explicitly allowed. `localhost` cannot be added directly.

## Solution
Google provides a special domain `127-0-0-1.nip.io` that resolves to localhost and is already in the allowed domains list.

## How to Use

### Option 1: Access via nip.io domain
Instead of:
```
http://localhost:3000
```

Use:
```
http://127-0-0-1.nip.io:3000
```

### Option 2: Update your hosts file (recommended for development)
Add this line to `/etc/hosts`:
```
127.0.0.1 127-0-0-1.nip.io
```

Then access your app at:
```
http://127-0-0-1.nip.io:3000
```

## Production Domains
The following production domains are already configured:
- siga-turismo.vercel.app
- fema-electricidad.vercel.app
- stratix.vercel.app
- ivh.me

## Widget Configuration
The widget is configured with the production-ready settings from Google Cloud Console:
- Uses production scripts and CSS
- Proper agent ID and project configuration
- Gemini 2.5 Flash integration enabled

## Troubleshooting

If you still see 404 errors:
1. Make sure you're accessing via `127-0-0-1.nip.io:3000` not `localhost:3000`
2. Clear browser cache and cookies
3. Check browser console for CORS errors
4. Verify the agent is active in the Google Cloud Console

## Google Cloud Console Links
- [Agent Configuration](https://console.cloud.google.com/dialogflow/cx/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88)
- [Messenger Integration](https://console.cloud.google.com/dialogflow/cx/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88/integrations)