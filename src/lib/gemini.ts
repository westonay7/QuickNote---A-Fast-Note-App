export type GeminiModel =
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon'
  | 'gemini-4-carbon'

export interface ChatMessage {
  id: string
  role: 'user' | 'model'
  content: string
  timestamp: string
  model?: GeminiModel
}

export interface ChatRole {
  id: string
  name: string
  description: string
  model: GeminiModel
  systemInstruction: string
}

export const PRESET_ROLES: ChatRole[] = [
  {
    id: 'general',
    name: 'General Note Assistant',
    description: 'Great for brainstorming, general Q&A, and drafting notes.',
    model: 'gemini-3.8-flash',
    systemInstruction:
      'You are QuickNote AI Assistant, an intelligent, friendly, and structured assistant built for note-takers. ' +
      'Help the user brainstorm ideas, organize their thoughts, answer questions, and draft well-organized notes. ' +
      'Use Markdown headings, bullet points, and clear formatting.',
  },
  {
    id: 'fast',
    name: 'Fast Summarizer',
    description: 'Lightning-fast, ultra-concise summaries and quick checks.',
    model: 'gemini-3.1-flash-lite',
    systemInstruction:
      'You are a high-speed executive assistant. Provide concise, high-density summaries, bullet points, and direct answers without filler. ' +
      'Prioritize speed, clarity, and brevity.',
  },
  {
    id: 'deep-reasoning',
    name: 'Deep Reasoning Analyst',
    description: 'Deep logic, architectural thinking, and complex problem breakdown.',
    model: 'gemini-4-carbon',
    systemInstruction:
      'You are a senior analytical thinker and root-cause investigator. Dive deeply into problems, examine edge cases, ' +
      'weigh trade-offs, and provide thorough, methodical explanations.',
  },
  {
    id: 'complex-interactive',
    name: 'Interactive Creative Partner',
    description: 'Engaging, interactive collaboration for complex creative drafting.',
    model: 'gemini-4-argon',
    systemInstruction:
      'You are a creative collaborative partner. Engage in lively, back-and-forth creative development, story-building, ' +
      'complex problem-solving, and offer insightful alternative angles.',
  },
]

export const MODEL_CONFIGS: Record<
  GeminiModel,
  { label: string; badge: string; description: string; defaultFor: string }
> = {
  'gemini-3.8-flash': {
    label: 'Gemini 3.8 Flash',
    badge: 'General',
    description: 'Fast and versatile general-purpose intelligence.',
    defaultFor: 'Standard tasks & drafting',
  },
  'gemini-3.1-flash-lite': {
    label: 'Gemini 3.1 Flash Lite',
    badge: 'Fast',
    description: 'Lowest latency for instant summaries and quick checks.',
    defaultFor: 'Rapid Q&A & summaries',
  },
  'gemini-4-carbon': {
    label: 'Gemini 4 Carbon',
    badge: 'Deep Reasoning',
    description: 'Maximum depth of reasoning for complex technical and logical tasks.',
    defaultFor: 'Deep thinking & root-cause analysis',
  },
  'gemini-4-argon': {
    label: 'Gemini 4 Argon',
    badge: 'Complex Interactive',
    description: 'Advanced capabilities for intricate interactive dialogue and creativity.',
    defaultFor: 'Complex interactive tasks',
  },
}

export async function sendChatMessage(
  messages: ChatMessage[],
  options: {
    model: GeminiModel
    systemInstruction?: string
    onChunk?: (chunkText: string) => void
    signal?: AbortSignal
  },
): Promise<string> {
  const { model, systemInstruction, onChunk, signal } = options

  // Payload format for server
  const apiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: apiMessages,
      model,
      systemInstruction,
      stream: Boolean(onChunk),
    }),
    signal,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const errorMsg = errorData.error || `Server responded with status ${res.status}`
    throw new Error(errorMsg)
  }

  if (onChunk && res.body) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim()
          if (dataStr === '[DONE]') continue
          try {
            const parsed = JSON.parse(dataStr)
            if (parsed.text) {
              accumulated += parsed.text
              onChunk(accumulated)
            }
          } catch {
            // non-json line
          }
        }
      }
    }
    return accumulated
  }

  const data = await res.json()
  return data.text || ''
}
