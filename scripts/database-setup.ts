import { supabase } from '../lib/supabase';

export interface FemaUser {
  id?: string;
  email: string;
  name: string;
  role: 'CEO' | 'Admin' | 'Analyst' | 'Manager';
  area_name?: string;
}

export interface FemaInitiative {
  title: string;
  description: string;
  progress: number;
  status: 'En Curso' | 'Completado' | 'Atrasado' | 'En Pausa';
  area_name: string;
  manager_email: string;
}

export interface FemaObjective {
  area_name: string;
  objective: string;
  progress: number;
  obstacles: string;
  enablers: string;
  status: '🟢' | '🟡' | '🔴';
}

// FEMA organizational structure and users
const FEMA_AREAS = [
  { name: 'División Electricidad', description: 'Productos y servicios de electricidad' },
  { name: 'División Iluminación', description: 'Sistemas de iluminación y luminarias' },
  { name: 'División Industria', description: 'Soluciones industriales especializadas' },
  { name: 'E-commerce', description: 'Tienda online femastore.com.ar' },
  { name: 'Logística y Depósito', description: 'Gestión de inventario y distribución' },
  { name: 'Administración', description: 'Gestión administrativa y recursos humanos' },
  { name: 'RRHH', description: 'Recursos humanos y gestión de talento' },
  { name: 'Comercial', description: 'Ventas y relación con clientes' },
  { name: 'Producto', description: 'Desarrollo y mejora de productos' }
];

const FEMA_USERS: FemaUser[] = [
  // CEO - Alta dirección
  { email: 'lucas.ferrero@fema.com.ar', name: 'Lucas Ferrero', role: 'CEO' },
  { email: 'director.general@fema.com.ar', name: 'Director General', role: 'CEO' },
  
  // Admin - Gestión operativa
  { email: 'admin@fema.com.ar', name: 'Administrador Sistema', role: 'Admin' },
  { email: 'jefe.admin@fema.com.ar', name: 'Jefe de Administración', role: 'Admin' },
  { email: 'rrhh.coordinador@fema.com.ar', name: 'Coordinador RRHH', role: 'Admin' },
  
  // Analysts - Control de gestión
  { email: 'analista.gestion@fema.com.ar', name: 'Analista de Gestión', role: 'Analyst' },
  { email: 'control.gestion@fema.com.ar', name: 'Control de Gestión', role: 'Analyst' },
  { email: 'asistente.direccion@fema.com.ar', name: 'Asistente de Dirección', role: 'Analyst' },
  
  // Managers - Jefes de división
  { email: 'jefe.electricidad@fema.com.ar', name: 'Jefe División Electricidad', role: 'Manager', area_name: 'División Electricidad' },
  { email: 'jefe.iluminacion@fema.com.ar', name: 'Jefe División Iluminación', role: 'Manager', area_name: 'División Iluminación' },
  { email: 'jefe.industria@fema.com.ar', name: 'Jefe División Industria', role: 'Manager', area_name: 'División Industria' },
  { email: 'gerente.ecommerce@fema.com.ar', name: 'Gerente E-commerce', role: 'Manager', area_name: 'E-commerce' },
  { email: 'jefe.logistica@fema.com.ar', name: 'Jefe Logística', role: 'Manager', area_name: 'Logística y Depósito' },
  { email: 'gerente.admin@fema.com.ar', name: 'Gerente Administración', role: 'Manager', area_name: 'Administración' },
  { email: 'jefe.rrhh@fema.com.ar', name: 'Jefe RRHH', role: 'Manager', area_name: 'RRHH' },
  { email: 'gerente.comercial@fema.com.ar', name: 'Gerente Comercial', role: 'Manager', area_name: 'Comercial' },
  { email: 'jefe.producto@fema.com.ar', name: 'Jefe de Producto', role: 'Manager', area_name: 'Producto' }
];

const FEMA_INITIATIVES: FemaInitiative[] = [
  // División Electricidad
  { title: 'Lanzamiento nueva línea domótica', description: 'Productos inteligentes para el hogar', progress: 75, status: 'En Curso', area_name: 'División Electricidad', manager_email: 'jefe.electricidad@fema.com.ar' },
  { title: 'Certificación productos LED', description: 'Certificaciones de calidad para productos LED', progress: 90, status: 'En Curso', area_name: 'División Electricidad', manager_email: 'jefe.electricidad@fema.com.ar' },
  
  // División Iluminación  
  { title: 'Sistema iluminación inteligente', description: 'Desarrollo de sistema IoT para iluminación', progress: 60, status: 'En Curso', area_name: 'División Iluminación', manager_email: 'jefe.iluminacion@fema.com.ar' },
  { title: 'Optimización catálogo luminarias', description: 'Reorganización y actualización del catálogo', progress: 100, status: 'Completado', area_name: 'División Iluminación', manager_email: 'jefe.iluminacion@fema.com.ar' },
  
  // División Industria
  { title: 'Soluciones para minería', description: 'Desarrollo de productos para sector minero', progress: 25, status: 'Atrasado', area_name: 'División Industria', manager_email: 'jefe.industria@fema.com.ar' },
  { title: 'Automatización procesos industriales', description: 'Sistemas de control y automatización', progress: 40, status: 'En Curso', area_name: 'División Industria', manager_email: 'jefe.industria@fema.com.ar' },
  
  // E-commerce
  { title: 'Rediseño femastore.com.ar', description: 'Nueva plataforma de e-commerce', progress: 85, status: 'En Curso', area_name: 'E-commerce', manager_email: 'gerente.ecommerce@fema.com.ar' },
  
  // Logística
  { title: 'Optimización stock en depósito', description: 'Sistema de gestión de inventarios', progress: 50, status: 'En Curso', area_name: 'Logística y Depósito', manager_email: 'jefe.logistica@fema.com.ar' },
  
  // Administración
  { title: 'Digitalización procesos administrativos', description: 'Migración a procesos digitales', progress: 45, status: 'En Curso', area_name: 'Administración', manager_email: 'gerente.admin@fema.com.ar' },
  { title: 'Control de gastos automatizado', description: 'Sistema automático de control de gastos', progress: 30, status: 'Atrasado', area_name: 'Administración', manager_email: 'gerente.admin@fema.com.ar' },
  
  // Comercial
  { title: 'Implementación CRM', description: 'Sistema de gestión de relaciones con clientes', progress: 50, status: 'En Curso', area_name: 'Comercial', manager_email: 'gerente.comercial@fema.com.ar' },
  { title: 'Campaña marketing digital Q3', description: 'Estrategia digital para tercer trimestre', progress: 60, status: 'En Curso', area_name: 'Comercial', manager_email: 'gerente.comercial@fema.com.ar' }
];

export class DatabaseSetup {
  private tenantId: string = 'fema-electricidad';

  async cleanDatabase() {
    console.log('🧹 Cleaning existing data...');
    
    // Delete in reverse dependency order
    await supabase.from('activities').delete().neq('id', '');
    await supabase.from('initiatives').delete().neq('id', '');
    await supabase.from('users').delete().neq('id', '');
    await supabase.from('areas').delete().neq('id', '');
    await supabase.from('tenants').delete().neq('id', '');
    
    console.log('✅ Database cleaned successfully');
  }

  async setupTenant() {
    console.log('🏢 Setting up FEMA tenant...');
    
    const { data, error } = await supabase
      .from('tenants')
      .insert({ id: this.tenantId, name: 'Fema Electricidad' })
      .select()
      .single();
    
    if (error && !error.message.includes('duplicate key')) {
      throw new Error(`Failed to create tenant: ${error.message}`);
    }
    
    console.log('✅ FEMA tenant created successfully');
    return data;
  }

  async setupAreas() {
    console.log('🏗️ Setting up organizational areas...');
    
    const areasData = FEMA_AREAS.map(area => ({
      tenant_id: this.tenantId,
      name: area.name,
      description: area.description
    }));
    
    const { data, error } = await supabase
      .from('areas')
      .insert(areasData)
      .select();
    
    if (error) {
      throw new Error(`Failed to create areas: ${error.message}`);
    }
    
    console.log(`✅ Created ${data.length} organizational areas`);
    return data;
  }

  async setupUsers(areas: any[]) {
    console.log('👥 Setting up FEMA users...');
    
    const usersData = FEMA_USERS.map(user => {
      const area = user.area_name ? areas.find(a => a.name === user.area_name) : null;
      return {
        tenant_id: this.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
        area_id: area?.id || null
      };
    });
    
    const { data, error } = await supabase
      .from('users')
      .insert(usersData)
      .select();
    
    if (error) {
      throw new Error(`Failed to create users: ${error.message}`);
    }
    
    console.log(`✅ Created ${data.length} FEMA users`);
    return data;
  }

  async setupInitiatives(areas: any[], users: any[]) {
    console.log('🎯 Setting up initiatives...');
    
    const initiativesData = FEMA_INITIATIVES.map(initiative => {
      const area = areas.find(a => a.name === initiative.area_name);
      const manager = users.find(u => u.email === initiative.manager_email);
      
      if (!area || !manager) {
        console.warn(`⚠️ Skipping initiative "${initiative.title}" - missing area or manager`);
        return null;
      }
      
      return {
        tenant_id: this.tenantId,
        title: initiative.title,
        description: initiative.description,
        progress: initiative.progress,
        status: initiative.status,
        area_id: area.id,
        manager_id: manager.id
      };
    }).filter(Boolean);
    
    const { data, error } = await supabase
      .from('initiatives')
      .insert(initiativesData)
      .select();
    
    if (error) {
      throw new Error(`Failed to create initiatives: ${error.message}`);
    }
    
    console.log(`✅ Created ${data.length} initiatives`);
    return data;
  }

  async setupComplete() {
    try {
      console.log('🚀 Starting FEMA database setup...\n');
      
      // Clean existing data
      await this.cleanDatabase();
      
      // Setup tenant
      await this.setupTenant();
      
      // Setup areas
      const areas = await this.setupAreas();
      
      // Setup users
      const users = await this.setupUsers(areas);
      
      // Setup initiatives
      const initiatives = await this.setupInitiatives(areas, users);
      
      console.log('\n🎉 FEMA database setup completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`  • 1 tenant (Fema Electricidad)`);
      console.log(`  • ${areas.length} organizational areas`);
      console.log(`  • ${users.length} users across all roles`);
      console.log(`  • ${initiatives.length} active initiatives`);
      
      return {
        tenant_id: this.tenantId,
        areas,
        users,
        initiatives
      };
      
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  async getUsersByRole() {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        areas (
          name,
          description
        )
      `)
      .eq('tenant_id', this.tenantId);
    
    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    
    const usersByRole = {
      CEO: users.filter(u => u.role === 'CEO'),
      Admin: users.filter(u => u.role === 'Admin'),
      Analyst: users.filter(u => u.role === 'Analyst'),
      Manager: users.filter(u => u.role === 'Manager')
    };
    
    console.log('\n👥 FEMA Users by Role:');
    Object.entries(usersByRole).forEach(([role, roleUsers]) => {
      console.log(`\n${role} (${roleUsers.length}):`);
      roleUsers.forEach(user => {
        const areaInfo = user.area_id ? ` - ${(user as any).areas?.name}` : '';
        console.log(`  • ${user.name} (${user.email})${areaInfo}`);
      });
    });
    
    return usersByRole;
  }
}

// Export for use in scripts
export const databaseSetup = new DatabaseSetup();