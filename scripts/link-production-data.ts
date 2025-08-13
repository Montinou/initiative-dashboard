#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function linkObjectivesWithInitiatives() {
  try {
    console.log('🔗 Linking objectives with initiatives in production...');
    
    // First, check current state
    const { data: objectives, error: objError } = await supabase
      .from('objectives')
      .select('id, title, area_id, tenant_id')
      .order('created_at', { ascending: true });
    
    if (objError) {
      console.error('Error fetching objectives:', objError);
      return;
    }
    
    const { data: initiatives, error: initError } = await supabase
      .from('initiatives')
      .select('id, title, area_id, tenant_id')
      .order('created_at', { ascending: true });
    
    if (initError) {
      console.error('Error fetching initiatives:', initError);
      return;
    }
    
    console.log(`Found ${objectives?.length || 0} objectives and ${initiatives?.length || 0} initiatives`);
    
    // Check existing links
    const { data: existingLinks, error: linkError } = await supabase
      .from('objective_initiatives')
      .select('*');
    
    if (linkError) {
      console.error('Error fetching existing links:', linkError);
      return;
    }
    
    console.log(`Currently have ${existingLinks?.length || 0} links`);
    
    if (existingLinks && existingLinks.length > 0) {
      console.log('✅ Links already exist, skipping creation');
      return;
    }
    
    // Create links based on matching area_id and tenant_id
    const links: Array<{ objective_id: string; initiative_id: string }> = [];
    
    if (objectives && initiatives) {
      for (const objective of objectives) {
        // Link each objective to initiatives in the same area and tenant
        const matchingInitiatives = initiatives.filter(init => 
          init.area_id === objective.area_id && 
          init.tenant_id === objective.tenant_id
        );
        
        for (const initiative of matchingInitiatives) {
          links.push({
            objective_id: objective.id,
            initiative_id: initiative.id
          });
        }
      }
    }
    
    if (links.length === 0) {
      console.log('⚠️ No matching objectives and initiatives found to link');
      
      // If no area matches, create some default links for demonstration
      if (objectives && objectives.length > 0 && initiatives && initiatives.length > 0) {
        console.log('Creating demonstration links...');
        
        // Group by tenant
        const tenantGroups: Record<string, { objectives: any[], initiatives: any[] }> = {};
        
        for (const obj of objectives) {
          if (!tenantGroups[obj.tenant_id]) {
            tenantGroups[obj.tenant_id] = { objectives: [], initiatives: [] };
          }
          tenantGroups[obj.tenant_id].objectives.push(obj);
        }
        
        for (const init of initiatives) {
          if (tenantGroups[init.tenant_id]) {
            tenantGroups[init.tenant_id].initiatives.push(init);
          }
        }
        
        // Create links within each tenant
        for (const [tenantId, group] of Object.entries(tenantGroups)) {
          const { objectives: tenantObjs, initiatives: tenantInits } = group;
          
          if (tenantObjs.length > 0 && tenantInits.length > 0) {
            // Link each objective to 1-3 initiatives
            for (let i = 0; i < tenantObjs.length; i++) {
              const numLinks = Math.min(3, tenantInits.length);
              for (let j = 0; j < numLinks; j++) {
                const initIndex = (i * numLinks + j) % tenantInits.length;
                links.push({
                  objective_id: tenantObjs[i].id,
                  initiative_id: tenantInits[initIndex].id
                });
              }
            }
          }
        }
      }
    }
    
    if (links.length > 0) {
      console.log(`Creating ${links.length} links between objectives and initiatives...`);
      
      const { data, error } = await supabase
        .from('objective_initiatives')
        .insert(links)
        .select();
      
      if (error) {
        console.error('Error creating links:', error);
      } else {
        console.log(`✅ Successfully created ${data?.length || 0} links`);
      }
    }
    
    // Verify the links were created
    const { data: newLinks, error: verifyError } = await supabase
      .from('objective_initiatives')
      .select(`
        objective:objectives!objective_initiatives_objective_id_fkey(title),
        initiative:initiatives!objective_initiatives_initiative_id_fkey(title)
      `)
      .limit(5);
    
    if (!verifyError && newLinks) {
      console.log('\nSample of created links:');
      for (const link of newLinks) {
        console.log(`  - "${link.objective?.title}" → "${link.initiative?.title}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the linking function
linkObjectivesWithInitiatives()
  .then(() => {
    console.log('\n✅ Link creation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });