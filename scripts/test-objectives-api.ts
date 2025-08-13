#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function testObjectivesQuery() {
  console.log('🔍 Testing objectives query with initiatives...\n');
  
  // Simulate the exact query from the API
  const { data: objectives, error } = await supabase
    .from('objectives')
    .select(`
      *,
      area:areas!objectives_area_id_fkey(id, name),
      created_by_profile:user_profiles!objectives_created_by_fkey(id, full_name, email),
      initiatives:objective_initiatives(
        initiative:initiatives!objective_initiatives_initiative_id_fkey(
          id,
          title,
          progress,
          area_id,
          status,
          description
        )
      )
    `)
    .limit(3);
  
  if (error) {
    console.error('❌ Error fetching objectives:', error);
    return;
  }
  
  console.log(`Found ${objectives?.length || 0} objectives\n`);
  
  if (objectives) {
    for (const obj of objectives) {
      console.log(`📋 Objective: "${obj.title}"`);
      console.log(`   Area: ${obj.area?.name || 'N/A'}`);
      console.log(`   Created by: ${obj.created_by_profile?.full_name || 'N/A'}`);
      
      if (obj.initiatives && Array.isArray(obj.initiatives)) {
        console.log(`   Initiatives (${obj.initiatives.length}):`);
        
        for (const item of obj.initiatives) {
          if (item.initiative) {
            console.log(`     - "${item.initiative.title}" (Progress: ${item.initiative.progress}%)`);
          }
        }
      } else {
        console.log('   No initiatives linked');
      }
      console.log('');
    }
  }
  
  // Also check the raw objective_initiatives table
  console.log('📊 Checking objective_initiatives table directly:\n');
  const { data: links, error: linkError } = await supabase
    .from('objective_initiatives')
    .select(`
      id,
      objective:objectives!objective_initiatives_objective_id_fkey(id, title),
      initiative:initiatives!objective_initiatives_initiative_id_fkey(id, title, progress)
    `)
    .limit(5);
  
  if (linkError) {
    console.error('❌ Error fetching links:', linkError);
  } else if (links) {
    console.log(`Found ${links.length} sample links:`);
    for (const link of links) {
      console.log(`  - "${link.objective?.title}" → "${link.initiative?.title}" (${link.initiative?.progress}%)`);
    }
  }
}

testObjectivesQuery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });