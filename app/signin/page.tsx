import { redirect } from 'next/navigation'

export default function SignInPage() {
  // Redirect to the actual login page
  redirect('/auth/login')
}