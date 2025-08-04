const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUsers() {
  console.log('👥 Verificando usuarios existentes...');
  
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, role, tenant_id')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`\n📊 Total de usuarios: ${users.length}`);
  
  users.forEach((user, index) => {
    console.log(`\n${index + 1}. ${user.full_name || 'Sin nombre'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   User ID: ${user.user_id}`);
    console.log(`   Tenant ID: ${user.tenant_id}`);
  });
  
  // Mostrar estadísticas por rol
  const roleStats = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📈 Usuarios por rol:');
  Object.entries(roleStats).forEach(([role, count]) => {
    console.log(`   ${role}: ${count}`);
  });
  
  // Buscar si hay algún usuario que pueda subir archivos multi-área
  const adminUsers = users.filter(u => u.role === 'SuperAdmin' || u.role === 'Admin');
  
  if (adminUsers.length > 0) {
    console.log('\n👨‍💼 Usuarios con permisos de administrador:');
    adminUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });
  } else {
    console.log('\n⚠️  No hay usuarios con rol SuperAdmin o Admin');
    console.log('💡 Voy a cambiar el rol del primer usuario a SuperAdmin...');
    
    if (users.length > 0) {
      const firstUser = users[0];
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: 'SuperAdmin' })
        .eq('user_id', firstUser.user_id);
      
      if (updateError) {
        console.error('❌ Error actualizando rol:', updateError.message);
      } else {
        console.log(`✅ Usuario ${firstUser.email} ahora es SuperAdmin`);
      }
    }
  }
}

checkUsers();