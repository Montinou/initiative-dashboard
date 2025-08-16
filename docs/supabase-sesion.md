# Guía Completa de Autenticación en Supabase

Great question! With Row Level Security (RLS) policies in place, Supabase and PostgreSQL handle the row-level filtering automatically. Here's what you need to know:

Authentication is Key:

The policies rely on auth.uid() to determine the current user
Make sure you're authenticated when making database queries
Use Supabase client libraries which automatically include the user's JWT token
No Additional Configuration Needed:

RLS is automatically applied to all queries
You don't need to modify your existing query logic
The database will transparently filter rows based on the policies
Client-Side Example (JavaScript/TypeScript):

// This query will automatically only 
return
 rows 
from
 the use
r's tenant
const { data, error } = await supabase
  .from('
user_profiles
')
  .select('
*
')  // Automatically filtered by RLS

Important Considerations:
Always authenticate users before database operations
Service Role key bypasses RLS (use with caution)
Policies are checked for every SELECT, INSERT, UPDATE, DELETE operation

Key improvements in these policies:

Strict Tenant Isolation:

Every policy now checks tenant_id = get_current_user_tenant()
Prevents cross-tenant data access
Role-Based Access Control:

Added role checks for sensitive operations
Admins and CEOs have broader access
Managers have some elevated permissions
Complex Access Rules:

For objectives, initiatives, activities:
Users can modify their own created items
Admins/CEOs can modify any items in their tenant
Managers have some update capabilities
Granular Permissions:

Different policies for SELECT, INSERT, UPDATE, DELETE
Contextual checks based on user roles and ownership
Preventing Unauthorized Actions:

Users can only insert/modify items within their tenant
Uploaded files can only be deleted by the original uploader
Invitations can only be modified by the sender
Notable changes from previous implementation:

Removed global access policies
Added role-based access checks
More nuanced tenant and ownership verification
Would you like me to elaborate on any specific policy or its rationale?



Supabase Auth proporciona un sistema completo de autenticación y autorización que soporta múltiples métodos de login, desde autenticación básica con email/password hasta proveedores OAuth avanzados, Magic Links, autenticación por teléfono, MFA y SSO empresarial. Todos los métodos utilizan JSON Web Tokens (JWTs) y se integran nativamente con Row Level Security (RLS) de PostgreSQL.

## Configuración inicial del cliente

### Instalación y configuración básica

```bash
npm install @supabase/supabase-js
```

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,           // Auto-refrescar tokens (default: true)
      persistSession: true,             // Persistir sesión en storage (default: true)
      detectSessionInUrl: true,         // Detectar sesión en URL para OAuth (default: true)
      flowType: 'pkce',                // Flujo OAuth: 'implicit' o 'pkce' (default: 'implicit')
      debug: false,                    // Habilitar debug messages (default: false)
    }
  }
)
```

### Configuración para diferentes entornos

#### Server-Side Rendering (SSR) con @supabase/ssr

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Cliente del navegador** (`utils/supabase/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Cliente del servidor** (`utils/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Manejar errores en Server Components
          }
        },
      },
    }
  )
}
```

## Métodos de autenticación disponibles

### Email/Password

```javascript
// Registro de usuario
async function signUpNewUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'usuario@ejemplo.com',
    password: 'contraseña-segura',
    options: {
      emailRedirectTo: 'https://ejemplo.com/welcome',
      data: {
        first_name: 'Juan',
        age: 27,
      }
    },
  })
}

// Inicio de sesión
async function signInWithEmail() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'usuario@ejemplo.com',
    password: 'contraseña-segura',
  })
}

// Recuperación de contraseña
await supabase.auth.resetPasswordForEmail('usuario@ejemplo.com', {
  redirectTo: 'http://ejemplo.com/account/update-password',
})
```

### Magic Links (Enlaces mágicos)

```javascript
// Enviar magic link
async function signInWithMagicLink() {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: 'usuario@ejemplo.com',
    options: {
      shouldCreateUser: false, // Prevenir auto-registro
      emailRedirectTo: 'https://ejemplo.com/welcome',
    },
  })
}

// Para PKCE Flow (SSR) - personalizar plantilla de email
// Plantilla: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

### OAuth (Proveedores sociales)

```javascript
// Login con proveedor OAuth
async function signInWithProvider() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google', // google, github, facebook, apple, discord, etc.
    options: {
      redirectTo: 'http://ejemplo.com/auth/callback',
    }
  })
}

// Manejo del callback (PKCE)
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}/welcome`)
    }
  }
  
  return NextResponse.redirect(`${origin}/auth/error`)
}
```

### Autenticación por teléfono (SMS/WhatsApp)

```javascript
// Solicitar OTP
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890',
})

// Verificar OTP
const { data: { session }, error } = await supabase.auth.verifyOtp({
  phone: '+1234567890',
  token: '123456',
  type: 'sms',
})
```

## Manejo de sesiones y tokens

### Gestión de sesiones

```javascript
// Obtener sesión actual (solo cliente)
const { data: { session }, error } = await supabase.auth.getSession()

// Verificar usuario autenticado (servidor - SIEMPRE usar este método)
const { data: { user }, error } = await supabase.auth.getUser()

// Cerrar sesión
const { error } = await supabase.auth.signOut()

// Cerrar sesión con diferentes scopes
await supabase.auth.signOut({ scope: 'local' })   // Solo sesión actual
await supabase.auth.signOut({ scope: 'others' })  // Todas excepto actual
```

### Escuchar cambios de autenticación

```javascript
const { data } = supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
  
  switch (event) {
    case 'INITIAL_SESSION':
      // Manejar sesión inicial
      break
    case 'SIGNED_IN':
      // Usuario autenticado
      break
    case 'SIGNED_OUT':
      // Usuario desconectado
      break
    case 'TOKEN_REFRESHED':
      // Token renovado automáticamente
      break
    case 'USER_UPDATED':
      // Datos del usuario actualizados
      break
  }
})

// Cancelar suscripción
data.subscription.unsubscribe()
```

### Context de React para autenticación

```javascript
import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => authListener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

## Refresh tokens y almacenamiento seguro

### Funcionamiento de refresh tokens

**Los refresh tokens en Supabase**:
- Nunca expiran por sí mismos, pero solo pueden usarse una vez
- Los access tokens tienen vida corta (5 minutos a 1 hora por defecto)
- Cuando se usa un refresh token, se genera un nuevo par de access token + refresh token
- Se renuevan automáticamente cuando `autoRefreshToken: true`

### Almacenamiento seguro con cookies (SSR)

```javascript
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(url, anonKey, {
  cookies: {
    get(name) {
      return getCookie(name)
    },
    set(name, value, options) {
      setCookie(name, value, {
        ...options,
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      })
    },
    remove(name, options) {
      removeCookie(name, options)
    }
  }
})
```

## Protección de rutas y middleware

### Middleware de Next.js

```javascript
// middleware.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Protección de páginas en Next.js

```typescript
// Server Component protegido
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function PrivatePage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data?.user) {
    redirect('/login')
  }
  
  return <p>Hola {data.user.email}</p>
}
```

### Componente de ruta protegida (React)

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
```

## Manejo de errores

### Sistema completo de manejo de errores

```javascript
import { isAuthApiError } from '@supabase/supabase-js'

const handleAuthError = (error) => {
  if (!isAuthApiError(error)) return 'Error desconocido'
  
  switch (error.code) {
    case 'invalid_credentials':
      return 'Email o contraseña incorrectos'
    case 'email_not_confirmed':
      return 'Confirma tu email antes de iniciar sesión'
    case 'weak_password':
      return 'La contraseña es demasiado débil'
    case 'over_email_send_rate_limit':
      return 'Demasiados emails enviados. Espera antes de intentar de nuevo'
    case 'session_expired':
      return 'Tu sesión ha expirado. Inicia sesión nuevamente'
    default:
      return `Error: ${error.code}`
  }
}

// Hook de React para manejo de errores
export const useAuthError = () => {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleAuthOperation = async (operation) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await operation()
      
      if (result.error) {
        setError(handleAuthError(result.error))
        return { success: false, error: result.error }
      }
      
      return { success: true, data: result.data }
    } catch (err) {
      const message = handleAuthError(err)
      setError(message)
      return { success: false, error: err }
    } finally {
      setLoading(false)
    }
  }

  return { error, loading, handleAuthOperation, clearError: () => setError(null) }
}
```

## Row Level Security (RLS) y autenticación

### Políticas básicas con auth.uid()

```sql
-- Habilitar RLS en tabla
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: usuarios pueden ver solo sus propios datos
CREATE POLICY "Users can view own data"
ON profiles FOR SELECT
TO authenticated 
USING ( (SELECT auth.uid()) = user_id );

-- Política: usuarios pueden actualizar solo su perfil
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING ( (SELECT auth.uid()) = user_id )
WITH CHECK ( (SELECT auth.uid()) = user_id );
```

### Políticas avanzadas con MFA

```sql
-- Requerir MFA para operaciones sensibles
CREATE POLICY "Require MFA for sensitive data"
ON sensitive_table AS RESTRICTIVE
FOR ALL TO authenticated 
USING ((SELECT auth.jwt() ->> 'aal') = 'aal2');
```

## Multi-Factor Authentication (MFA)

### Enrollment de TOTP

```javascript
// Generar QR y secret
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Mi Authenticator App'
})

// Mostrar QR: data.totp.qr_code
// Secret manual: data.totp.secret

// Verificar setup
const { data: challengeData } = await supabase.auth.mfa.challenge({
  factorId: data.id
})

const { data: verifyData } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challengeData.id,
  code: '123456'
})
```

### Verificación de nivel de autenticación

```javascript
// Verificar si el usuario necesita completar MFA
const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
  // Usuario necesita completar MFA
  // Mostrar pantalla de verificación MFA
}
```

## Mejores prácticas de seguridad

### Configuraciones esenciales

1. **Siempre usar HTTPS** en producción
2. **Habilitar verificación de email** por defecto
3. **Configurar SMTP personalizado** para producción
4. **Implementar Rate Limiting** apropiado
5. **Usar RLS en todas las tablas públicas**

### Configuración segura de cookies

```javascript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    cookieOptions: {
      name: 'sb-session',
      domain: 'yourdomain.com', 
      path: '/',
      sameSite: 'Lax', // Mitigar CSRF
      secure: true,     // Requiere HTTPS
      maxAge: 3600,     // Alinear con expiración token
    },
  },
});
```

### Rate Limiting

Supabase implementa rate limiting automático:
- **Emails de auth**: 2 emails por hora
- **OTP**: 30 OTPs por hora
- **Token refresh**: 1800 requests/hora
- **Sign-ins anónimos**: 30 requests/hora

### Validación en servidor

```javascript
// ❌ NUNCA usar en server-side code
const { data: { session } } = await supabase.auth.getSession()

// ✅ SIEMPRE usar en server-side code
const { data: { user }, error } = await supabase.auth.getUser()
```

## Single Sign-On (SSO) empresarial

Disponible en planes Pro+ con SAML 2.0:

```javascript
// Inicio SSO
const { data, error } = await supabase.auth.signInWithSSO({
  domain: 'company.com'  // o provider_id específico
})
```

Soporta proveedores como:
- Microsoft Active Directory (Azure AD)
- Okta
- Google Workspaces
- PingIdentity
- OneLogin

## Conclusión

Supabase Auth ofrece uno de los sistemas de autenticación más completos del mercado, cubriendo desde autenticación básica hasta casos de uso empresariales avanzados. La integración nativa con PostgreSQL y RLS proporciona un control granular único, mientras que la amplia gama de proveedores OAuth y métodos passwordless permite crear experiencias de usuario excepcionales.

La implementación correcta requiere:
- Configurar el cliente apropiadamente según el entorno (client-side vs SSR)
- Usar los métodos de validación correctos en servidor (`getUser()`)
- Implementar RLS para seguridad a nivel de base de datos
- Manejar errores de forma elegante
- Configurar MFA para datos sensibles
- Seguir las mejores prácticas de seguridad

Con esta guía tienes todo lo necesario para implementar un sistema de autenticación robusto y seguro en tu aplicación con Supabase.