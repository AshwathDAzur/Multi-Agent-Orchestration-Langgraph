import { useState, useRef, useEffect } from "react";
import { API_CHAT, AUTH_ME, AUTH_LOGIN, AUTH_LOGOUT } from "./config.js";

// One conversation = { id, title, messages: [{ role, text }] }
function newConversation() {
  return { id: crypto.randomUUID(), title: "New chat", messages: [] };
}

export default function App() {
  // auth: "loading" | "in" | "out"
  const [auth, setAuth] = useState("loading");
  const [user, setUser] = useState(null);

  const [conversations, setConversations] = useState([newConversation()]);
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  // Check session on load.
  useEffect(() => {
    fetch(AUTH_ME, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        setAuth("in");
      })
      .catch(() => setAuth("out"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [active?.messages, loading]);

  function updateActive(updater) {
    setConversations((cs) =>
      cs.map((c) => (c.id === activeId ? updater(c) : c))
    );
  }

  function startNewChat() {
    const c = newConversation();
    setConversations((cs) => [c, ...cs]);
    setActiveId(c.id);
    setSidebarOpen(false);
  }

  function selectChat(id) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  async function sendMessage(text) {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;

    // append user msg; set title from first message
    updateActive((c) => ({
      ...c,
      title:
        c.messages.length === 0
          ? prompt.slice(0, 40) + (prompt.length > 40 ? "…" : "")
          : c.title,
      messages: [...c.messages, { role: "user", text: prompt }],
    }));
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // send the session cookie
        body: JSON.stringify({ prompt }),
      });
      if (res.status === 401) {
        setAuth("out"); // session expired — back to login
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      updateActive((c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", text: data.answer }],
      }));
    } catch (err) {
      updateActive((c) => ({
        ...c,
        messages: [
          ...c.messages,
          { role: "error", text: err.message || "Something went wrong." },
        ],
      }));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isEmpty = active.messages.length === 0;

  // ----- Auth gates -----
  if (auth === "loading") {
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="brand-mark big">◆</div>
          <p className="gate-dim">Loading…</p>
        </div>
      </div>
    );
  }

  if (auth === "out") {
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="brand-mark big">◆</div>
          <h1>Chatbot</h1>
          <p className="gate-dim">Sign in to continue to your assistant.</p>
          <a className="gate-btn" href={AUTH_LOGIN}>
            Sign in with Keycloak
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      {/* ===== Sidebar ===== */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">◆</div>
            <span className="brand-name">Chatbot</span>
          </div>
          <button className="new-chat" onClick={startNewChat}>
            <span className="plus">+</span> New chat
          </button>
        </div>

        <div className="convo-list">
          <p className="convo-label">Conversations</p>
          {conversations.map((c) => (
            <button
              key={c.id}
              className={`convo-item ${c.id === activeId ? "active" : ""}`}
              onClick={() => selectChat(c.id)}
              title={c.title}
            >
              <span className="convo-icon">▢</span>
              <span className="convo-title">{c.title}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">
              {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
            </div>
            <div className="user-meta">
              <span className="user-name">
                {user?.name || user?.username || "User"}
              </span>
              <span className="user-sub">{user?.email || "Signed in"}</span>
            </div>
          </div>
          <a className="logout-btn" href={AUTH_LOGOUT}>
            Sign out
          </a>
        </div>
      </aside>

      {/* mobile backdrop */}
      {sidebarOpen && (
        <div className="backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== Main chat ===== */}
      <main className="main">
        <header className="topbar">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="topbar-title">
            <h1>{active.title}</h1>
            <span className="topbar-status">
              <span className="status-dot" /> Connected · secured
            </span>
          </div>
        </header>

        <section className="messages" ref={scrollRef}>
          {isEmpty ? (
            <div className="empty">
              <div className="empty-mark">◆</div>
              <h2>How can I help?</h2>
              <p>Send a message to start the conversation.</p>
              <div className="examples">
                {[
                  "What's 12 times 8?",
                  "What's the weather in Tokyo?",
                  "Add 5 and 7, then divide by 2",
                ].map((s) => (
                  <button key={s} className="example" onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="thread">
              {active.messages.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div className="msg-role">
                    {m.role === "user"
                      ? "You"
                      : m.role === "error"
                      ? "Error"
                      : "Assistant"}
                  </div>
                  <div className="msg-text">{m.text}</div>
                </div>
              ))}
              {loading && (
                <div className="msg assistant">
                  <div className="msg-role">Assistant</div>
                  <div className="msg-text typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="composer">
          <div className="composer-inner">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              placeholder="Send a message…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
          <p className="composer-hint">
            Enter to send · Shift + Enter for a new line
          </p>
        </footer>
      </main>
    </div>
  );
}
