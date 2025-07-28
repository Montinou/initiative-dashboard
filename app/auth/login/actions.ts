'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return redirect('/auth/login?error=Email and password are required')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    console.error('Login error:', error)
    return redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  if (!email || !password || !fullName) {
    return redirect('/auth/login?error=All fields are required')
  }

  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        full_name: fullName.trim(),
      }
    },
  })

  if (error) {
    console.error('Signup error:', error)
    return redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/auth/login?message=Check your email to continue sign in process')
}

export async function requestPasswordReset(formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const email = formData.get('email') as string

  if (!email) {
    return redirect('/auth/reset-password?error=Email is required')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password/update`,
  })

  if (error) {
    console.error('Password reset error:', error)
    return redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/reset-password?message=Check your email for password reset instructions')
}

export async function updatePassword(formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return redirect('/auth/reset-password/update?error=Both password fields are required')
  }

  if (password !== confirmPassword) {
    return redirect('/auth/reset-password/update?error=Passwords do not match')
  }

  if (password.length < 6) {
    return redirect('/auth/reset-password/update?error=Password must be at least 6 characters')
  }

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    console.error('Password update error:', error)
    return redirect(`/auth/reset-password/update?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard?message=Password updated successfully')
}

export async function signOut() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error)
    return redirect(`/dashboard?error=${encodeURIComponent('Error signing out')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/auth/login')
}