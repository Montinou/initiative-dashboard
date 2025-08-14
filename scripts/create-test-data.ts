import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestData() {
  console.log('Creating test objectives and initiatives...');
  
  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // SIGA tenant
  const userId = 'e2948f6c-adf0-45da-af41-a7dbad898c38'; // Test user profile ID
  
  try {
    // Create test objectives
    const objectives = [
      {
        id: uuidv4(),
        tenant_id: tenantId,
        title: 'Improve Customer Satisfaction',
        description: 'Enhance customer experience and satisfaction ratings',
        created_by: userId,
        status: 'in_progress',
        priority: 'high',
        progress: 65,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        tenant_id: tenantId,
        title: 'Increase Market Share',
        description: 'Expand our presence in key markets',
        created_by: userId,
        status: 'planning',
        priority: 'medium',
        progress: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    console.log('Creating objectives...');
    const { data: objectivesData, error: objError } = await supabase
      .from('objectives')
      .insert(objectives)
      .select();
    
    if (objError) {
      console.error('Error creating objectives:', objError);
      return;
    }
    
    console.log('Created objectives:', objectivesData);
    
    // Create test initiatives
    const initiatives = [
      {
        id: uuidv4(),
        tenant_id: tenantId,
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', // Corporativo area
        title: 'Customer Feedback System',
        description: 'Implement new feedback collection system',
        progress: 80,
        created_by: userId,
        status: 'in_progress',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        tenant_id: tenantId,
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', // Comercial area
        title: 'Sales Training Program',
        description: 'Train sales team on new techniques',
        progress: 50,
        created_by: userId,
        status: 'in_progress',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        tenant_id: tenantId,
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', // Producto area
        title: 'Product Innovation Lab',
        description: 'Setup innovation lab for new products',
        progress: 25,
        created_by: userId,
        status: 'planning',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    console.log('Creating initiatives...');
    const { data: initiativesData, error: initError } = await supabase
      .from('initiatives')
      .insert(initiatives)
      .select();
    
    if (initError) {
      console.error('Error creating initiatives:', initError);
      return;
    }
    
    console.log('Created initiatives:', initiativesData);
    
    // Link initiatives to objectives
    if (objectivesData && initiativesData) {
      const links = [
        {
          id: uuidv4(),
          objective_id: objectivesData[0].id,
          initiative_id: initiativesData[0].id
        },
        {
          id: uuidv4(),
          objective_id: objectivesData[0].id,
          initiative_id: initiativesData[1].id
        },
        {
          id: uuidv4(),
          objective_id: objectivesData[1].id,
          initiative_id: initiativesData[2].id
        }
      ];
      
      console.log('Linking objectives and initiatives...');
      const { error: linkError } = await supabase
        .from('objective_initiatives')
        .insert(links);
      
      if (linkError) {
        console.error('Error linking objectives and initiatives:', linkError);
        return;
      }
      
      console.log('Successfully linked objectives and initiatives');
    }
    
    console.log('✅ Test data created successfully!');
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

createTestData().catch(console.error);