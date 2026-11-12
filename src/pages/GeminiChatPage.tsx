import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Check,
  Copy,
  FilePlus2,
  FileText,
  Send,
  SlidersHorizontal,
  Sparkles,
  StopCircle,
  Trash2,
  User,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui'
import {
  PRESET_ROLES,
  MODEL_CONFIGS,
  sendChatMessage,
  type ChatMessage,
  type ChatRole,
  type GeminiModel,
} from '@/lib/gemini'
import { useNotesList } from '@/hooks/useNotesList'
import { createNote } from '@/lib/api'
import { cn, relativeTime } from '@/lib/format'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'

const CHAT_STORAGE_KEY = 'quicknote_gemini_chat_history_v1'
const ROLE_STORAGE_KEY = 'quicknote_gemini_role_v1'

export function GeminiChatPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { bump } = useData()
  const toast = useToast()

  // Saved roles & model selection
  const [selectedRole, setSelectedRole] = useState<ChatRole>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY)
      if (saved) {
        const found = PRESET_ROLES.find((r) => r.id === saved)
        if (found) return found
      }
    } catch {
      // ignore
    }
    return PRESET_ROLES[0]
  })

  const [selectedModel, setSelectedModel] = useState<GeminiModel>(selectedRole.model)
  const [customSystemInstruction, setCustomSystemInstruction] = useState<string>(
    selectedRole.systemInstruction,
  )
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)

  // Multi-turn chat message history
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return []
  })

  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [attachedNoteId, setAttachedNoteId] = useState<string>('')
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Notes list for note attachment option
  const { notes } = useNotesList('all', { sort: 'updated_desc' })

  // Keep localStorage in sync with conversation history
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // non-fatal
    }
  }, [messages])

  // Scroll to bottom on new message or during generation
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  const handleRoleChange = (role: ChatRole) => {
    setSelectedRole(role)
    setSelectedModel(role.model)
    setCustomSystemInstruction(role.systemInstruction)
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role.id)
    } catch {
      // ignore
    }
    setIsRoleModalOpen(false)
    toast.success(`Role changed to "${role.name}" (${MODEL_CONFIGS[role.model].label})`)
  }

  const handleClearHistory = () => {
    if (messages.length === 0) return
    if (confirm('Clear your conversation history?')) {
      setMessages([])
      try {
        localStorage.removeItem(CHAT_STORAGE_KEY)
      } catch {
        // ignore
      }
      toast.success('Conversation cleared')
    }
  }

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreateNoteFromMessage = async (msg: ChatMessage) => {
    if (!user) {
      toast.error('Sign in to save notes')
      return
    }
    setSavingNoteId(msg.id)
    try {
      const firstLine = msg.content.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 80)
      const title = firstLine || 'AI Note'
      const newNote = await createNote({
        title,
        content: msg.content,
        folder_id: null,
      })
      bump()
      toast.success('Saved to notes!')
      navigate(`/app/notes/${newNote.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save note')
    } finally {
      setSavingNoteId(null)
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsGenerating(false)
      toast.info('Generation stopped')
    }
  }

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isGenerating) return

    let userContent = trimmed
    // If a note was attached as context, prepend its content
    if (attachedNoteId) {
      const note = notes.find((n) => n.id === attachedNoteId)
      if (note) {
        userContent = `[Referencing Note: "${note.title || 'Untitled'}"]\n${note.content}\n\n[User Request]:\n${trimmed}`
      }
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString(),
    }

    const aiMessageId = `model-${Date.now() + 1}`
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'model',
      content: '',
      timestamp: new Date().toISOString(),
      model: selectedModel,
    }

    const nextMessages = [...messages, userMessage]
    setMessages([...nextMessages, initialAiMessage])
    setInput('')
    setAttachedNoteId('')
    setIsGenerating(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      await sendChatMessage(nextMessages, {
        model: selectedModel,
        systemInstruction: customSystemInstruction,
        signal: controller.signal,
        onChunk: (chunkText) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMessageId ? { ...m, content: chunkText } : m)),
          )
        },
      })
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      const errMessage = err instanceof Error ? err.message : 'Failed to generate response'
      toast.error(errMessage)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: `⚠️ **Error**: ${errMessage}\n\n*If using advanced models, try switching to Gemini 3.8 Flash or Gemini 3.1 Flash Lite.*`,
              }
            : m,
        ),
      )
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const selectedNote = notes.find((n) => n.id === attachedNoteId)

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader
        title="Gemini Chatbot"
        description="Multi-turn conversational intelligence for brainstorming, summarizing, and organizing your notes."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRoleModalOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-brand-600" />
              <span>Role: {selectedRole.name}</span>
            </Button>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                aria-label="Clear chat history"
                title="Clear conversation"
                className="text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {/* Model & Role pill bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-2 text-xs dark:border-white/10 dark:bg-surface-dark/70">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-zinc-600 dark:text-zinc-300">Active Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 transition dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="gemini-3.8-flash">Gemini 3.8 Flash (General Tasks)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast Tasks)</option>
            <option value="gemini-4-carbon">Gemini 4 Carbon (Deep Reasoning)</option>
            <option value="gemini-4-argon">Gemini 4 Argon (Complex Interactive)</option>
          </select>
          <span className="hidden sm:inline-block rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {MODEL_CONFIGS[selectedModel]?.defaultFor}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 dark:text-zinc-400">
            {messages.length} message{messages.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Scrollable message thread */}
      <div className="flex-1 overflow-y-auto scroll-area rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-surface-dark/40 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-400">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-zinc-800 dark:text-zinc-100 sm:text-lg">
              How can I assist you today?
            </h2>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-sm">
              Role: <strong className="text-zinc-700 dark:text-zinc-300">{selectedRole.name}</strong>. Ask questions,
              brainstorm new ideas, summarize your thoughts, or attach an existing note.
            </p>

            {/* Quick starter prompt chips */}
            <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
              {[
                'Outline key points for a project plan',
                'Brainstorm 5 ideas for my next note',
                'Help me organize my daily workflow',
                'Summarize the key concepts of distributed systems',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setInput(chip)
                    textareaRef.current?.focus()
                  }}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3',
                    isUser ? 'justify-end' : 'justify-start',
                  )}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'group relative max-w-2xl rounded-2xl p-4 text-sm shadow-xs transition-shadow',
                      isUser
                        ? 'bg-brand-600 text-white rounded-tr-none'
                        : 'border border-zinc-200 bg-zinc-50/70 text-zinc-800 dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-100 rounded-tl-none',
                    )}
                  >
                    {/* Model tag and timestamp */}
                    <div className="mb-1 flex items-center justify-between gap-4 text-[10px] opacity-75">
                      <span>{isUser ? 'You' : msg.model ? MODEL_CONFIGS[msg.model]?.label : 'Gemini'}</span>
                      <span>{relativeTime(msg.timestamp)}</span>
                    </div>

                    {/* Content */}
                    <div className="whitespace-pre-wrap leading-relaxed break-words">
                      {msg.content || (isGenerating ? 'Thinking…' : '')}
                    </div>

                    {/* Action buttons on assistant message */}
                    {!isUser && msg.content && (
                      <div className="mt-3 flex items-center justify-end gap-1 border-t border-zinc-200/50 pt-2 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy response"
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-white/10"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>Copy</span>
                        </button>

                        <button
                          type="button"
                          disabled={savingNoteId === msg.id}
                          onClick={() => handleCreateNoteFromMessage(msg)}
                          title="Save this response as a new note in QuickNote"
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/60"
                        >
                          <FilePlus2 className="h-3.5 w-3.5" />
                          <span>Save as Note</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={threadEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="mt-3">
        {/* Note context attachment pill */}
        {selectedNote && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs text-brand-800 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-200">
            <span className="flex items-center gap-1.5 truncate">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Attached Note: <strong>{selectedNote.title || 'Untitled note'}</strong></span>
            </span>
            <button
              type="button"
              onClick={() => setAttachedNoteId('')}
              className="ml-2 text-xs font-semibold hover:underline"
            >
              Remove
            </button>
          </div>
        )}

        <div className="relative rounded-2xl border border-zinc-300 bg-white shadow-soft transition-all focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-white/10 dark:bg-surface-dark">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isGenerating
                ? 'Gemini is responding…'
                : `Ask ${selectedRole.name} anything… (Press Enter to send, Shift+Enter for new line)`
            }
            className="w-full resize-none bg-transparent px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />

          <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 dark:border-white/5">
            {/* Left toolbar: attach note */}
            <div className="flex items-center gap-2">
              {notes.length > 0 && (
                <div className="relative">
                  <select
                    value={attachedNoteId}
                    onChange={(e) => setAttachedNoteId(e.target.value)}
                    className="h-8 max-w-[12rem] truncate rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <option value="">+ Attach a note for context…</option>
                    {notes.slice(0, 15).map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title || 'Untitled note'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right: Send or Stop */}
            <div className="flex items-center gap-2">
              {isGenerating ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleStop}
                  className="flex items-center gap-1.5"
                >
                  <StopCircle className="h-4 w-4" />
                  <span>Stop</span>
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim()}
                  className="flex items-center gap-1.5"
                >
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Role & System Instruction Modal */}
      {isRoleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-pop dark:border-white/10 dark:bg-surface-dark">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Choose Chatbot Role & System Instruction
              </h3>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Select a specialized role with pre-configured task mapping, or customize the system instruction.
            </p>

            <div className="mt-4 space-y-2.5 max-h-60 overflow-y-auto">
              {PRESET_ROLES.map((role) => {
                const isSelected = selectedRole.id === role.id
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    className={cn(
                      'w-full text-left rounded-xl border p-3 transition',
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 dark:border-brand-500/50 dark:bg-brand-950/30'
                        : 'border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        {role.name}
                      </span>
                      <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                        {MODEL_CONFIGS[role.model].badge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {role.description}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Custom System Instruction:
              </label>
              <textarea
                rows={3}
                value={customSystemInstruction}
                onChange={(e) => setCustomSystemInstruction(e.target.value)}
                placeholder="Give the chatbot specific instructions or behavioral constraints..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-900 focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsRoleModalOpen(false)
                  toast.success('System instruction saved')
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default GeminiChatPage
