#!/usr/bin/env node

/**
 * Script para configurar Dialogflow CX usando la API REST
 * Requiere autenticación con gcloud: gcloud auth application-default login
 */

const https = require('https');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuración
const PROJECT_ID = 'insaight-backend';
const AGENT_ID = '7f297240-ca50-4896-8b71-e82fd707fa88';
const LOCATION = 'us-central1';
const WEBHOOK_URL = 'https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook';

// Obtener access token
async function getAccessToken() {
  try {
    const { stdout } = await execPromise('gcloud auth print-access-token');
    return stdout.trim();
  } catch (error) {
    console.error('Error obteniendo token. Asegúrate de estar autenticado con: gcloud auth login');
    process.exit(1);
  }
}

// Hacer request a la API
async function makeApiRequest(method, path, body = null) {
  const token = await getAccessToken();
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${LOCATION}-dialogflow.googleapis.com`,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          console.error(`Error ${res.statusCode}: ${data}`);
          reject(new Error(data));
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function main() {
  console.log('🤖 Configurando Dialogflow CX via API...');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Agent: ${AGENT_ID}`);
  console.log(`Location: ${LOCATION}`);

  try {
    // 1. Crear o actualizar webhook
    console.log('\n📡 Configurando webhook...');
    const webhookBody = {
      displayName: 'Initiative Dashboard Webhook',
      genericWebService: {
        uri: WEBHOOK_URL,
        requestHeaders: {
          'Content-Type': 'application/json'
        }
      },
      timeout: '30s'
    };

    const webhooksPath = `/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/webhooks`;
    
    try {
      // Intentar crear webhook
      const webhook = await makeApiRequest('POST', webhooksPath, webhookBody);
      console.log('✅ Webhook creado:', webhook.name);
    } catch (e) {
      console.log('⚠️ Webhook ya existe o no se pudo crear, continuando...');
    }

    // 2. Obtener información del agente
    console.log('\n📊 Obteniendo información del agente...');
    const agentPath = `/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}`;
    const agent = await makeApiRequest('GET', agentPath);
    console.log('✅ Agente encontrado:', agent.displayName);

    // 3. Actualizar configuración del agente con Generative Features
    console.log('\n✨ Actualizando configuración del agente...');
    const updateBody = {
      ...agent,
      advancedSettings: {
        ...agent.advancedSettings,
        loggingSettings: {
          enableInteractionLogging: true,
          enableConsentBasedRedaction: false
        }
      },
      description: `Initiative Dashboard AI Assistant
      
Capacidades:
- Análisis de datos con BigQuery
- Creación inteligente de iniciativas
- Generación de reportes KPI
- Análisis de capacidad del equipo
- Sugerencias basadas en datos históricos

Seguridad:
- Session mapping por usuario
- Validación de tenant/rol
- Aplicación de RLS
- Uso de Supabase Service Role`,
      speechToTextSettings: {
        enableSpeechAdaptation: true
      }
    };

    const updatedAgent = await makeApiRequest('PATCH', agentPath, updateBody);
    console.log('✅ Agente actualizado');

    // 4. Crear flujo de bienvenida
    console.log('\n🎯 Configurando flujo de bienvenida...');
    const flowsPath = `/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/flows`;
    
    // Obtener el Default Start Flow
    const flows = await makeApiRequest('GET', flowsPath);
    const defaultFlow = flows.flows?.find(f => f.displayName === 'Default Start Flow');
    
    if (defaultFlow) {
      console.log('✅ Default Start Flow encontrado:', defaultFlow.name);
      
      // Actualizar el flujo con webhook
      const updateFlowBody = {
        ...defaultFlow,
        transitionRoutes: [
          {
            intent: 'projects/-/locations/-/agents/-/intents/00000000-0000-0000-0000-000000000000', // Default Welcome Intent
            triggerFulfillment: {
              messages: [
                {
                  text: {
                    text: [
                      '¡Hola! Soy tu asistente de Initiative Dashboard potenciado con Gemini 2.0. 🚀\n\n' +
                      'Puedo ayudarte a:\n' +
                      '• 📊 Analizar el rendimiento de tus iniciativas\n' +
                      '• ✨ Crear nuevas iniciativas con análisis inteligente\n' +
                      '• 📈 Generar reportes y métricas KPI\n' +
                      '• 👥 Analizar la capacidad de tu equipo\n' +
                      '• 💡 Sugerir mejoras basadas en datos históricos\n\n' +
                      '¿En qué puedo ayudarte hoy?'
                    ]
                  }
                }
              ],
              webhook: defaultFlow.name + '/webhooks/initiative-dashboard-webhook',
              tag: 'session-init'
            }
          }
        ]
      };
      
      await makeApiRequest('PATCH', defaultFlow.name, updateFlowBody);
      console.log('✅ Flujo de bienvenida actualizado');
    }

    // 5. Configurar parámetros de sesión
    console.log('\n🔐 Configurando parámetros de sesión...');
    console.log('ℹ️ Los parámetros de sesión se manejarán dinámicamente via webhook');

    console.log('\n✅ Configuración completada!');
    console.log('\n📝 Próximos pasos manuales en la consola de Dialogflow CX:');
    console.log('1. Ir a: https://dialogflow.cloud.google.com/cx/projects/' + PROJECT_ID + '/locations/' + LOCATION + '/agents/' + AGENT_ID);
    console.log('2. Habilitar Generative AI:');
    console.log('   - Agent Settings > Generative AI > Enable');
    console.log('   - Seleccionar modelo: gemini-2.0-flash-exp');
    console.log('3. Configurar Tools:');
    console.log('   - Manage > Tools > Create');
    console.log('   - Añadir BigQuery Tool y Webhook Tool');
    console.log('4. Configurar System Instructions en Generative AI');
    console.log('\n🔒 Recordatorios de Seguridad:');
    console.log('- Configurar Service Account con permisos de BigQuery');
    console.log('- Añadir SUPABASE_SERVICE_KEY en Cloud Functions');
    console.log('- Configurar Redis para session mapping');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
main().catch(console.error);