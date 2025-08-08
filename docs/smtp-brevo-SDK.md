Guía de Integración de Correos Electrónicos con SupabaseEsta guía detalla cómo utilizar el sistema de autenticación de Supabase para enviar correos electrónicos para el registro de usuarios, inicios de sesión sin contraseña e invitaciones. Utilizaremos el SDK de Supabase para Node.js, que simplifica la interacción con el backend de autenticación.1. Requisitos PreviosAntes de comenzar, asegúrate de tener configurados los siguientes elementos en tu proyecto de Supabase:Proveedor de Correo Electrónico (SMTP): Para enviar correos, Supabase requiere que configures un proveedor de SMTP. Puedes usar servicios como Brevo (Sendinblue), SendGrid o Postmark. La configuración se realiza en el panel de control de Supabase en Authentication -> Settings -> Email Templates.Archivos de Variables de Entorno: Asegúrate de tener las siguientes variables configuradas en tu archivo .env.local y en la configuración de Vercel (o en tu entorno de producción):NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
2. Registro de Usuario con Email y ContraseñaUtiliza el método signUp() para registrar nuevos usuarios. Supabase enviará automáticamente un correo de confirmación con un enlace.import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback` // URL a donde redirigir después de la confirmación
    }
  });

  if (error) {
    console.error('Error al registrar usuario:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}
3. Inicios de Sesión sin Contraseña (Magic Links/OTP)El método signInWithOtp() es ideal para inicios de sesión sin contraseña. Supabase enviará un email con un enlace o un código de un solo uso (OTP).import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Uso para Magic Link (por defecto)
async function signInWithMagicLink(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) {
    console.error('Error al solicitar magic link:', error.message);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// Uso para OTP (código)
async function signInWithOtpCode(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true // Opcional: crea el usuario si no existe
    }
  });

  if (error) {
    console.error('Error al solicitar OTP:', error.message);
    return { success: false, error: error.message };
  }

  // Después, el usuario debe introducir el código en el frontend
  // const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });

  return { success: true };
}
4. Invitar Usuarios a Través de la API de AdministraciónPara invitar a nuevos usuarios desde tu aplicación (ej. por un Admin), debes usar un cliente de Supabase con el Service Role Key, ya que esta es una operación de administración.import { createClient } from '@supabase/supabase-js';

// Usar el cliente en modo administrador para el backend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Clave de Service Role, no la anónima
);

async function inviteNewUser(email) {
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email, {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  );

  if (error) {
    console.error('Error al invitar al usuario:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}
Importante: La SUPABASE_SERVICE_ROLE_KEY debe ser utilizada únicamente en un entorno de servidor seguro, como una API Route o una función de backend, y nunca debe ser expuesta al lado del cliente.