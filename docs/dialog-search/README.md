# 📁 Estructura de Archivos - Sistema de IA Conversacional

## ✅ Componentes Implementados y Funcionando

### 1. **BigQuery ML** 
- `bigquery-ml-integration.sql` - Modelo ML creado y entrenado
- `seed_training_data_fixed.sql` - 20 iniciativas históricas para training
- `iniciativas_reales.csv` - Datos reales de SEGA/FEMA

### 2. **Cloud Functions** 
- `cloud-function-sync-v2/` - Webhook activo sincronizando 11 tablas
- `cloud-function-dialogflow-webhook/` - Webhook para Dialogflow (por verificar)

### 3. **Configuración de Dialogflow**
- `dialogflow-generative-playbook.yaml` - Playbook con Gemini Pro
- `dialogflow-pending/` - Scripts de configuración pendientes de ejecutar

## 📂 Estructura Actual

```
docs/dialog-search/
├── README.md (este archivo)
├── STATUS-CHECK.md - Estado actual del sistema
│
├── 🤖 BigQuery ML/
│   ├── bigquery-ml-integration.sql
│   ├── seed_training_data_fixed.sql
│   └── iniciativas_reales.csv
│
├── ⚡ Cloud Functions/
│   ├── cloud-function-sync-v2/ (activa)
│   └── cloud-function-dialogflow-webhook/ (por verificar)
│
├── 💬 Dialogflow/
│   ├── dialogflow-generative-playbook.yaml
│   └── dialogflow-pending/
│       ├── create_dialogflow_agent.sh
│       ├── link_datastore_to_agent.sh
│       └── test_agent.sh
│
└── 📚 Documentación/
    ├── BIGQUERY_ML_DIALOGFLOW_INTEGRATION.md
    ├── BOT_INTELIGENTE_CREACION_INICIATIVAS.md
    └── SETUP_COMPLETO_BIGQUERY_WRAPPER.md
```

## 🎯 Estado Actual

| Componente | Estado | Acción Requerida |
|------------|--------|------------------|
| BigQuery Dataset | ✅ Funcionando | Ninguna |
| BigQuery ML | ✅ Funcionando | Ninguna |
| Sincronización Webhooks | ✅ Funcionando | Ninguna |
| BigQuery Wrapper | ✅ Funcionando | Ninguna |
| Vertex AI Search | ✅ Creado | Verificar índice |
| Dialogflow CX | ⚠️ Por verificar | Ejecutar scripts en dialogflow-pending/ |
| Widget Chat | ❌ No integrado | Integrar en la app |

## 🚀 Próximos Pasos

1. **Verificar/Crear Agente Dialogflow CX:**
   ```bash
   cd dialogflow-pending/
   ./create_dialogflow_agent.sh
   ./link_datastore_to_agent.sh
   ./test_agent.sh
   ```

2. **Integrar Widget en la App:**
   - Obtener Agent ID del paso anterior
   - Actualizar el widget con credenciales
   - Integrar en el layout de la aplicación

3. **Conectar Knowledge Store:**
   - Conectar Dialogflow CX con BigQuery
   - Habilitar Generative Fallback

## 📊 Datos Disponibles

- **25 iniciativas** en BigQuery
- **5 predicciones ML** activas
- **11 tablas** sincronizándose en tiempo real
- **78-95%** precisión en predicciones

## 🔗 Enlaces Importantes

- [Dashboard Supabase](https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu)
- [Console GCP](https://console.cloud.google.com/home/dashboard?project=insaight-backend)
- [BigQuery Dataset](https://console.cloud.google.com/bigquery?project=insaight-backend&ws=!1m4!1m3!3m2!1sinsaight-backend!2sgestion_iniciativas)

## 💡 Notas

- Credenciales almacenadas en Vault (no en archivos)
- Scripts obsoletos eliminados para mantener claridad
- Documentación consolidada en este README