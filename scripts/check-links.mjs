import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkLinks() {
  // Check objective-initiative links
  const { data: objInitLinks, error: oiError } = await supabase
    .from('objective_initiatives')
    .select('*')
    .limit(20);
    
  if (oiError) {
    console.error('Error fetching objective-initiative links:', oiError);
  } else {
    console.log('\n=== Objective-Initiative Links (' + (objInitLinks ? objInitLinks.length : 0) + ' found) ===');
    if (objInitLinks && objInitLinks.length > 0) {
      objInitLinks.forEach(link => {
        console.log('- Link ID: ' + link.id);
      });
    }
  }
  
  // Check objective-quarter links
  const { data: objQuarterLinks, error: oqError } = await supabase
    .from('objective_quarters')
    .select('*')
    .limit(20);
    
  if (oqError) {
    console.error('Error fetching objective-quarter links:', oqError);
  } else {
    console.log('\n=== Objective-Quarter Links (' + (objQuarterLinks ? objQuarterLinks.length : 0) + ' found) ===');
    if (objQuarterLinks && objQuarterLinks.length > 0) {
      objQuarterLinks.forEach(link => {
        console.log('- Link ID: ' + link.id);
      });
    }
  }
  
  // Check quarters
  const { data: quarters, error: qError } = await supabase
    .from('quarters')
    .select('*')
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    .order('start_date');
    
  if (qError) {
    console.error('Error fetching quarters:', qError);
  } else {
    console.log('\n=== Quarters (' + (quarters ? quarters.length : 0) + ' found) ===');
    if (quarters && quarters.length > 0) {
      quarters.forEach(q => {
        const year = new Date(q.start_date).getFullYear();
        console.log('- ' + q.quarter_name + ' ' + year + ': ' + q.start_date + ' to ' + q.end_date);
      });
    }
  }
  
  // Count objectives
  const { count: objCount } = await supabase
    .from('objectives')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    
  console.log('\n=== Total Objectives: ' + objCount + ' ===');
  
  // Count initiatives
  const { count: initCount } = await supabase
    .from('initiatives')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    
  console.log('=== Total Initiatives: ' + initCount + ' ===');
}

checkLinks().catch(console.error);
