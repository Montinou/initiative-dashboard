import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  
  // Sign out the user
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
  
  // Create response with cleared cookies
  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  )
  
  // Clear all Supabase auth cookies
  response.cookies.set('sb-access-token', '', {
    path: '/',
    maxAge: 0
  })
  response.cookies.set('sb-refresh-token', '', {
    path: '/',
    maxAge: 0
  })
  
  return response
}

// Support DELETE method as well
export async function DELETE() {
  return POST()
}