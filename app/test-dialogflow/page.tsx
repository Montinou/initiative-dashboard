export default function TestDialogflowPage() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Test Dialogflow Messenger</h1>
      <p className="mb-4">Esta es una página de prueba para el widget de Dialogflow.</p>
      
      {/* Código HTML directo desde Google Cloud Console */}
      <div dangerouslySetInnerHTML={{ __html: `
        <link rel="stylesheet" href="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css">
        <script src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"></script>
        <df-messenger
          location="us-central1"
          project-id="insaight-backend"
          agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
          language-code="es"
          max-query-length="-1">
          <df-messenger-chat-bubble
            chat-title="Initiative Assistant with Gemini 2.5">
          </df-messenger-chat-bubble>
        </df-messenger>
        <style>
          df-messenger {
            z-index: 999;
            position: fixed;
            --df-messenger-font-color: #1f2937;
            --df-messenger-font-family: Google Sans, system-ui, sans-serif;
            --df-messenger-chat-background: #f9fafb;
            --df-messenger-message-user-background: #3b82f6;
            --df-messenger-message-bot-background: #e5e7eb;
            --df-messenger-bot-message: #1f2937;
            --df-messenger-user-message: #ffffff;
            --df-messenger-button-titlebar-color: #3b82f6;
            --df-messenger-button-titlebar-font-color: #ffffff;
            --df-messenger-chat-background-color: #ffffff;
            --df-messenger-send-icon: #3b82f6;
            --df-messenger-minimized-chat-close-icon-color: #ffffff;
            --df-messenger-input-box-color: #f3f4f6;
            --df-messenger-input-font-color: #1f2937;
            --df-messenger-input-placeholder-font-color: #6b7280;
            bottom: 16px;
            right: 16px;
          }
        </style>
      ` }} />
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="font-semibold text-yellow-800 mb-2">Nota para desarrollo local:</h2>
        <p className="text-yellow-700">
          Para que funcione en localhost, accede a esta página usando:{' '}
          <a href="http://127-0-0-1.nip.io:3000/test-dialogflow" className="underline font-mono">
            http://127-0-0-1.nip.io:3000/test-dialogflow
          </a>
        </p>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <h2 className="font-semibold text-blue-800 mb-2">Dominios permitidos:</h2>
        <ul className="list-disc list-inside text-blue-700">
          <li>siga-turismo.vercel.app</li>
          <li>fema-electricidad.vercel.app</li>
          <li>stratix.vercel.app</li>
          <li>ivh.me</li>
          <li>127-0-0-1.nip.io (desarrollo local)</li>
        </ul>
      </div>
    </div>
  );
}