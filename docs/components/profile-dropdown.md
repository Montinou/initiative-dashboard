# Profile Dropdown Component

## Purpose
A user profile dropdown component that provides access to profile settings, role information, and logout functionality. Features a glassmorphism design with click-outside closing behavior.

## Usage

```typescript
import { ProfileDropdown } from '@/components/profile-dropdown';

function Header() {
  const userProfile = {
    name: "John Doe",
    avatar_url: "https://example.com/avatar.jpg",
    role: "Admin"
  };

  return (
    <div className="header">
      <ProfileDropdown userProfile={userProfile} />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `userProfile` | `UserProfile` | No | User profile data with name, avatar, and role |

### UserProfile Interface
```typescript
interface UserProfile {
  name: string;           // User's display name
  avatar_url?: string;    // URL to user's avatar image
  role: string;          // User's role (Admin, CEO, etc.)
}
```

## Dependencies

### Hooks
- `useAuth` from `@/lib/auth-context` - Authentication state and profile data
- `useUserRole` from `@/lib/auth-context` - Role-specific functionality
- `useState` - Dropdown open/close state management
- `useRef` - Reference for click-outside detection
- `useEffect` - Event listeners for closing dropdown
- `useRouter` from Next.js - Navigation after logout

### UI Components
- `Button` from `@/components/ui/button` - Styled button component

### External Services
- `supabase` from `@/lib/supabase` - Authentication and logout

### Icons
- Multiple Lucide React icons: `User`, `Settings`, `Building2`, `LogOut`, `ChevronDown`, `UserCircle2`

## Features

### Dropdown State Management
- Click to open/close dropdown
- Click outside to close dropdown
- Keyboard event handling (Escape key)
- Automatic cleanup of event listeners

### User Profile Display
- User avatar with fallback icon
- Display name from profile or auth context
- Role-based information display
- Responsive design for mobile/desktop

### Navigation Options
- **Profile Settings**: Navigate to user profile page
- **Organization Settings**: Navigate to company settings
- **Logout**: Sign out and redirect to login

### Responsive Design
- Mobile-optimized dropdown positioning
- Glassmorphism styling with backdrop blur
- Smooth animations and transitions

## State Management

### Internal State
```typescript
const [isOpen, setIsOpen] = useState(false);  // Dropdown visibility
```

### External State
- `profile` from `useAuth()` - Current user profile data
- Authentication session from auth context

## Styling

Uses Tailwind CSS with glassmorphism theme:
- `backdrop-blur-md` for glass effect
- `bg-white/10` for transparent backgrounds
- `border border-white/20` for subtle borders
- Smooth transitions with `transition-all duration-200`

## Event Handling

### Click Outside Detection
```typescript
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }

  if (isOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isOpen]);
```

### Logout Functionality
```typescript
const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
    router.push('/auth/login');
  } catch (error) {
    console.error('Error logging out:', error);
  }
};
```

## @sync Dependencies

### Depends On
- `@/lib/auth-context` - User authentication and profile data
- `@/lib/supabase` - Authentication services
- `@/components/ui/button` - Styled button component
- Next.js `useRouter` - Navigation functionality
- Lucide React icons for UI elements

### Used By
- Header components
- Navigation bars
- Layout components requiring user actions

### Component Hierarchy
```
ProfileDropdown
├── Button (trigger)
├── Dropdown Container
│   ├── User Info Section
│   │   ├── Avatar/Icon
│   │   └── Name/Role Display
│   └── Actions Section
│       ├── Profile Link
│       ├── Settings Link
│       └── Logout Button
```

## Examples

### Basic Usage
```typescript
function AppHeader() {
  return (
    <header className="flex justify-between items-center p-4">
      <h1>My Application</h1>
      <ProfileDropdown />
    </header>
  );
}
```

### With Custom Profile Data
```typescript
function CustomHeader({ user }) {
  const profileData = {
    name: user.displayName,
    avatar_url: user.photoURL,
    role: user.role
  };

  return (
    <div className="header">
      <ProfileDropdown userProfile={profileData} />
    </div>
  );
}
```

### Integration with Auth Context
```typescript
function AuthenticatedLayout({ children }) {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="layout">
      <header>
        <ProfileDropdown userProfile={profile} />
      </header>
      <main>{children}</main>
    </div>
  );
}
```

## Accessibility

### Keyboard Navigation
- Tab navigation through dropdown items
- Escape key to close dropdown
- Enter/Space to activate items

### Screen Reader Support
- Proper ARIA labels for interactive elements
- Semantic HTML structure
- Focus management for dropdown state

### Visual Indicators
- Clear visual feedback for interactive states
- High contrast for text readability
- Hover and focus states for all clickable elements

## Performance Considerations

- Event listeners added/removed efficiently
- Minimal re-renders through proper dependency arrays
- Lazy loading of dropdown content
- Optimized click-outside detection

## Error Handling

- Graceful logout error handling
- Fallback avatar icon when image fails
- Navigation error recovery
- Console logging for debugging

## Mobile Responsiveness

- Touch-friendly dropdown sizing
- Optimized positioning for small screens
- Proper spacing for touch interactions
- Responsive text sizing

## Security Considerations

- Secure logout process through Supabase
- No sensitive data in component state
- Proper authentication checks
- Secure navigation after logout

---

*File: `/components/profile-dropdown.tsx`*
*Dependencies: React, Next.js, Supabase, auth context, UI components*
*Used in: Headers, navigation components, authenticated layouts*
*Last updated: Auto-generated from source code*