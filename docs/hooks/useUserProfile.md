# useUserProfile Hook

## Overview
A custom React hook that manages user profile data fetching, state management, and error handling. It integrates with the authentication context to fetch detailed user profile information from the API.

**File:** `hooks/useUserProfile.ts`

## Usage

```tsx
import { useUserProfile } from '@/hooks/useUserProfile'

function ProfileComponent() {
  const { userProfile, loading, error, refetchProfile } = useUserProfile()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h1>{userProfile?.name}</h1>
      <p>{userProfile?.email}</p>
      <button onClick={refetchProfile}>Refresh</button>
    </div>
  )
}
```

## Return Values

### userProfile
```tsx
interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  tenant_id: string
  avatar_url?: string
  phone?: string
  title?: string
  bio?: string
}
```

### loading
- **Type**: `boolean`
- **Description**: Indicates if profile data is currently being fetched
- **Initial Value**: `true`

### error
- **Type**: `string | null`
- **Description**: Contains error message if profile fetch fails
- **Initial Value**: `null`

### refetchProfile
- **Type**: `() => Promise<void>`
- **Description**: Function to manually refetch user profile data
- **Usage**: Call when profile data needs to be refreshed

## Features
- **Authentication Integration**: Automatically uses auth context for access tokens
- **Automatic Fetching**: Fetches profile data on mount and auth state changes
- **Error Handling**: Comprehensive error catching and user-friendly messages
- **Manual Refresh**: Provides refetch function for manual data updates
- **Loading States**: Proper loading state management
- **Type Safety**: Full TypeScript support with defined interfaces

## Implementation Details

### Dependencies
- `useAuth`: Authentication context hook for access token
- `/api/profile/user`: API endpoint for profile data

### Effect Triggers
The hook automatically refetches data when:
- Component mounts
- Auth profile changes (login/logout)
- Access token updates

### Error Handling
- Network errors are caught and stored in error state
- HTTP status errors are handled appropriately
- Error messages are user-friendly
- Console logging for debugging

### Authentication Requirements
- Requires valid `access_token` from auth context
- Uses Bearer token authentication
- Gracefully handles missing authentication

## API Integration
Makes requests to `/api/profile/user` endpoint:
- **Method**: GET
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ profile: UserProfile }`

## State Management Flow
1. **Initial State**: `loading: true`, `userProfile: null`, `error: null`
2. **Auth Check**: Validates access token availability
3. **API Request**: Fetches profile data with Bearer token
4. **Success**: Updates `userProfile`, clears `error`, sets `loading: false`
5. **Error**: Sets `error` message, sets `loading: false`

## Performance Considerations
- Only fetches when access token is available
- Prevents unnecessary API calls
- Efficient dependency array in useEffect
- Automatic cleanup on unmount

## Error Messages
- `"Failed to fetch user profile"`: Network or API errors
- Custom error messages from API responses
- Console logging for debugging purposes

## Usage Patterns

### Basic Profile Display
```tsx
function UserCard() {
  const { userProfile, loading } = useUserProfile()
  
  if (loading) return <Skeleton />
  
  return (
    <Card>
      <Avatar src={userProfile?.avatar_url} />
      <h3>{userProfile?.name}</h3>
      <p>{userProfile?.title}</p>
    </Card>
  )
}
```

### Profile Form with Refresh
```tsx
function ProfileForm() {
  const { userProfile, loading, error, refetchProfile } = useUserProfile()
  
  const handleSubmit = async (data) => {
    await updateProfile(data)
    await refetchProfile() // Refresh after update
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

### Conditional Rendering
```tsx
function ProfilePage() {
  const { userProfile, loading, error } = useUserProfile()
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!userProfile) return <ProfileNotFound />
  
  return <ProfileDetails profile={userProfile} />
}
```

## Testing Considerations
- Mock the `useAuth` hook for testing
- Test loading states
- Test error scenarios
- Test successful data fetching
- Test refetch functionality

## Dependencies
- `react`: useState, useEffect hooks
- `@/lib/auth-context`: Authentication context
- Browser fetch API for HTTP requests

## Browser Support
Works in all modern browsers that support:
- React hooks
- Fetch API
- ES6+ JavaScript features