const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TENANT_ID = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';

async function checkAreas() {
  console.log('📍 Verificando áreas...');
  console.log('🏢 Tenant ID:', TENANT_ID);
  
  try {
    // Verificar si el tenant existe
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', TENANT_ID)
      .single();
    
    if (tenantError) {
      console.error('❌ Error obteniendo tenant:', tenantError.message);
      return;
    }
    
    if (!tenant) {
      console.error('❌ Tenant no encontrado');
      return;
    }
    
    console.log('✅ Tenant encontrado:', tenant.name);
    
    // Verificar áreas del tenant
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select('id, name, tenant_id, is_active')
      .eq('tenant_id', TENANT_ID);
    
    if (areasError) {
      console.error('❌ Error obteniendo áreas:', areasError.message);
      return;
    }
    
    console.log(`📊 Áreas encontradas: ${areas.length}`);
    
    areas.forEach((area, index) => {
      console.log(`${index + 1}. ${area.name} (${area.id})`);
      console.log(`   Activa: ${area.is_active}`);
      console.log(`   Tenant: ${area.tenant_id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAreas();