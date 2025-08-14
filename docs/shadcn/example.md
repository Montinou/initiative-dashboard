// lib/llm-interface.ts
import { componentCatalog } from './component-catalog.json';

export async function generateUIWithLLM(
  description: string,
  currentUI?: string
) {
  const prompt = `
    ${systemPrompt}
    
    Current UI: ${currentUI}
    Requirements: ${description}
    Available Components: ${JSON.stringify(componentCatalog)}
    
    Generate improved React component using shadcn/ui.
  `;
  
  // Call to LLM API
  const response = await callLLM(prompt);
  return response;
}