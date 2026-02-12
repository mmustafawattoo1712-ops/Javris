
// Local LLM Client (Ollama)
const OLLAMA_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3'; // Can be 'mistral', 'gemma', etc.

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
}

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`);
    return res.ok;
  } catch (e) {
    console.warn("Ollama unreachable:", e);
    return false;
  }
}

export async function generateOllamaResponse(
  prompt: string, 
  systemPrompt: string,
  history: {role: string, content: string}[]
): Promise<{ text: string, thought: string, commands: any[] }> {
  
  // 1. Construct the Payload with a strict Schema for JSON output
  // We force the model to output JSON with "thought", "response", and "tool_calls".
  const fullPrompt = `
  ${systemPrompt}
  
  CURRENT CHAT HISTORY:
  ${history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}
  
  USER: ${prompt}
  
  INSTRUCTIONS:
  You are running in OFFLINE MODE.
  1. ANALYZE the user's request.
  2. THINK step-by-step about what hardware/software is needed.
  3. DECIDE on an action.
  4. RESPONSE must be a raw JSON object (no markdown formatting).
  
  JSON FORMAT:
  {
    "thought": "Internal reasoning process...",
    "response": "What you say to the user...",
    "tool_calls": [
       { "tool": "control_installed_app", "args": { "app_name": "...", "action_type": "...", "payload": "..." } }
    ]
  }
  `;

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt: fullPrompt,
        stream: false,
        format: "json", // Force JSON mode (Ollama feature)
        options: {
            temperature: 0.7, // Creativity balance
            num_ctx: 4096     // Context window
        }
      })
    });

    const data: OllamaResponse = await res.json();
    
    // Parse the JSON output from the LLM
    try {
        const parsed = JSON.parse(data.response);
        return {
            text: parsed.response || "I am unable to process that offline.",
            thought: parsed.thought || "Processing...",
            commands: parsed.tool_calls || []
        };
    } catch (parseError) {
        console.error("Failed to parse LLM JSON:", data.response);
        // Fallback for non-JSON text
        return {
            text: data.response,
            thought: "Raw output generated.",
            commands: []
        };
    }

  } catch (e) {
    console.error("Ollama Error:", e);
    return { text: "Offline Core Unreachable. Check connection.", thought: "Connection Failed", commands: [] };
  }
}
