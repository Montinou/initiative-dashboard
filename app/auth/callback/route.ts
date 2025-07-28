import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')

  if (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!exchangeError) {
        // Successfully exchanged code for session
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(
          `${origin}/auth/login?error=${encodeURIComponent('Authentication failed')}`
        )
      }
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent('Authentication error occurred')}`
      )
    }
  }

  // No code parameter, redirect to login
  return NextResponse.redirect(`${origin}/auth/login`)
}