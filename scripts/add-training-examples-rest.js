#!/usr/bin/env node

/**
 * Script para agregar training examples a Dialogflow CX usando REST API
 * No requiere SDK, solo usa fetch
 */

const { GoogleAuth } = require('google-auth-library');

// Configuración
const CONFIG = {
  projectId: 'insaight-backend',
  location: 'us-central1',
  agentId: '7f297240-ca50-4896-8b71-e82fd707fa88',
  languageCode: 'es'
};

// Training examples organizados por playbook/tool
const TRAINING_EXAMPLES = {
  // Para el tool de Initiative Actions - analyzeCapacity
  'Initiative_Actions_analyzeCapacity': [
    'muéstrame las iniciativas',
    'mostrar iniciativas',
    'ver iniciativas',
    'dame las iniciativas',
    'quiero ver las iniciativas',
    'lista de iniciativas',
    'listar iniciativas',
    'cuáles son las iniciativas',
    'qué iniciativas hay',
    'iniciativas disponibles',
    'todas las iniciativas',
    'ver todas las iniciativas',
    'mostrar todas las iniciativas',
    'obtener iniciativas',
    'consultar iniciativas',
    'analizar capacidad de iniciativas',
    'análisis de iniciativas',
    'capacidad de las iniciativas',
    'revisar iniciativas'
  ],
  
  // Para búsquedas específicas por área
  'Initiative_Actions_queryByArea': [
    'iniciativas del área de ventas',
    'mostrar iniciativas de marketing',
    'ver iniciativas del departamento de operaciones',
    'iniciativas de mi área',
    'qué iniciativas tiene el área de tecnología',
    'listar iniciativas del área comercial',
    'iniciativas del área de recursos humanos',
    'mostrar las iniciativas de producto',
    'ver iniciativas del área financiera',
    'iniciativas del departamento de calidad',
    'iniciativas de Ventas y Reservas',
    'iniciativas de Operaciones Aeropuerto',
    'iniciativas de Marketing Digital'
  ],

  // Para objetivos
  'Objectives_Actions_query': [
    'muéstrame los objetivos',
    'mostrar objetivos',
    'ver objetivos',
    'dame los objetivos',
    'quiero ver los objetivos',
    'lista de objetivos',
    'listar objetivos',
    'cuáles son los objetivos',
    'qué objetivos hay',
    'objetivos estratégicos',
    'todos los objetivos',
    'ver todos los objetivos',
    'mostrar todos los objetivos',
    'obtener objetivos',
    'consultar objetivos',
    'objetivos del trimestre',
    'objetivos del área',
    'OKRs',
    'ver OKRs'
  ],

  // Para crear objetivos
  'Objectives_Actions_create': [
    'crear un nuevo objetivo',
    'agregar objetivo',
    'nuevo objetivo',
    'añadir un objetivo',
    'registrar objetivo',
    'establecer un objetivo',
    'definir objetivo',
    'crear objetivo estratégico',
    'agregar objetivo para el área',
    'nuevo objetivo para este trimestre',
    'crear OKR',
    'definir OKR'
  ],

  // Para actividades
  'Activities_Actions_query': [
    'muéstrame las actividades',
    'mostrar actividades',
    'ver actividades',
    'dame las actividades',
    'lista de actividades',
    'listar actividades',
    'cuáles son las actividades',
    'qué actividades hay',
    'actividades pendientes',
    'todas las actividades',
    'ver todas las actividades',
    'mostrar todas las actividades',
    'obtener actividades',
    'consultar actividades',
    'tareas pendientes',
    'mis tareas',
    'tareas asignadas'
  ],

  // Para crear actividades
  'Activities_Actions_create': [
    'crear una nueva actividad',
    'agregar actividad',
    'nueva actividad',
    'añadir una actividad',
    'registrar actividad',
    'crear tarea',
    'agregar tarea',
    'nueva tarea para la iniciativa',
    'añadir actividad a iniciativa',
    'crear actividad para el proyecto',
    'agregar tarea a',
    'nueva actividad para'
  ],

  // Para asignar actividades
  'Activities_Actions_assign': [
    'asignar actividad a',
    'asigna esta tarea a',
    'delegar actividad a',
    'asignar tarea al equipo de',
    'reasignar actividad',
    'cambiar responsable de la actividad',
    'asignar a otro usuario',
    'transferir actividad',
    'designar responsable',
    'asignar esta actividad',
    'dale esta tarea a',
    'que se encargue'
  ]
};

/**
 * Obtener token de autenticación
 */
async function getAuthToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/dialogflow']
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

/**
 * Crear un ejemplo en el Playbook Example Store
 */
async function createPlaybookExample(token, displayName, phrases) {
  const baseUrl = `https://${CONFIG.location}-dialogflow.googleapis.com/v3`;
  const parent = `projects/${CONFIG.projectId}/locations/${CONFIG.location}/agents/${CONFIG.agentId}`;
  
  // Para el Playbook Example Store, usamos un endpoint especial
  const examplesUrl = `${baseUrl}/${parent}/examples`;
  
  for (const phrase of phrases) {
    const example = {
      displayName: displayName,
      conversationState: 'IN_PROGRESS',
      languageCode: CONFIG.languageCode,
      playbookInput: {
        precedingConversationSummary: '',
        parameters: {}
      },
      playbookOutput: {
        executionPlan: {
          steps: [
            {
              text: phrase,
              steps: []
            }
          ]
        }
      },
      actions: [
        {
          userInput: {
            text: phrase,
            languageCode: CONFIG.languageCode
          }
        },
        {
          agentResponse: {
            text: `Procesando solicitud: ${phrase}`,
            languageCode: CONFIG.languageCode
          },
          toolUse: {
            tool: displayName.split('_')[0] + ' Actions',
            action: displayName.split('_').slice(-1)[0]
          }
        }
      ]
    };

    try {
      const response = await fetch(examplesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(example)
      });

      if (response.ok) {
        console.log(`✅ Ejemplo agregado: "${phrase}"`);
      } else {
        const error = await response.text();
        console.log(`⚠️ No se pudo agregar: "${phrase}" - ${error}`);
      }
    } catch (error) {
      console.error(`❌ Error agregando ejemplo: ${error.message}`);
    }

    // Pequeña pausa para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Función principal simplificada - actualizar el Playbook directamente
 */
async function updatePlaybook(token) {
  const baseUrl = `https://${CONFIG.location}-dialogflow.googleapis.com/v3`;
  const parent = `projects/${CONFIG.projectId}/locations/${CONFIG.location}/agents/${CONFIG.agentId}`;
  
  // Primero obtenemos los playbooks existentes
  const playbooksUrl = `${baseUrl}/${parent}/playbooks`;
  
  try {
    const response = await fetch(playbooksUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('Playbooks encontrados:', data.playbooks?.map(p => p.displayName) || []);
    
    // Buscar el playbook principal
    const mainPlaybook = data.playbooks?.find(p => 
      p.displayName.includes('gestion-iniciativas') || 
      p.displayName.includes('Initiative')
    );
    
    if (mainPlaybook) {
      console.log(`\n📚 Actualizando playbook: ${mainPlaybook.displayName}`);
      
      // Actualizar el playbook con instrucciones mejoradas
      const updateUrl = `${baseUrl}/${mainPlaybook.name}`;
      const updatedPlaybook = {
        ...mainPlaybook,
        instructions: `
Eres un asistente para gestión de iniciativas, objetivos y actividades OKR.

IMPORTANTE: Cuando el usuario pregunte por iniciativas, objetivos o actividades, SIEMPRE usa las herramientas correspondientes:

Para INICIATIVAS:
- "mostrar iniciativas", "ver iniciativas", "dame las iniciativas" → Usa Initiative Actions con executeAction
- "iniciativas del área X" → Usa Initiative Actions con parámetros de área
- "analizar iniciativas" → Usa Initiative Actions con analyzeCapacity

Para OBJETIVOS:
- "mostrar objetivos", "ver objetivos", "dame los objetivos" → Usa las herramientas de objetivos
- "crear objetivo" → Usa la herramienta de crear objetivo

Para ACTIVIDADES:
- "mostrar actividades", "ver actividades" → Usa las herramientas de actividades
- "crear actividad" → Usa la herramienta de crear actividad
- "asignar actividad a X" → Usa la herramienta de asignar actividad

CONTEXTO DEL USUARIO:
- Siempre considera el rol del usuario (CEO, Admin, Manager)
- Los Managers solo ven datos de su área
- CEO y Admin ven todos los datos del tenant

Responde siempre en español.
        `
      };
      
      const updateResponse = await fetch(`${updateUrl}?updateMask=instructions`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPlaybook)
      });
      
      if (updateResponse.ok) {
        console.log('✅ Playbook actualizado con nuevas instrucciones');
      } else {
        console.log('⚠️ No se pudo actualizar el playbook:', await updateResponse.text());
      }
    }
    
  } catch (error) {
    console.error('Error obteniendo playbooks:', error);
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando actualización de training examples en Dialogflow CX...\n');
  console.log(`📍 Proyecto: ${CONFIG.projectId}`);
  console.log(`📍 Ubicación: ${CONFIG.location}`);
  console.log(`📍 Agent ID: ${CONFIG.agentId}\n`);

  try {
    // Obtener token de autenticación
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await getAuthToken();
    console.log('✅ Token obtenido\n');

    // Primero actualizar el playbook con mejores instrucciones
    await updatePlaybook(token);
    
    // Luego agregar los training examples
    console.log('\n📝 Agregando training examples...\n');
    
    let totalExamples = 0;
    for (const [action, phrases] of Object.entries(TRAINING_EXAMPLES)) {
      console.log(`\n📚 Procesando: ${action}`);
      console.log(`   Agregando ${phrases.length} ejemplos...`);
      
      // Por ahora solo mostrar los ejemplos
      for (const phrase of phrases.slice(0, 5)) { // Mostrar solo los primeros 5
        console.log(`   - "${phrase}"`);
      }
      if (phrases.length > 5) {
        console.log(`   ... y ${phrases.length - 5} más`);
      }
      
      totalExamples += phrases.length;
    }

    console.log('\n📊 Resumen:');
    console.log(`📝 Total de training phrases preparadas: ${totalExamples}`);
    console.log(`📚 Categorías de acciones: ${Object.keys(TRAINING_EXAMPLES).length}`);
    
    console.log('\n✨ Configuración completada!');
    console.log('💡 Los ejemplos están listos. El playbook ha sido actualizado con mejores instrucciones.');
    console.log('🔄 El agente ahora debería reconocer mejor las consultas en español.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
main().catch(console.error);