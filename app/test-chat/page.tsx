import { DialogflowWidget } from '@/components/dialogflow-widget';

export default function TestChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Prueba del Asistente IA con Vertex AI
        </h1>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Preguntas de ejemplo:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>¿Cuáles son las iniciativas activas?</li>
            <li>¿Qué iniciativas tienen mayor probabilidad de éxito?</li>
            <li>¿Cuál es el progreso del área de Marketing?</li>
            <li>Sugiere una nueva iniciativa para el área de Tecnología</li>
            <li>¿Qué iniciativas están en riesgo?</li>
            <li>Analiza el histórico de iniciativas completadas</li>
            <li>¿Cuántas iniciativas tiene SIGA Turismo?</li>
            <li>¿Qué proyectos de FEMA Iluminación están completados?</li>
          </ul>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 El asistente usa <strong>Vertex AI Generative Fallback</strong> con Gemini Pro 
              para responder de forma inteligente, incluso a preguntas no previstas.
            </p>
          </div>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              🔗 Conectado a BigQuery con 25 iniciativas y predicciones ML en tiempo real.
            </p>
          </div>
        </div>
      </div>
      <DialogflowWidget />
    </div>
  );
}