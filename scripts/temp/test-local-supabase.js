// Test Supabase connection locally with our known keys
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.5P2F3GXNLHWCKk5gdlqXq9rKWwJdwzUg1Bd2tBDnhLE'

console.log('Testing Supabase connection locally...')
console.log('URL:', SUPABASE_URL)
console.log('Service Key (first 20):', SUPABASE_SERVICE_ROLE_KEY.substring(0, 20))

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

try {
  console.log('Attempting to query user_profiles...')
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .limit(1)
  
  if (error) {
    console.error('ERROR:', error)
  } else {
    console.log('SUCCESS:', data)
  }
} catch (err) {
  console.error('EXCEPTION:', err)
}