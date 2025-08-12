#!/usr/bin/env node

/**
 * Script para agregar training examples programáticamente a Dialogflow CX
 * Usa la API de Dialogflow CX para crear múltiples ejemplos de entrenamiento
 */

const { SessionsClient, IntentsClient, FlowsClient, PagesClient, AgentsClient } = require('@google-cloud/dialogflow-cx');
const path = require('path');

// Configuración
const CONFIG = {
  projectId: 'insaight-backend',
  location: 'us-central1',
  agentId: '7f297240-ca50-4896-8b71-e82fd707fa88',
  languageCode: 'es'
};

// Cliente de Dialogflow CX
const intentsClient = new IntentsClient({
  apiEndpoint: `${CONFIG.location}-dialogflow.googleapis.com`,
});

const agentsClient = new AgentsClient({
  apiEndpoint: `${CONFIG.location}-dialogflow.googleapis.com`,
});

// Training examples para iniciativas
const INITIATIVE_TRAINING_EXAMPLES = [
  // Consultas generales
  {
    intentDisplayName: 'query.initiatives',
    trainingPhrases: [
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
      'consultar iniciativas'
    ]
  },
  // Consultas por área
  {
    intentDisplayName: 'query.initiatives.by_area',
    trainingPhrases: [
      'iniciativas del área de ventas',
      'mostrar iniciativas de marketing',
      'ver iniciativas del departamento de operaciones',
      'iniciativas de mi área',
      'qué iniciativas tiene el área de tecnología',
      'listar iniciativas del área comercial',
      'iniciativas del área de recursos humanos',
      'mostrar las iniciativas de producto',
      'ver iniciativas del área financiera',
      'iniciativas del departamento de calidad'
    ]
  },
  // Consultas por estado
  {
    intentDisplayName: 'query.initiatives.by_status',
    trainingPhrases: [
      'iniciativas completadas',
      'mostrar iniciativas en progreso',
      'ver iniciativas activas',
      'iniciativas pendientes',
      'qué iniciativas están atrasadas',
      'iniciativas vencidas',
      'mostrar iniciativas completadas este mes',
      'ver iniciativas en planificación',
      'iniciativas con retraso',
      'iniciativas al día'
    ]
  },
  // Consultas por progreso
  {
    intentDisplayName: 'query.initiatives.by_progress',
    trainingPhrases: [
      'iniciativas con más del 50% de avance',
      'mostrar iniciativas con poco progreso',
      'ver iniciativas casi completadas',
      'iniciativas con más de 80% completado',
      'qué iniciativas tienen menos del 30% de avance',
      'iniciativas con buen progreso',
      'mostrar iniciativas estancadas',
      'ver iniciativas con progreso bajo',
      'iniciativas cerca de completarse',
      'iniciativas con avance significativo'
    ]
  },
  // Análisis y métricas
  {
    intentDisplayName: 'analyze.initiatives',
    trainingPhrases: [
      'analizar capacidad de las iniciativas',
      'análisis de iniciativas',
      'métricas de iniciativas',
      'estadísticas de iniciativas',
      'resumen de iniciativas',
      'reporte de iniciativas',
      'dashboard de iniciativas',
      'indicadores de iniciativas',
      'performance de iniciativas',
      'rendimiento de las iniciativas'
    ]
  }
];

// Training examples para objetivos
const OBJECTIVE_TRAINING_EXAMPLES = [
  {
    intentDisplayName: 'query.objectives',
    trainingPhrases: [
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
      'consultar objetivos'
    ]
  },
  {
    intentDisplayName: 'create.objective',
    trainingPhrases: [
      'crear un nuevo objetivo',
      'agregar objetivo',
      'nuevo objetivo',
      'añadir un objetivo',
      'registrar objetivo',
      'establecer un objetivo',
      'definir objetivo',
      'crear objetivo estratégico',
      'agregar objetivo para el área',
      'nuevo objetivo para este trimestre'
    ]
  }
];

// Training examples para actividades
const ACTIVITY_TRAINING_EXAMPLES = [
  {
    intentDisplayName: 'query.activities',
    trainingPhrases: [
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
      'tareas pendientes'
    ]
  },
  {
    intentDisplayName: 'create.activity',
    trainingPhrases: [
      'crear una nueva actividad',
      'agregar actividad',
      'nueva actividad',
      'añadir una actividad',
      'registrar actividad',
      'crear tarea',
      'agregar tarea',
      'nueva tarea para la iniciativa',
      'añadir actividad a iniciativa',
      'crear actividad para el proyecto'
    ]
  },
  {
    intentDisplayName: 'assign.activity',
    trainingPhrases: [
      'asignar actividad a juan',
      'asigna esta tarea a maría',
      'delegar actividad a pedro',
      'asignar tarea al equipo de ventas',
      'reasignar actividad',
      'cambiar responsable de la actividad',
      'asignar a otro usuario',
      'transferir actividad',
      'designar responsable',
      'asignar esta actividad'
    ]
  }
];

// Training examples para reportes y análisis
const ANALYTICS_TRAINING_EXAMPLES = [
  {
    intentDisplayName: 'generate.report',
    trainingPhrases: [
      'generar reporte',
      'crear informe',
      'exportar datos',
      'descargar reporte',
      'generar dashboard',
      'reporte ejecutivo',
      'informe de progreso',
      'reporte mensual',
      'análisis trimestral',
      'resumen semanal'
    ]
  },
  {
    intentDisplayName: 'query.kpis',
    trainingPhrases: [
      'mostrar KPIs',
      'ver indicadores',
      'métricas clave',
      'indicadores de gestión',
      'KPIs del mes',
      'performance del equipo',
      'resultados del área',
      'métricas de desempeño',
      'tablero de control',
      'indicadores estratégicos'
    ]
  }
];

/**
 * Función para crear o actualizar un intent con training phrases
 */
async function createOrUpdateIntent(agentPath, intentData) {
  try {
    // Primero, intentar listar los intents existentes
    const [intents] = await intentsClient.listIntents({
      parent: agentPath,
      languageCode: CONFIG.languageCode
    });

    // Buscar si el intent ya existe
    let existingIntent = intents.find(intent => 
      intent.displayName === intentData.intentDisplayName
    );

    // Crear training phrases
    const trainingPhrases = intentData.trainingPhrases.map(phrase => ({
      parts: [{ text: phrase }],
      repeatCount: 1
    }));

    if (existingIntent) {
      // Actualizar intent existente
      console.log(`Actualizando intent: ${intentData.intentDisplayName}`);
      
      existingIntent.trainingPhrases = [
        ...(existingIntent.trainingPhrases || []),
        ...trainingPhrases
      ];

      await intentsClient.updateIntent({
        intent: existingIntent,
        languageCode: CONFIG.languageCode
      });

      console.log(`✅ Intent actualizado: ${intentData.intentDisplayName}`);
    } else {
      // Crear nuevo intent
      console.log(`Creando nuevo intent: ${intentData.intentDisplayName}`);
      
      const intent = {
        displayName: intentData.intentDisplayName,
        trainingPhrases: trainingPhrases,
        priority: 500000, // Prioridad normal
      };

      await intentsClient.createIntent({
        parent: agentPath,
        intent: intent,
        languageCode: CONFIG.languageCode
      });

      console.log(`✅ Intent creado: ${intentData.intentDisplayName}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error con intent ${intentData.intentDisplayName}:`, error.message);
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando actualización de training examples en Dialogflow CX...\n');
  
  const agentPath = agentsClient.agentPath(
    CONFIG.projectId,
    CONFIG.location,
    CONFIG.agentId
  );

  console.log(`📍 Agent: ${agentPath}\n`);

  // Combinar todos los training examples
  const allExamples = [
    ...INITIATIVE_TRAINING_EXAMPLES,
    ...OBJECTIVE_TRAINING_EXAMPLES,
    ...ACTIVITY_TRAINING_EXAMPLES,
    ...ANALYTICS_TRAINING_EXAMPLES
  ];

  let successCount = 0;
  let errorCount = 0;

  // Procesar cada grupo de training examples
  for (const exampleGroup of allExamples) {
    const result = await createOrUpdateIntent(agentPath, exampleGroup);
    if (result) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Pequeña pausa para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Resumen:');
  console.log(`✅ Intents procesados exitosamente: ${successCount}`);
  console.log(`❌ Intents con errores: ${errorCount}`);
  console.log(`📝 Total de training phrases agregadas: ${
    allExamples.reduce((acc, group) => acc + group.trainingPhrases.length, 0)
  }`);

  console.log('\n✨ Proceso completado!');
  console.log('💡 Recuerda hacer clic en "Train" en la consola de Dialogflow CX para aplicar los cambios.');
}

// Manejo de errores
process.on('unhandledRejection', (err) => {
  console.error('Error no manejado:', err);
  process.exit(1);
});

// Ejecutar
main().catch(console.error);