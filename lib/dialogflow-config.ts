// Configuración de Dialogflow CX Messenger
export const DIALOGFLOW_CONFIG = {
  agentId: '7f297240-ca50-4896-8b71-e82fd707fa88',
  location: 'us-central1',
  projectId: 'insaight-backend',
  languageCode: 'es',
  
  // Dominios permitidos (configurados en el agente)
  allowedDomains: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://siga-turismo.vercel.app',
    'https://initiative-dashboard.vercel.app',
    'https://stratix.vercel.app'
  ],
  
  // Configuración de UI
  ui: {
    botTitle: 'Initiative Assistant',
    welcomeMessage: '¡Hola! Soy tu asistente de iniciativas con Gemini 2.5. ¿En qué puedo ayudarte?',
    primaryColor: '#3b82f6',
    botMessageColor: '#f3f4f6',
    userMessageColor: '#3b82f6'
  },
  
  // URLs de prueba
  testUrls: {
    console: 'https://dialogflow.cloud.google.com/cx/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88/test',
    integrations: 'https://console.cloud.google.com/dialogflow/cx/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88/integrations'
  }
};

// Verificar si el dominio actual está permitido
export function isDomainAllowed(): boolean {
  if (typeof window === 'undefined') return true;
  
  const currentHost = window.location.host;
  const currentOrigin = window.location.origin;
  
  return DIALOGFLOW_CONFIG.allowedDomains.some(domain => 
    currentOrigin.startsWith(domain) || 
    currentHost === domain.replace(/^https?:\/\//, '') ||
    (domain.includes('*') && currentHost.endsWith(domain.replace('*.', '')))
  );
}
