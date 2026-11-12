import express, { type Request, type Response } from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(express.json({ limit: '10mb' }))

// Initialize Gemini client on server with required User-Agent
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || ''
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  })
}

// Supported models for the Gemini Chatbot
const ALLOWED_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
  'gemini-4-carbon',
] as const

type AllowedModel = (typeof ALLOWED_MODELS)[number]

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

interface ChatRequestBody {
  messages: ChatMessage[]
  model?: AllowedModel
  systemInstruction?: string
  stream?: boolean
}

// Multi-turn chat endpoint
app.post('/api/chat', async (req: Request<{}, {}, ChatRequestBody>, res: Response) => {
  const { messages = [], model = 'gemini-3.8-flash', systemInstruction, stream = false } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Please provide at least one message.' })
    return
  }

  const selectedModel = ALLOWED_MODELS.includes(model as AllowedModel)
    ? model
    : 'gemini-3.8-flash'

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(503).json({
      error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is available in your environment or Secrets.',
    })
    return
  }

  try {
    const ai = getGeminiClient()
    const lastUserMessage = messages[messages.length - 1]
    const priorMessages = messages.slice(0, messages.length - 1)

    // Build history for ai.chats.create
    const history = priorMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }))

    const defaultRolePrompt =
      'You are QuickNote AI Assistant, an intelligent, empathetic, and organized assistant built right into the QuickNote note-taking application. ' +
      'You help users brainstorm, summarize their notes, draft outlines, structure ideas, proofread content, write code, and answer questions. ' +
      'Format responses cleanly in Markdown with concise sections, bold text, code blocks, or bullet points when helpful.'

    const chat = ai.chats.create({
      model: selectedModel,
      config: {
        systemInstruction: systemInstruction?.trim() || defaultRolePrompt,
      },
      history,
    })

    if (stream) {
      // Server-Sent Events (SSE) streaming
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const responseStream = await chat.sendMessageStream({
        message: lastUserMessage.content,
      })

      for await (const chunk of responseStream) {
        const text = chunk.text || ''
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`)
        }
      }

      res.write(`data: [DONE]\n\n`)
      res.end()
    } else {
      const response = await chat.sendMessage({
        message: lastUserMessage.content,
      })

      res.json({
        text: response.text ?? '',
        model: selectedModel,
      })
    }
  } catch (err: unknown) {
    console.error('Gemini API chat error:', err)
    const errMessage = err instanceof Error ? err.message : String(err)

    if (errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('429')) {
      res.status(429).json({
        error:
          'Quota limit reached for this model. Try switching to gemini-3.8-flash or gemini-3.1-flash-lite, or check your API key quota.',
      })
      return
    }

    if (errMessage.includes('PERMISSION_DENIED') || errMessage.includes('403')) {
      res.status(403).json({
        error:
          'Access to this model was denied. Paid models like gemini-4-carbon or gemini-4-argon require a billing-enabled API key. You can use gemini-3.8-flash or gemini-3.1-flash-lite.',
      })
      return
    }

    res.status(500).json({
      error: `Gemini error: ${errMessage.replace(/\s+/g, ' ').slice(0, 200)}`,
    })
  }
})

// Quick health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) })
})

// Setup Vite dev middleware or serve production static assets
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production'

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.resolve(__dirname, 'dist')
    app.use(express.static(distPath))
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuickNote server listening on http://0.0.0.0:${PORT}`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
