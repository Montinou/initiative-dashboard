import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export interface KPIDataForInsights {
  summary: {
    totalInitiatives: number;
    completedInitiatives: number;
    inProgressInitiatives: number;
    planningInitiatives: number;
    onHoldInitiatives: number;
    averageProgress: number;
    overdueInitiatives: number;
    completionRate: number;
  };
  areaMetrics: Array<{
    areaId: string;
    areaName: string;
    totalInitiatives: number;
    completedInitiatives: number;
    inProgressInitiatives: number;
    totalProgress: number;
    overdueInitiatives: number;
    averageProgress: number;
    completionRate: number;
  }>;
  statusDistribution: {
    planning: number;
    in_progress: number;
    completed: number;
    on_hold: number;
  };
  recentActivity?: Array<{
    id: string;
    title: string;
    area: string;
    progress: number;
    status: string;
    updatedAt: string;
  }>;
  timeRange: string;
  userRole: string;
  areaFilter?: string | null;
}

export interface GeneratedInsights {
  keyInsights: string[];
  recommendations: string[];
  risks: string[];
  opportunities: string[];
  summary: string;
  performanceHighlights?: string[];
  areaAnalysis?: string[];
  trendsAndPatterns?: string[];
  actionPriorities?: string[];
}

/**
 * Generate AI-powered insights from KPI data using Gemini
 */
export async function generateKPIInsights(data: KPIDataForInsights): Promise<GeneratedInsights> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
You are an expert business analyst for an OKR (Objectives and Key Results) management system. Analyze the following KPI data and provide actionable insights in Spanish.

KPI DATA:
========
Summary:
- Total Initiatives: ${data.summary.totalInitiatives}
- Completed: ${data.summary.completedInitiatives} (${data.summary.completionRate}%)
- In Progress: ${data.summary.inProgressInitiatives}
- Planning: ${data.summary.planningInitiatives}
- On Hold: ${data.summary.onHoldInitiatives}
- Average Progress: ${data.summary.averageProgress}%
- Overdue Initiatives: ${data.summary.overdueInitiatives}

Area Performance:
${data.areaMetrics.map(area => `
- ${area.areaName}:
  * Total: ${area.totalInitiatives} initiatives
  * Completed: ${area.completedInitiatives} (${area.completionRate}%)
  * Average Progress: ${area.averageProgress}%
  * Overdue: ${area.overdueInitiatives}
`).join('')}

Time Range: ${data.timeRange}
User Role: ${data.userRole}

Based on this data, provide comprehensive insights organized by relevant sections in the following JSON format:
{
  "summary": "A brief 2-3 sentence executive summary of the overall status",
  "keyInsights": [
    "3-5 key observations about current performance (specific and quantitative)"
  ],
  "performanceHighlights": [
    "2-3 notable achievements or positive performance indicators"
  ],
  "areaAnalysis": [
    "2-3 insights about individual area performance and comparisons"
  ],
  "trendsAndPatterns": [
    "2-3 observations about trends, patterns, or changes over time"
  ],
  "risks": [
    "2-3 main risks or concerns that need immediate attention"
  ],
  "opportunities": [
    "2-3 opportunities for improvement or growth"
  ],
  "recommendations": [
    "3-4 specific actionable recommendations to improve performance"
  ],
  "actionPriorities": [
    "2-3 immediate actions that should be prioritized"
  ]
}

IMPORTANT RULES:
1. ALL RESPONSES MUST BE IN SPANISH - ALWAYS USE SPANISH LANGUAGE
2. Be specific and use actual numbers from the data
3. Focus on actionable insights, not generic observations
4. Prioritize the most critical findings
5. Consider the time range (${data.timeRange}) when making observations
6. Tailor insights based on the user role (${data.userRole})
7. If there are overdue initiatives, make them a priority in recommendations
8. Highlight both positive achievements and areas needing improvement
9. Return ONLY valid JSON, no additional text or markdown

Generate the insights now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response to ensure it's valid JSON
    let cleanedText = text.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.substring(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    
    // Parse the JSON response
    const insights = JSON.parse(cleanedText) as GeneratedInsights;
    
    // Validate the response structure
    if (!insights.keyInsights || !Array.isArray(insights.keyInsights)) {
      insights.keyInsights = [];
    }
    if (!insights.recommendations || !Array.isArray(insights.recommendations)) {
      insights.recommendations = [];
    }
    if (!insights.risks || !Array.isArray(insights.risks)) {
      insights.risks = [];
    }
    if (!insights.opportunities || !Array.isArray(insights.opportunities)) {
      insights.opportunities = [];
    }
    if (!insights.summary || typeof insights.summary !== 'string') {
      insights.summary = 'No se pudo generar un resumen ejecutivo mediante IA.';
    }
    
    return insights;
  } catch (error) {
    console.error('Error generating Gemini insights:', error);
    
    // Return fallback insights based on the data
    return generateFallbackInsights(data);
  }
}

/**
 * Generate fallback insights when Gemini API fails
 */
function generateFallbackInsights(data: KPIDataForInsights): GeneratedInsights {
  const insights: GeneratedInsights = {
    keyInsights: [],
    recommendations: [],
    risks: [],
    opportunities: [],
    summary: ''
  };

  // Generate basic insights from the data
  if (data.summary.completionRate > 0) {
    insights.keyInsights.push(
      `${data.summary.completionRate}% de las iniciativas han sido completadas exitosamente`
    );
  }

  if (data.summary.overdueInitiatives > 0) {
    insights.keyInsights.push(
      `${data.summary.overdueInitiatives} iniciativa(s) están vencidas y requieren atención inmediata`
    );
    insights.risks.push(
      `Las iniciativas vencidas pueden impactar negativamente en los objetivos trimestrales`
    );
  }

  if (data.summary.averageProgress > 70) {
    insights.keyInsights.push(
      `Excelente progreso general con un promedio del ${data.summary.averageProgress}%`
    );
  } else if (data.summary.averageProgress < 30) {
    insights.keyInsights.push(
      `El progreso general es bajo (${data.summary.averageProgress}%), se requiere mayor enfoque`
    );
    insights.recommendations.push(
      `Revisar y priorizar las iniciativas con menor progreso`
    );
  }

  // Find best performing area
  const bestArea = data.areaMetrics.reduce((best, area) => 
    area.averageProgress > (best?.averageProgress || 0) ? area : best
  , data.areaMetrics[0]);
  
  if (bestArea && bestArea.averageProgress > 0) {
    insights.keyInsights.push(
      `${bestArea.areaName} lidera con ${bestArea.averageProgress}% de progreso promedio`
    );
  }

  // Find areas at risk
  const areasAtRisk = data.areaMetrics.filter(area => 
    area.overdueInitiatives > 0 || area.averageProgress < 30
  );
  
  if (areasAtRisk.length > 0) {
    insights.risks.push(
      `${areasAtRisk.length} área(s) requieren atención especial por bajo rendimiento o iniciativas vencidas`
    );
  }

  // Add recommendations based on status distribution
  if (data.statusDistribution.on_hold > data.summary.totalInitiatives * 0.2) {
    insights.recommendations.push(
      `Revisar las ${data.statusDistribution.on_hold} iniciativas en espera y determinar próximos pasos`
    );
  }

  if (data.statusDistribution.planning > data.summary.totalInitiatives * 0.3) {
    insights.recommendations.push(
      `Acelerar la transición de las ${data.statusDistribution.planning} iniciativas en planificación hacia la ejecución`
    );
  }

  // Add opportunities
  if (data.summary.completionRate > 60) {
    insights.opportunities.push(
      `Alto índice de completitud sugiere capacidad para asumir nuevos desafíos estratégicos`
    );
  }

  if (data.areaMetrics.some(area => area.completionRate > 80)) {
    insights.opportunities.push(
      `Las áreas de alto rendimiento pueden compartir mejores prácticas con el resto de la organización`
    );
  }

  // Generate summary
  const status = data.summary.averageProgress > 60 ? 'positivo' : 
                 data.summary.averageProgress > 40 ? 'moderado' : 'necesita mejora';
  
  insights.summary = `El estado general del portafolio de iniciativas es ${status} con un progreso promedio del ${data.summary.averageProgress}%. ` +
    `Se han completado ${data.summary.completedInitiatives} de ${data.summary.totalInitiatives} iniciativas. ` +
    (data.summary.overdueInitiatives > 0 
      ? `Se requiere atención inmediata para las ${data.summary.overdueInitiatives} iniciativas vencidas.`
      : `Todas las iniciativas están dentro de los plazos establecidos.`);

  return insights;
}