import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function setupQuarters() {
  console.log('Setting up quarters...');
  
  // Check existing quarters
  const { data: existingQuarters, error: checkError } = await supabase
    .from('quarters')
    .select('*')
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    
  if (checkError) {
    console.error('Error checking quarters:', checkError);
    return;
  }
  
  console.log(`Found ${existingQuarters?.length || 0} existing quarters`);
  
  // Create quarters for 2024 and 2025
  const quartersToCreate = [
    { quarter_name: 'Q1', start_date: '2024-01-01', end_date: '2024-03-31' },
    { quarter_name: 'Q2', start_date: '2024-04-01', end_date: '2024-06-30' },
    { quarter_name: 'Q3', start_date: '2024-07-01', end_date: '2024-09-30' },
    { quarter_name: 'Q4', start_date: '2024-10-01', end_date: '2024-12-31' },
    { quarter_name: 'Q1', start_date: '2025-01-01', end_date: '2025-03-31' },
    { quarter_name: 'Q2', start_date: '2025-04-01', end_date: '2025-06-30' },
    { quarter_name: 'Q3', start_date: '2025-07-01', end_date: '2025-09-30' },
    { quarter_name: 'Q4', start_date: '2025-10-01', end_date: '2025-12-31' }
  ];
  
  for (const quarter of quartersToCreate) {
    // Check if this quarter already exists
    const exists = existingQuarters?.some(q => 
      q.quarter_name === quarter.quarter_name && 
      new Date(q.start_date).getFullYear() === new Date(quarter.start_date).getFullYear()
    );
    
    if (!exists) {
      const { data, error } = await supabase
        .from('quarters')
        .insert({
          tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          ...quarter
        })
        .select();
        
      if (error) {
        console.error(`Error creating quarter ${quarter.quarter_name}:`, error);
      } else {
        console.log(`Created quarter ${quarter.quarter_name} ${new Date(quarter.start_date).getFullYear()}`);
      }
    } else {
      console.log(`Quarter ${quarter.quarter_name} ${new Date(quarter.start_date).getFullYear()} already exists`);
    }
  }
}

async function linkObjectivesToInitiatives() {
  console.log('\nLinking objectives to initiatives...');
  
  // Get all objectives
  const { data: objectives, error: objError } = await supabase
    .from('objectives')
    .select('id, title, area_id')
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    
  if (objError) {
    console.error('Error fetching objectives:', objError);
    return;
  }
  
  // Get all initiatives
  const { data: initiatives, error: initError } = await supabase
    .from('initiatives')
    .select('id, title, area_id')
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    
  if (initError) {
    console.error('Error fetching initiatives:', initError);
    return;
  }
  
  console.log(`Found ${objectives?.length || 0} objectives and ${initiatives?.length || 0} initiatives`);
  
  let linkCount = 0;
  
  for (const objective of objectives || []) {
    // Find initiatives to link (same area or matching keywords)
    const matchingInitiatives = (initiatives || []).filter(init => {
      // Same area
      if (init.area_id === objective.area_id && objective.area_id) return true;
      
      // Matching keywords
      const objTitle = objective.title.toLowerCase();
      const initTitle = init.title.toLowerCase();
      
      const keywords = [
        'venta', 'turismo', 'paquete', 'marketing', 'redes', 'social',
        'cliente', 'app', 'móvil', 'tecnología', 'operacion', 'alianza',
        'campaña', 'premium', 'experiencia', 'comercial', 'producto'
      ];
      
      return keywords.some(keyword => 
        objTitle.includes(keyword) && initTitle.includes(keyword)
      );
    }).slice(0, 3); // Link up to 3 initiatives per objective
    
    for (const initiative of matchingInitiatives) {
      const { error } = await supabase
        .from('objective_initiatives')
        .insert({
          objective_id: objective.id,
          initiative_id: initiative.id
        });
        
      if (!error) {
        linkCount++;
        console.log(`Linked: "${objective.title.substring(0, 30)}..." with "${initiative.title.substring(0, 30)}..."`);
      }
    }
  }
  
  console.log(`Created ${linkCount} objective-initiative links`);
}

async function linkObjectivesToQuarters() {
  console.log('\nLinking objectives to quarters...');
  
  // Get quarters for 2025
  const { data: quarters, error: qError } = await supabase
    .from('quarters')
    .select('*')
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    .gte('start_date', '2025-01-01')
    .lte('end_date', '2025-12-31');
    
  if (qError) {
    console.error('Error fetching quarters:', qError);
    return;
  }
  
  const q1 = quarters?.find(q => q.quarter_name === 'Q1');
  const q2 = quarters?.find(q => q.quarter_name === 'Q2');
  const q3 = quarters?.find(q => q.quarter_name === 'Q3');
  const q4 = quarters?.find(q => q.quarter_name === 'Q4');
  
  // Get all objectives
  const { data: objectives, error: objError } = await supabase
    .from('objectives')
    .select('id, title')
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    
  if (objError) {
    console.error('Error fetching objectives:', objError);
    return;
  }
  
  let linkCount = 0;
  
  for (const objective of objectives || []) {
    let quarterId = null;
    const title = objective.title.toLowerCase();
    
    // Assign quarter based on keywords
    if (title.includes('q1') || title.includes('venta') || title.includes('comercial')) {
      quarterId = q1?.id;
    } else if (title.includes('paquete') || title.includes('app') || title.includes('producto')) {
      quarterId = q2?.id;
    } else if (title.includes('redes') || title.includes('nps') || title.includes('campaña')) {
      quarterId = q3?.id;
    } else if (title.includes('alianza') || title.includes('premium') || title.includes('cadena')) {
      quarterId = q4?.id;
    } else {
      quarterId = q1?.id; // Default to Q1
    }
    
    if (quarterId) {
      const { error } = await supabase
        .from('objective_quarters')
        .insert({
          objective_id: objective.id,
          quarter_id: quarterId
        });
        
      if (!error) {
        linkCount++;
        const quarter = quarters?.find(q => q.id === quarterId);
        console.log(`Assigned "${objective.title.substring(0, 30)}..." to ${quarter?.quarter_name} 2025`);
      }
    }
  }
  
  console.log(`Created ${linkCount} objective-quarter links`);
}

async function main() {
  console.log('Starting production data setup...');
  console.log('Supabase URL:', supabaseUrl);
  
  await setupQuarters();
  await linkObjectivesToInitiatives();
  await linkObjectivesToQuarters();
  
  console.log('\n✅ Production data setup complete!');
}

main().catch(console.error);