import { useEffect, useRef } from 'react'
import { renderContent } from './markdown.jsx'
import './AriaLayout.css'

const MODEL_LABEL = 'Gemini 2.5 Flash Lite'
const RNET_WALLET_URL = 'https://www.rnetai.org/user-home'

const SUGGESTIONS = [
  'Draft a short launch announcement',
  'Explain RAG in two sentences',
  'Write a Python function to dedupe a list',
  'Summarize the key points of a pitch',
]

const RNET_PERMISSIONS = [
  'View your rNet profile - name and email',
  'Use your rNet credits to run AI models',
]

// ---- Brand marks ----

const AriaMark = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="white" aria-hidden="true">
    <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" />
  </svg>
)

// rNet brand mark, cropped to its visible bounds so it centres inside a tile
const RNetLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 62 62" aria-hidden="true">
    <rect x="0" y="0" width="52" height="52" rx="13" fill="#0F6E56" />
    <rect x="5" y="5" width="52" height="52" rx="13" fill="#1D9E75" opacity="0.5" />
    <rect x="10" y="10" width="52" height="52" rx="13" fill="#1D9E75" />
    <text x="36" y="45" textAnchor="middle" fontSize="26" fontWeight="600" fill="white"
      fontFamily="Inter, -apple-system, 'Segoe UI', Arial, sans-serif">r</text>
  </svg>
)

// ---- Icons ----

const Svg = ({ size = 16, width = 1.8, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const IcHome = () => (
  <Svg><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Svg>
)
const IcHistory = () => (
  <Svg><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.37" /><polyline points="12 7 12 12 16 14" /></Svg>
)
const IcAccount = () => (
  <Svg><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Svg>
)
const IcConnectors = () => (
  <Svg>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Svg>
)
const IcSettings = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
)
const IcPlus = () => <Svg size={15} width={2.2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>
const IcSend = () => <Svg size={16} width={2.2}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></Svg>
const IcChat = () => <Svg size={15}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>
const IcCheck = () => <Svg size={14} width={2.4}><polyline points="20 6 9 17 4 12" /></Svg>
const IcLock = () => <Svg size={13} width={2}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>
const IcAlert = () => <Svg size={16} width={2}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Svg>
const IcClose = () => <Svg size={14} width={2.2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>
const IcExternal = () => <Svg size={13} width={2}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></Svg>

const IcVerified = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#10a37f" aria-label="Verified">
    <path d="M12 1l2.6 2.2 3.4-.4.9 3.3 3 1.7-1.2 3.2 1.2 3.2-3 1.7-.9 3.3-3.4-.4L12 23l-2.6-2.2-3.4.4-.9-3.3-3-1.7L3.3 13 2.1 9.8l3-1.7.9-3.3 3.4.4z" />
    <polyline points="8 12.5 11 15.5 16.5 9.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const NAV_ITEMS = [
  { id: 'home',       label: 'Home',       Icon: IcHome },
  { id: 'history',    label: 'History',    Icon: IcHistory },
  { id: 'account',    label: 'Account',    Icon: IcAccount },
  { id: 'connectors', label: 'Connectors', Icon: IcConnectors },
]

// ---- Helpers ----

function displayName(userInfo) {
  return userInfo?.name || userInfo?.preferred_username || userInfo?.email || 'rNet user'
}

function initialOf(userInfo) {
  return displayName(userInfo).trim().charAt(0).toUpperCase() || 'U'
}

function formatTime(date) {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ---- Root layout ----

export default function AriaLayout(props) {
  const { isLoggedIn, userInfo, activeNav, onNavigate, toast, onNewChat } = props

  return (
    <div className="pd-layout">
      <aside className="pd-sidebar">
        <div className="pd-sidebar-inner">
          <div className="pd-brand">
            <div className="pd-brand-icon"><AriaMark size={14} /></div>
            <span className="pd-brand-name">Aria</span>
          </div>

          {isLoggedIn && (
            <button type="button" className="pd-new-chat" onClick={onNewChat}>
              <IcPlus /> <span className="pd-nav-label">New chat</span>
            </button>
          )}

          <nav className="pd-nav" aria-label="Main navigation">
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                id={`pd-nav-${id}`}
                className={`pd-nav-item${activeNav === id ? ' pd-nav-item--active' : ''}`}
                onClick={() => onNavigate(id)}
                aria-current={activeNav === id ? 'page' : undefined}
                title={label}
              >
                <span className="pd-nav-icon"><Icon /></span>
                <span className="pd-nav-label">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="pd-sidebar-footer">
          <button
            type="button"
            id="pd-nav-settings"
            className={`pd-nav-item${activeNav === 'settings' ? ' pd-nav-item--active' : ''}`}
            onClick={() => onNavigate('settings')}
            aria-current={activeNav === 'settings' ? 'page' : undefined}
            title="Settings"
          >
            <span className="pd-nav-icon"><IcSettings /></span>
            <span className="pd-nav-label">Settings</span>
          </button>

          {isLoggedIn && (
            <button type="button" className="pd-user-chip" onClick={() => onNavigate('account')} title="Account">
              <span className="pd-avatar">{initialOf(userInfo)}</span>
              <span className="pd-user-chip-text">
                <span className="pd-user-chip-name">{userInfo ? displayName(userInfo) : 'Loading…'}</span>
                <span className="pd-user-chip-meta"><span className="pd-dot pd-dot--on" /> rNet connected</span>
              </span>
            </button>
          )}
        </div>
      </aside>

      <main className="pd-main">
        <MainView {...props} />
      </main>

      {toast && (
        <div className="pd-toast" role="status">
          <span className="pd-toast-icon"><IcCheck /></span>
          {toast}
        </div>
      )}
    </div>
  )
}

function MainView(props) {
  const { activeNav, isLoggedIn, loginUrl, onNavigate } = props
  switch (activeNav) {
    case 'connectors':
      return <ConnectorsView {...props} />
    case 'history':
      return isLoggedIn ? <HistoryView {...props} /> : <ConnectPrompt loginUrl={loginUrl} onNavigate={onNavigate} />
    case 'account':
      return isLoggedIn ? <AccountView {...props} /> : <ConnectPrompt loginUrl={loginUrl} onNavigate={onNavigate} />
    case 'settings':
      return <SettingsView />
    default:
      return isLoggedIn ? <ChatView {...props} /> : <ConnectPrompt loginUrl={loginUrl} onNavigate={onNavigate} />
  }
}

// ---- Not connected ----

function ConnectPrompt({ loginUrl, onNavigate }) {
  return (
    <div className="pd-home">
      <div className="pd-hero">
        <div className="pd-hero-icon"><AriaMark size={30} /></div>
        <h1 className="pd-hero-title">Aria</h1>
        <p className="pd-hero-subtitle">Your intelligent AI assistant.</p>
      </div>

      <div className="pd-signin-card">
        <div className="pd-signin-link">
          <span className="pd-signin-tile pd-signin-tile--aria"><AriaMark size={16} /></span>
          <span className="pd-signin-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="pd-signin-tile"><RNetLogo size={30} /></span>
        </div>
        <div className="pd-signin-copy">
          <p className="pd-signin-title">Connect rNet to start chatting</p>
          <p className="pd-signin-hint">Aria runs on your rNet credits. No API keys, no subscription.</p>
        </div>
        <a id="pd-signin-btn" href={loginUrl} className="pd-btn-primary">Continue with rNet</a>
        <button type="button" className="pd-link-btn" onClick={() => onNavigate('connectors')}>
          View all connectors
        </button>
      </div>
    </div>
  )
}

// ---- Connectors ----

function ConnectorsView({ loginUrl, isLoggedIn, userInfo, onDisconnect, onNavigate }) {
  return (
    <div className="pd-page">
      <div className="pd-page-inner">
        <header className="pd-page-header">
          <h2 className="pd-page-title">Connectors</h2>
          <p className="pd-page-subtitle">Connect external accounts to power Aria's AI capabilities.</p>
        </header>

        <div className="pd-section-label">
          {isLoggedIn ? 'Connected' : 'Available'} <span className="pd-section-count">1</span>
        </div>

        <article className={`pd-connector-card${isLoggedIn ? ' pd-connector-card--on' : ''}`}>
          <div className="pd-connector-card-top">
            <div className="pd-connector-icon"><RNetLogo size={34} /></div>
            <div className="pd-connector-info">
              <div className="pd-connector-name-row">
                <span className="pd-connector-name">rNet</span>
                <IcVerified />
              </div>
              <div className="pd-connector-meta">AI Credits Provider</div>
            </div>
            <span className={`pd-connector-status${isLoggedIn ? ' pd-connector-status--on' : ''}`}>
              <span className={`pd-dot${isLoggedIn ? ' pd-dot--on' : ''}`} />
              {isLoggedIn ? 'Connected' : 'Not connected'}
            </span>
          </div>

          {isLoggedIn ? (
            <div className="pd-connected-account">
              <span className="pd-avatar pd-avatar--lg">{initialOf(userInfo)}</span>
              <div className="pd-connected-text">
                <span className="pd-connected-label">Signed in as</span>
                <span className="pd-connected-name">
                  {userInfo ? displayName(userInfo) : 'Loading…'}
                  {userInfo?.email && <span className="pd-connected-email"> · {userInfo.email}</span>}
                </span>
              </div>
            </div>
          ) : (
            <p className="pd-connector-desc">
              Sign in with your rNet account and let Aria use your existing rNet credit
              balance to run AI models. No API keys, no separate billing.
            </p>
          )}

          <div className="pd-connector-perms">
            <div className="pd-perms-title">{isLoggedIn ? 'Aria can' : 'Aria will be able to'}</div>
            <ul className="pd-perms-list">
              {RNET_PERMISSIONS.map(p => (
                <li key={p} className="pd-perms-item">
                  <span className="pd-perms-check"><IcCheck /></span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="pd-connector-card-footer">
            <span className="pd-connector-note">
              <IcLock />
              Secured with OAuth 2.0 + PKCE · Disconnect anytime
            </span>
            {isLoggedIn ? (
              <div className="pd-btn-row">
                <button type="button" className="pd-btn-ghost pd-btn-sm" onClick={onDisconnect}>Disconnect</button>
                <button type="button" className="pd-btn-dark pd-btn-sm" onClick={() => onNavigate('home')}>Start chatting</button>
              </div>
            ) : (
              <a id="pd-connect-rnet-btn" href={loginUrl} className="pd-btn-primary pd-btn-sm">Connect</a>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}

// ---- Chat ----

function ChatView({ activeChat, messages, input, onInputChange, isLoading, error, onDismissError, onSend, onNewChat }) {
  const endRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [input])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [activeChat?.id])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend(undefined, e)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="pd-chat">
      <header className="pd-chat-topbar">
        <h2 className="pd-chat-title">{activeChat?.title || 'New chat'}</h2>
        <div className="pd-chat-topbar-right">
          <span className="pd-model-pill"><span className="pd-dot pd-dot--on" />{MODEL_LABEL}</span>
          {!isEmpty && (
            <button type="button" className="pd-icon-btn" onClick={onNewChat} title="New chat" aria-label="New chat">
              <IcPlus />
            </button>
          )}
        </div>
      </header>

      <div className="pd-chat-scroll">
        {isEmpty ? (
          <div className="pd-chat-empty">
            <div className="pd-hero-icon pd-hero-icon--sm"><AriaMark size={22} /></div>
            <h1 className="pd-chat-empty-title">How can I help you today?</h1>
            <p className="pd-chat-empty-sub">Ask anything: writing, code, research or a quick question.</p>
            <div className="pd-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} type="button" className="pd-suggestion" onClick={(e) => onSend(s, e)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pd-messages">
            {messages.map((msg, idx) => (
              msg.role === 'user' ? (
                <div key={idx} className="pd-msg pd-msg--user">
                  <div className="pd-msg-bubble">{msg.content}</div>
                </div>
              ) : (
                <div key={idx} className="pd-msg pd-msg--assistant">
                  <span className="pd-msg-avatar"><AriaMark size={12} /></span>
                  <div className="pd-msg-body">
                    <div className="pd-msg-name">Aria</div>
                    <div className="pd-msg-content">{renderContent(msg.content)}</div>
                  </div>
                </div>
              )
            ))}
            {isLoading && (
              <div className="pd-msg pd-msg--assistant">
                <span className="pd-msg-avatar"><AriaMark size={12} /></span>
                <div className="pd-msg-body">
                  <div className="pd-msg-name">Aria</div>
                  <div className="pd-typing" aria-label="Aria is thinking"><i /><i /><i /></div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="pd-composer-wrap">
        {error && (
          <div className="pd-error" role="alert">
            <span className="pd-error-icon"><IcAlert /></span>
            <span className="pd-error-text">{error}</span>
            <button type="button" className="pd-error-close" onClick={onDismissError} aria-label="Dismiss"><IcClose /></button>
          </div>
        )}
        <div className="pd-composer">
          <textarea
            ref={textareaRef}
            className="pd-composer-input"
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Aria…"
            aria-label="Message Aria"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="button"
            className="pd-send"
            onClick={(e) => onSend(undefined, e)}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            title="Send"
          >
            <IcSend />
          </button>
        </div>
        <p className="pd-composer-note">
          <span className="pd-composer-rnet"><RNetLogo size={14} /></span>
          Paid with your rNet credits
        </p>
      </div>
    </div>
  )
}

// ---- History ----

function HistoryView({ chats, onOpenChat, onNewChat }) {
  return (
    <div className="pd-page">
      <div className="pd-page-inner">
        <header className="pd-page-header">
          <h2 className="pd-page-title">History</h2>
          <p className="pd-page-subtitle">Your conversations from this session.</p>
        </header>

        {chats.length === 0 ? (
          <div className="pd-empty-card">
            <span className="pd-empty-icon"><IcChat /></span>
            <p className="pd-empty-title">No chats yet</p>
            <p className="pd-empty-sub">Start a conversation and it will show up here.</p>
            <button type="button" className="pd-btn-dark pd-btn-sm" onClick={onNewChat}>New chat</button>
          </div>
        ) : (
          <ul className="pd-history-list">
            {chats.map(chat => (
              <li key={chat.id}>
                <button type="button" className="pd-history-item" onClick={() => onOpenChat(chat.id)}>
                  <span className="pd-history-icon"><IcChat /></span>
                  <span className="pd-history-title">{chat.title}</span>
                  <span className="pd-history-meta">{chat.messages.length} messages · {formatTime(chat.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---- Account ----

function AccountView({ userInfo, onDisconnect }) {
  return (
    <div className="pd-page">
      <div className="pd-page-inner">
        <header className="pd-page-header">
          <h2 className="pd-page-title">Account</h2>
          <p className="pd-page-subtitle">Your profile comes from your rNet account.</p>
        </header>

        <section className="pd-card">
          <div className="pd-profile">
            <span className="pd-avatar pd-avatar--xl">{initialOf(userInfo)}</span>
            <div>
              <div className="pd-profile-name">{userInfo ? displayName(userInfo) : 'Loading…'}</div>
              {userInfo?.email && <div className="pd-profile-email">{userInfo.email}</div>}
            </div>
          </div>

          <dl className="pd-rows">
            <div className="pd-row">
              <dt>Sign-in</dt>
              <dd><span className="pd-inline-rnet"><RNetLogo size={16} /></span> Connect with rNet</dd>
            </div>
            <div className="pd-row">
              <dt>Billing</dt>
              <dd>AI usage is paid from your rNet credits</dd>
            </div>
            <div className="pd-row">
              <dt>Credits</dt>
              <dd>
                <a className="pd-text-link" href={RNET_WALLET_URL} target="_blank" rel="noopener noreferrer">
                  Manage in your rNet Credit Wallet <IcExternal />
                </a>
              </dd>
            </div>
          </dl>

          <div className="pd-card-footer">
            <button type="button" className="pd-btn-ghost pd-btn-sm" onClick={onDisconnect}>Disconnect rNet</button>
          </div>
        </section>
      </div>
    </div>
  )
}

// ---- Settings ----

function SettingsView() {
  return (
    <div className="pd-page">
      <div className="pd-page-inner">
        <header className="pd-page-header">
          <h2 className="pd-page-title">Settings</h2>
          <p className="pd-page-subtitle">Preferences for how Aria works.</p>
        </header>

        <section className="pd-card">
          <dl className="pd-rows pd-rows--flush">
            <div className="pd-row">
              <dt>Model</dt>
              <dd>{MODEL_LABEL}</dd>
            </div>
            <div className="pd-row">
              <dt>Appearance</dt>
              <dd>Light</dd>
            </div>
            <div className="pd-row">
              <dt>Data</dt>
              <dd>Chats stay in this browser session</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
