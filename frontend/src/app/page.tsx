"use client"
import React, { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Send, Link, Activity, MessageSquare, Lightbulb, Glasses } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  citations?: any[]
}

const SUGGESTIONS = [
  "How do I set up authentication?",
  "What are the API endpoints?",
  "Give me a quick setup guide for the SDK",
  "Summarize the ingestion process"
]

export default function Page() {
  // --- state (same as before, preserved for streaming logic) ---
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [ingestUrl, setIngestUrl] = useState('')
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestStatus, setIngestStatus] = useState('')
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')

  useEffect(() => {
    const stored = sessionStorage.getItem('conversation_id')
    if (stored) {
      setConversationId(stored)
      // fetch history for this conversation and restore messages
      ;(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/chat/history/${stored}`)
          if (res.ok) {
            const j = await res.json()
            if (j && Array.isArray(j.messages)) {
              const restored = j.messages.map((m: any) => ({ role: m.role, content: m.content || '', citations: m.citations || [] }))
              setMessages(restored)
            }
          }
        } catch (e) {
          // ignore fetch errors; conversation will start fresh
          console.warn('Failed to load conversation history', e)
        }
      })()
    }
  }, [])

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight })
  }, [messages])

  // --- sendMessage (kept the streaming + non-streaming behavior intact) ---
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    const payload: any = { message: input, conversation_id: conversationId }

    if (!streaming) {
      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const j = await res.json()
        if (j.conversation_id) {
          sessionStorage.setItem('conversation_id', j.conversation_id)
          setConversationId(j.conversation_id)
        }
        setMessages(prev => [...prev, { role: 'assistant', content: j.content, citations: j.citations }])
      } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error: ' + String(e) }])
      }
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!res.body) throw new Error('No response body for stream')
        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buf = ''
        let fullContent = ''
        let citations: any[] = []
        let lastUpdate = 0
        let messageAdded = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })

          let parts = buf.split('\n\n')
          if (!buf.endsWith('\n\n')) {
            buf = parts.pop() || ''
          } else {
            buf = ''
          }

          for (const part of parts) {
            const lines = part.split('\n')
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const payloadText = line.replace(/^data:\s*/, '')
                try {
                  const obj = JSON.parse(payloadText)
                  if (obj.type === 'content') {
                    const token = obj.data.token
                    fullContent += token
                    const now = Date.now()
                    if (now - lastUpdate > 100) {
                      if (!messageAdded) {
                        setMessages(prev => [...prev, { role: 'assistant', content: fullContent, citations: [] }])
                        messageAdded = true
                      } else {
                        setMessages(prev => {
                          const updated = [...prev]
                          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                            updated[updated.length - 1].content = fullContent
                          }
                          return updated
                        })
                      }
                      lastUpdate = now
                    }
                  } else if (obj.type === 'citations') {
                    citations = obj.data.citations
                    setMessages(prev => {
                      const updated = [...prev]
                      if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                        updated[updated.length - 1].citations = citations
                      }
                      return updated
                    })
                  } else if (obj.type === 'end') {
                    const conv = obj.data.conversation_id
                    if (conv) {
                      sessionStorage.setItem('conversation_id', conv)
                      setConversationId(conv)
                    }
                  }
                } catch (e) {
                  // ignore non-json
                }
              }
            }
          }
        }

        if (fullContent && messageAdded) {
          setMessages(prev => {
            const updated = [...prev]
            if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
              updated[updated.length - 1] = { role: 'assistant', content: fullContent, citations }
            }
            return updated
          })
        }
      } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ Stream error: ' + String(e) }])
      }
    }

    setInput('')
    setIsLoading(false)
  }

  const submitIngest = async () => {
    if (!ingestUrl.trim()) return
    setIngestLoading(true)
    setIngestStatus('Submitting...')
    try {
      const res = await fetch(`${API_BASE}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: ingestUrl })
      })
      const j = await res.json()
      setIngestStatus(`✓ Job queued: ${j.job_id || 'unknown'}`)
      setIngestUrl('')
      setTimeout(() => setIngestStatus(''), 3000)
    } catch (e) {
      setIngestStatus('❌ Error: ' + String(e))
    } finally {
      setIngestLoading(false)
    }
  }

  // quick helper: push a suggestion into input and send
  const useSuggestion = (s: string) => {
    setInput(s)
    setTimeout(() => sendMessage(), 90)
  }

  // --- render: rebuilt UI inspired by EXAMPLE_UI.html but Tailwind/React-friendly ---
  return (
  <div className="h-screen flex flex-col overflow-hidden text-slate-100" style={{ background: '#141E30', backgroundImage: 'linear-gradient(to right, #243B55, #141E30)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header */}
        <header className="pt-8 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white" style={{fontFamily: 'Poppins, ui-sans-serif'}}>
                Agentic Q&A
              </h1>
              <p className="mt-1 text-lg text-slate-400">Ask questions about your docs and get instant AI answers</p>
            </div>
            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-2 p-2 rounded-md bg-slate-800/60 hover:bg-slate-800/70 border border-white/6">
                    <Link className="w-5 h-5 text-slate-300" />
                    <span className="text-sm text-slate-300">Ingest</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-white">
                  <DialogTitle className="text-lg font-semibold text-white mb-2">Ingest Documentation</DialogTitle>
                  <div className="space-y-3">
                    <Input
                      placeholder="https://docs.example.com"
                      value={ingestUrl}
                      onChange={(e: any) => setIngestUrl(e.target.value)}
                      onKeyDown={(e: any) => e.key === 'Enter' && submitIngest()}
                      className="bg-transparent border border-white/20 text-white placeholder:text-slate-400"
                    />
                    <button onClick={submitIngest} disabled={ingestLoading} className="w-full px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white">
                      {ingestLoading ? 'Submitting...' : 'Ingest URL'}
                    </button>
                    {ingestStatus && <div className="text-sm text-slate-300">{ingestStatus}</div>}
                  </div>
                </DialogContent>
              </Dialog>

              {/* top-right icon removed as requested */}
            </div>
          </div>

          {/* suggestions */}
          <div className="mt-8">
            <ul className="flex gap-3 overflow-x-auto py-2">
              {SUGGESTIONS.map((s, idx) => (
                <li key={idx} className="flex-shrink-0">
                  <button onClick={() => useSuggestion(s)} className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-left">
                    <div className="text-sm text-slate-200 font-medium">{s}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </header>
      </div>

      {/* Chat area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-40 flex-1 overflow-hidden w-full flex flex-col">
        <div ref={messagesRef} className="space-y-6 overflow-y-auto py-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex-1 min-h-0">
          {messages.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-800/50 mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-slate-300" />
              </div>
              <h2 className="text-2xl text-white font-semibold mb-2">Start a conversation</h2>
              <p>Try asking about your documentation or click a suggestion above.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className="flex items-end gap-3">
                  {m.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <Glasses className="w-4 h-4 text-slate-200" />
                    </div>
                  )}
                  <div className={`${m.role === 'user' ? 'bg-slate-800 text-white' : 'bg-slate-800/70 text-slate-100'} rounded-2xl p-4`}> 
                    <div className="prose prose-sm max-w-none text-slate-100 whitespace-pre-wrap">{m.content}</div>
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-2 text-xs text-slate-400">
                        <div className="font-medium mb-1">Sources</div>
                        <div className="flex flex-col gap-1">
                          {m.citations.map((c: any, j: number) => (
                            <a key={j} href={c.source} target="_blank" rel="noopener noreferrer" className="truncate underline text-slate-300 hover:text-white">{c.source}</a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" fill="currentColor" />
                        <path d="M4 20c0-3.31 4.03-6 8-6s8 2.69 8 6v1H4v-1z" fill="currentColor" opacity="0.85" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-slate-800/60">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '120ms' }}></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '240ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Composer - fixed to bottom, responsive */}
      <div className="fixed inset-x-0 bottom-4 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-3 flex items-center gap-3">
            <Input
              placeholder="Ask about your docs — press Enter to send"
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              onKeyDown={(e: any) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading}
              className="flex-1 bg-transparent border border-transparent focus:border-white/20 caret-white selection:bg-white/10 selection:text-white text-white placeholder:text-slate-500 focus:outline-none transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                aria-pressed={streaming}
                title={streaming ? 'Streaming ON' : 'Streaming OFF'}
                onClick={() => setStreaming(!streaming)}
                className={`flex items-center gap-2 px-3 py-1 rounded-md border border-white/6 ${streaming ? 'bg-black text-white' : 'bg-slate-800/60 hover:bg-slate-800/70 text-slate-300'}`}
              >
                <Glasses className="w-4 h-4" />
                <span className="text-sm">{streaming ? 'Streaming' : 'Stream'}</span>
              </button>
              <button onClick={sendMessage} disabled={!input.trim() || isLoading} className="px-4 py-2 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white">
                <Send className="w-4 h-4 inline-block mr-2" /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    )
}
