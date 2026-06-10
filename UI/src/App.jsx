import { useState, useRef, useEffect } from "react";
import { API_URL } from "./config.js";

// One conversation = { id, title, messages: [{ role, text }] }
function newConversation() {
  return { id: crypto.randomUUID(), title: "New chat", messages: [] };
}

export default function App() {
  const [conversations, setConversations] = useState([newConversation()]);
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

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
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
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
            <div className="user-avatar">U</div>
            <div className="user-meta">
              <span className="user-name">User</span>
              <span className="user-sub">Multi-agent backend</span>
            </div>
          </div>
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
              <span className="status-dot" /> Connected · :2424
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
