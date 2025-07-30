#!/usr/bin/env node

/**
 * Script to clean SIGA areas and add only the specified ones
 * Areas: Administración, Producto, Capital Humano, Comercial
 * 
 * This script:
 * 1. Connects to Supabase
 * 2. Deletes all existing areas for SIGA tenant
 * 3. Adds the new areas with proper formatting for Excel matching
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// SIGA tenant ID from theme-config.ts
const SIGA_TENANT_ID = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';

// Areas to add - using names that match Excel tabs format
// Names are formatted for reliable Excel matching (consistent casing and formatting)
const SIGA_AREAS = [
  {
    name: 'Administración',
    description: 'Gestión administrativa y procesos corporativos'
  },
  {
    name: 'Producto', 
    description: 'Desarrollo y gestión de productos turísticos'
  },
  {
    name: 'Capital Humano',
    description: 'Gestión de recursos humanos y desarrollo organizacional'
  },
  {
    name: 'Comercial',
    description: 'Ventas, marketing y relaciones comerciales'
  }
];

async function main() {
  try {
    console.log('🚀 Starting SIGA areas cleanup and setup...');
    
    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Connected to Supabase');
    
    // Step 1: Delete all existing areas for SIGA tenant
    console.log(`🧹 Cleaning existing areas for SIGA tenant: ${SIGA_TENANT_ID}`);
    
    const { error: deleteError, count: deletedCount } = await supabase
      .from('areas')
      .delete()
      .eq('tenant_id', SIGA_TENANT_ID);
    
    if (deleteError) {
      throw new Error(`Error deleting existing areas: ${deleteError.message}`);
    }
    
    console.log(`✅ Deleted ${deletedCount || 'all'} existing areas for SIGA`);
    
    // Step 2: Add new areas
    console.log('📝 Adding new areas for SIGA...');
    
    const areasToInsert = SIGA_AREAS.map(area => ({
      ...area,
      tenant_id: SIGA_TENANT_ID,
      is_active: true
    }));
    
    const { data: insertedAreas, error: insertError } = await supabase
      .from('areas')
      .insert(areasToInsert)
      .select();
    
    if (insertError) {
      throw new Error(`Error inserting new areas: ${insertError.message}`);
    }
    
    console.log('✅ Successfully added new areas:');
    insertedAreas.forEach((area, index) => {
      console.log(`   ${index + 1}. ${area.name}`);
    });
    
    // Step 3: Verify the areas were created correctly
    console.log('🔍 Verifying areas were created correctly...');
    
    const { data: verifyAreas, error: verifyError } = await supabase
      .from('areas')
      .select('*')
      .eq('tenant_id', SIGA_TENANT_ID)
      .order('name');
    
    if (verifyError) {
      throw new Error(`Error verifying areas: ${verifyError.message}`);
    }
    
    console.log(`✅ Verification complete: ${verifyAreas.length} areas found`);
    console.log('\n📊 Final SIGA Areas:');
    console.log('===================');
    verifyAreas.forEach((area, index) => {
      console.log(`${index + 1}. Name: ${area.name}`);
      console.log(`   Description: ${area.description}`);
      console.log(`   Active: ${area.is_active}`);
      console.log(`   ID: ${area.id}`);
      console.log('');
    });
    
    console.log('🎉 SIGA areas cleanup and setup completed successfully!');
    console.log('\n💡 Excel Upload Tips:');
    console.log('- Use these exact area names as Excel sheet tabs:');
    console.log('  • Administración');
    console.log('  • Producto'); 
    console.log('  • Capital Humano');
    console.log('  • Comercial');
    console.log('- Names should match exactly for reliable data attachment');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Function to normalize text for Excel matching (uppercase, no accents)
function normalizeForExcel(text) {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, SIGA_AREAS, SIGA_TENANT_ID };