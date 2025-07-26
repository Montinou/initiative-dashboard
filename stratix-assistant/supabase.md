// Este archivo debería estar en: supabase/functions/stratix-handler/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "stratix-handler" is up and running!`)

// Deno.serve es el servidor que escuchará las peticiones
Deno.serve(async (req) => {
  // Manejo de CORS, necesario si se llama desde un navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Crear el cliente de Supabase DENTRO de la función.
    // Es la forma más segura, ya que usa las variables de entorno del servicio
    // y pasa la autorización del usuario que hace la llamada.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // ¡IMPORTANTE! Esto pasa el token de autenticación del usuario que llama
      // a la función, permitiendo que Row Level Security (RLS) funcione mágicamente.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Extraer los datos que manda la Google Cloud Function en el cuerpo del request
    const { action, params } = await req.json()

    let data = null
    let error = null

    // 3. Decidir qué consulta hacer a la base de datos según la "acción"
    if (action === 'get_iniciativa_status') {
      const { nombre_iniciativa } = params
      if (!nombre_iniciativa) throw new Error("Falta el parámetro 'nombre_iniciativa'")

      // La magia de RLS se encarga de filtrar por tenant_id automáticamente
      // gracias al token de autorización que pasamos al crear el cliente.
      const { data: initiativeData, error: initiativeError } = await supabaseClient
        .from('initiatives') // Nombre de tu tabla de iniciativas
        .select('progress, id') // Seleccionamos solo los campos que necesitamos
        .eq('name', nombre_iniciativa)
        .single() // Esperamos un solo resultado

      data = initiativeData
      error = initiativeError

    } else if (action === 'get_area_kpi') {
      const { nombre_area } = params
      if (!nombre_area) throw new Error("Falta el parámetro 'nombre_area'")

      const { data: kpiData, error: kpiError } = await supabaseClient
        .from('kpis_summary') // Asumiendo que tenés una tabla o vista de KPIs
        .select('value, dashboard_id')
        .eq('area_name', nombre_area)
        .single()

      data = kpiData
      error = kpiError

    } else {
      throw new Error(`Acción desconocida: ${action}`)
    }

    if (error) throw error

    // 4. Devolver la respuesta a la Google Cloud Function en formato JSON
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    // Manejo de errores
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
