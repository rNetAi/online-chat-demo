import { useState, useEffect, useCallback } from 'react'
import AriaLayout from './AriaLayout.jsx'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
const MODEL_ID = 'gemini-2.5-flash-lite'
const EMPTY_MESSAGES = []

// ---- Helpers ----
function genId() { return Math.random().toString(36).slice(2, 9) }

function chatTitle(content) {
  return content.length > 40 ? content.slice(0, 40) + '…' : content
}

function extractText(obj) {
  if (typeof obj === 'string') return obj
  if (obj?.choices?.[0]?.delta?.content) return obj.choices[0].delta.content
  if (obj?.choices?.[0]?.message?.content) return obj.choices[0].message.content
  if (obj?.choices?.[0]?.text) return obj.choices[0].text
  const parts = obj?.candidates?.[0]?.content?.parts
  if (Array.isArray(parts)) {
    const text = parts.map(p => p?.text || '').join('')
    if (text) return text
  }
  if (obj?.text) return obj.text
  if (typeof obj?.content === 'string') return obj.content
  return ''
}

// Turns a failed request into a message a user can act on.
function friendlyError(status, message = '') {
  const code = Number(/Request failed: (\d{3})/.exec(message)?.[1]) || status
  if (code === 402) return 'You are out of rNet credits. Top up at rnetai.org to keep chatting.'
  if (code === 401) return 'Your rNet session has expired. Reconnect rNet in Connectors.'
  if (code === 429) return 'Too many requests right now. Please wait a moment and try again.'
  return message || 'Something went wrong. Please try again.'
}

function getInitialUrlState() {
  const params = new URLSearchParams(window.location.search)

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (accessToken) {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('isLoggedIn', 'true')
  }
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken)
  }

  const isUrlLoggedIn = params.has('login_success')
  const isLocalLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  return {
    isLoggedIn: isUrlLoggedIn || isLocalLoggedIn,
    justConnected: isUrlLoggedIn,
    error: params.has('error') ? params.get('error') : null,
    shouldCleanUrl: params.has('login_success') || params.has('access_token') || params.has('error'),
  }
}

function createdAtFromEvent(event) {
  return event?.timeStamp ? performance.timeOrigin + event.timeStamp : performance.timeOrigin
}

// Tokens live on the backend; requests are not credentialed, so the backend's
// default CORS policy (Access-Control-Allow-Origin: *) accepts them.
function authHeaders() {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---- Main App ----
export default function App() {
  const [initialUrlState] = useState(getInitialUrlState)
  const [isLoggedIn, setIsLoggedIn] = useState(initialUrlState.isLoggedIn)
  const [activeNav, setActiveNav] = useState(initialUrlState.justConnected ? 'connectors' : 'home')
  const [toast, setToast] = useState(null)
  const [chats, setChats] = useState([])        // [{id, title, messages, createdAt}]
  const [activeChatId, setActiveChatId] = useState(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(initialUrlState.error)
  const [userInfo, setUserInfo] = useState(null)

  const activeChat = chats.find(c => c.id === activeChatId) || null
  const messages = activeChat?.messages || EMPTY_MESSAGES

  useEffect(() => {
    if (initialUrlState.shouldCleanUrl) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [initialUrlState.shouldCleanUrl])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!isLoggedIn) return

    let ignore = false

    async function loadUserInfo() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/userinfo`, {
          headers: authHeaders(),
        })
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load user info')
        }
        if (!ignore) {
          setUserInfo(data.data)
          localStorage.setItem('isLoggedIn', 'true')
          if (initialUrlState.justConnected) setToast('rNet connected')
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load user info:', err)
          setIsLoggedIn(false)
          localStorage.removeItem('isLoggedIn')
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      }
    }

    loadUserInfo()

    return () => {
      ignore = true
    }
  }, [isLoggedIn, initialUrlState.justConnected])

  const startNewChat = useCallback(() => {
    setActiveChatId(null)
    setInput('')
    setError(null)
    setActiveNav('home')
  }, [])

  const openChat = useCallback((id) => {
    setActiveChatId(id)
    setError(null)
    setActiveNav('home')
  }, [])

  const updateChat = useCallback((chatId, updater) => {
    setChats(prev => prev.map(c => c.id === chatId ? updater(c) : c))
  }, [])

  const disconnect = useCallback(() => {
    setIsLoggedIn(false)
    setChats([])
    setActiveChatId(null)
    setUserInfo(null)
    setError(null)
    setActiveNav('connectors')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }, [])

  const handleSend = async (text, event) => {
    const content = (text || input).trim()
    if (!content || isLoading) return

    // Create or use existing chat
    let chatId = activeChatId
    if (!chatId) {
      const id = genId()
      const chat = { id, title: chatTitle(content), messages: [], createdAt: createdAtFromEvent(event) }
      setChats(prev => [chat, ...prev])
      setActiveChatId(id)
      chatId = id
    }

    const newMessages = [...messages, { role: 'user', content }]
    updateChat(chatId, c => ({ ...c, messages: newMessages }))
    setInput('')
    setIsLoading(true)
    setError(null)

    const payload = { model: MODEL_ID, messages: newMessages }

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) {
        throw new Error(friendlyError(response.status, data.error))
      }
      // The backend may answer with { success, data } or { aiResponse }
      const result = data.data ?? data.aiResponse
      const reply = extractText(result)
      if (!reply) throw new Error('Aria did not get a reply. Please try again.')
      updateChat(chatId, c => ({ ...c, messages: [...newMessages, { role: 'assistant', content: reply }] }))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AriaLayout
      loginUrl={`${BACKEND_URL}/login`}
      isLoggedIn={isLoggedIn}
      userInfo={userInfo}
      activeNav={activeNav}
      onNavigate={setActiveNav}
      toast={toast}
      chats={chats}
      activeChat={activeChat}
      messages={messages}
      input={input}
      onInputChange={setInput}
      isLoading={isLoading}
      error={error}
      onDismissError={() => setError(null)}
      onSend={handleSend}
      onNewChat={startNewChat}
      onOpenChat={openChat}
      onDisconnect={disconnect}
    />
  )
}
