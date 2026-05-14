import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

// ---- Icons (inline SVG) ----
const IconPlus = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
const IconChat = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
const IconLogout = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
const IconSend = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
const IconRnet = () => <span style={{ fontWeight: 700, fontSize: 13 }}>R</span>
const IconSparkle = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>

// ---- Helpers ----
function genId() { return Math.random().toString(36).slice(2, 9) }
function formatTime(date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function extractText(obj) {
  if (typeof obj === 'string') return obj
  if (obj?.choices?.[0]?.delta?.content) return obj.choices[0].delta.content
  if (obj?.choices?.[0]?.message?.content) return obj.choices[0].message.content
  if (obj?.choices?.[0]?.text) return obj.choices[0].text
  if (obj?.candidates?.[0]?.content?.parts?.[0]?.text) return obj.candidates[0].content.parts[0].text
  if (obj?.text) return obj.text
  if (obj?.content) return obj.content
  return ''
}

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Write a Python REST API',
  'Help me debug my code',
  'Summarize a long document',
]

// ---- Markdown renderer ----
function renderInline(text) {
  const parts = []
  // Handles **bold**, *italic*, `code`
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0, m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[0].startsWith('**')) {
      parts.push(<strong key={m.index}>{m[0].slice(2, -2)}</strong>)
    } else if (m[0].startsWith('*')) {
      parts.push(<em key={m.index}>{m[0].slice(1, -1)}</em>)
    } else {
      parts.push(<code key={m.index}>{m[0].slice(1, -1)}</code>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function renderContent(text) {
  if (!text) return null

  // 1. Extract fenced code blocks first
  const segments = []
  const codeRe = /```(\w*)\n?([\s\S]*?)```/g
  let cursor = 0, m
  codeRe.lastIndex = 0
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > cursor) segments.push({ type: 'text', content: text.slice(cursor, m.index) })
    segments.push({ type: 'code', lang: m[1] || '', content: m[2] })
    cursor = m.index + m[0].length
  }
  if (cursor < text.length) segments.push({ type: 'text', content: text.slice(cursor) })

  const nodes = []

  segments.forEach((seg, si) => {
    if (seg.type === 'code') {
      nodes.push(
        <div key={`code-${si}`} className="md-code-block">
          {seg.lang && <div className="md-code-lang">{seg.lang}</div>}
          <pre><code>{seg.content.trim()}</code></pre>
        </div>
      )
      return
    }

    // 2. Process text segments line by line
    const lines = seg.content.split('\n')
    let i = 0
    while (i < lines.length) {
      const raw = lines[i]
      const line = raw.trimEnd()

      // Blank line
      if (line.trim() === '') { i++; continue }

      // Heading ## or ###
      const h3 = line.match(/^###\s+(.+)/)
      const h2 = line.match(/^##\s+(.+)/)
      const h1 = line.match(/^#\s+(.+)/)
      if (h3) { nodes.push(<h3 key={`${si}-${i}`} className="md-h3">{renderInline(h3[1])}</h3>); i++; continue }
      if (h2) { nodes.push(<h2 key={`${si}-${i}`} className="md-h2">{renderInline(h2[1])}</h2>); i++; continue }
      if (h1) { nodes.push(<h1 key={`${si}-${i}`} className="md-h1">{renderInline(h1[1])}</h1>); i++; continue }

      // Unordered list (*, -, •)
      if (/^[\*\-•]\s/.test(line)) {
        const items = []
        while (i < lines.length && /^[\*\-•]\s/.test(lines[i].trimEnd())) {
          items.push(<li key={i}>{renderInline(lines[i].replace(/^[\*\-•]\s+/, '').trimEnd())}</li>)
          i++
        }
        nodes.push(<ul key={`${si}-ul-${i}`} className="md-ul">{items}</ul>)
        continue
      }

      // Ordered list (1. 2. etc)
      if (/^\d+\.\s/.test(line)) {
        const items = []
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trimEnd())) {
          items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\.\s+/, '').trimEnd())}</li>)
          i++
        }
        nodes.push(<ol key={`${si}-ol-${i}`} className="md-ol">{items}</ol>)
        continue
      }

      // Paragraph — collect consecutive non-special lines
      const paraLines = []
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^[\*\-•]\s/.test(lines[i]) &&
        !/^\d+\.\s/.test(lines[i]) &&
        !/^#+\s/.test(lines[i])
      ) {
        paraLines.push(lines[i].trimEnd())
        i++
      }
      if (paraLines.length > 0) {
        nodes.push(<p key={`${si}-p-${i}`} className="md-p">{renderInline(paraLines.join(' '))}</p>)
      }
    }
  })

  return nodes
}

// ---- Main App ----
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [chats, setChats] = useState([])        // [{id, title, messages, createdAt}]
  const [activeChatId, setActiveChatId] = useState(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userInfo, setUserInfo] = useState(null)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const activeChat = chats.find(c => c.id === activeChatId) || null
  const messages = activeChat?.messages || []
  const userEmail = userInfo?.email || ''
  const userName = userInfo?.name || userInfo?.preferred_username || 'My Account'
  const avatarText = (userEmail || userName || 'U').trim().charAt(0).toUpperCase()

  // Auto-login detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('login_success')) {
      setIsLoggedIn(true)
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (params.has('error')) {
      setError(params.get('error'))
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      setUserInfo(null)
      return
    }

    let ignore = false

    async function loadUserInfo() {
      try {
        const response = await fetch('http://localhost:3001/api/userinfo')
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load user info')
        }
        if (!ignore) setUserInfo(data.data)
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load user info:', err)
        }
      }
    }

    loadUserInfo()

    return () => {
      ignore = true
    }
  }, [isLoggedIn])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px'
    }
  }, [input])

  const startNewChat = useCallback(() => {
    const id = genId()
    const chat = { id, title: 'New Chat', messages: [], createdAt: Date.now() }
    setChats(prev => [chat, ...prev])
    setActiveChatId(id)
    setError(null)
    textareaRef.current?.focus()
  }, [])

  const updateChat = useCallback((chatId, updater) => {
    setChats(prev => prev.map(c => c.id === chatId ? updater(c) : c))
  }, [])

  const handleSend = async (text) => {
    const content = (text || input).trim()
    if (!content || isLoading) return

    // Create or use existing chat
    let chatId = activeChatId
    if (!chatId) {
      const id = genId()
      const title = content.length > 40 ? content.slice(0, 40) + '…' : content
      const chat = { id, title, messages: [], createdAt: Date.now() }
      setChats(prev => [chat, ...prev])
      setActiveChatId(id)
      chatId = id
    }

    const newMessages = [...messages, { role: 'user', content }]
    updateChat(chatId, c => ({ ...c, messages: newMessages, title: c.title === 'New Chat' ? (content.length > 40 ? content.slice(0, 40) + '…' : content) : c.title }))
    setInput('')
    setIsLoading(true)
    setError(null)

    const payload = { model: 'gemini-2.5-flash-lite', messages: newMessages }

    try {
      const response = await fetch('http://localhost:3001/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'AI call failed')
      const content = extractText(data.data) || JSON.stringify(data.data)
      updateChat(chatId, c => ({ ...c, messages: [...newMessages, { role: 'assistant', content }] }))
    } catch (err) {
      setError(err.message)
      // Remove empty assistant placeholder if stream failed
      updateChat(chatId, c => ({
        ...c,
        messages: c.messages.filter((m, i) => !(i === c.messages.length - 1 && m.role === 'assistant' && !m.content))
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ---- Render: Not logged in ----
  if (!isLoggedIn) {
    return (
      <div className="login-full">
        <div className="login-screen">
          <div className="login-hero">
            <div className="login-hero-icon"><IconRnet /></div>
            <h1 className="login-title">Ai Chat</h1>
            <p className="login-subtitle">Your intelligent assistant.</p>
          </div>
          <div className="login-card">
            <p className="login-card-title">Sign in to continue</p>
            <a href="http://localhost:3001/login" className="login-btn">
              Continue with rNet
            </a>
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</p>}
        </div>
      </div>
    )
  }

  // ---- Render: Logged in ----
  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon"><IconRnet /></div>
            <span className="sidebar-brand-name">rNet Ai Chat</span>
          </div>
          <button className="new-chat-btn" onClick={startNewChat}>
            <IconPlus /> New Chat
          </button>
        </div>

        {chats.length > 0 && (
          <>
            <div className="sidebar-section-title">Recent</div>
            <div className="chat-history">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`chat-history-item ${chat.id === activeChatId ? 'active' : ''}`}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <span className="chat-history-item-icon"><IconChat /></span>
                  <div className="chat-history-item-content">
                    <div className="chat-history-item-title">{chat.title}</div>
                    <div className="chat-history-item-time">{formatTime(chat.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {chats.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <p style={{ fontSize: 13, color: 'var(--sidebar-text-muted)', textAlign: 'center', lineHeight: 1.6 }}>No chats yet.<br />Click "New Chat" to begin.</p>
          </div>
        )}

        <div className="sidebar-footer">
          <div className="user-profile" onClick={() => { setIsLoggedIn(false); setChats([]); setActiveChatId(null); setUserInfo(null) }}>
            <div className="user-avatar">{avatarText}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              {userEmail && <div className="user-email">{userEmail}</div>}
              <div className="user-plan">RNet OAuth</div>
            </div>
            <button className="logout-btn" title="Log out"><IconLogout /></button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="main-area">
        {/* TOP BAR */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="model-badge">
              <span className="model-badge-dot" />
              Gemini 2.5 Flash Lite
            </div>

          </div>
        </div>

        {/* CHAT AREA */}
        <div className="chat-area">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><IconSparkle /></div>
                <div className="empty-state-title">
                  {activeChatId ? 'Start the conversation' : 'How can I help you today?'}
                </div>
                <p className="empty-state-sub">
                  Ask me anything — coding, writing, analysis, or just a quick question.
                </p>
                <div className="suggestions">
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="suggestion-chip" onClick={() => handleSend(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="messages-inner">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message-row ${msg.role}`}>
                    <div className="message-sender-label">
                      {msg.role === 'user' ? 'You' : 'Gemini'}
                    </div>
                    <div className="message-bubble">
                      {msg.role === 'assistant' && !msg.content && isLoading
                        ? <div className="typing-indicator">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                        : renderContent(msg.content)
                      }
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="error-banner">
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span className="error-banner-text">{error}</span>
              <button className="error-dismiss" onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* INPUT */}
          <div className="input-area">
            <div className="input-area-inner">
              <div className="input-wrapper">
                <textarea
                  ref={textareaRef}
                  className="message-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Gemini 2.5 Flash Lite…"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  className="send-btn"
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  title="Send"
                >
                  <IconSend />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
