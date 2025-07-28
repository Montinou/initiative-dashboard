// Legacy Supabase client for compatibility during migration
// TODO: Remove this file once all imports are migrated to utils/supabase/client.ts and utils/supabase/server.ts

import { createClient } from '@supabase/supabase-js'
import { Database } from './types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)