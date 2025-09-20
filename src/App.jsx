import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  /* -------- Theme (dark default to match your screen) -------- */
  const initialTheme =
    localStorage.getItem("theme") ||
    ("matchMedia" in window && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark");
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme !== "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  /* -------- Tabs -------- */
  const [activeTab, setActiveTab] = useState("plan");

  /* -------- Floating Chat Widget -------- */
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", text: "💬 What can I help you with?" },
  ]);
  const msgEndRef = useRef(null);
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  function sendChatMessage(e) {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "bot", text: "Got it! (Stub reply)" },
    ]);
    setChatInput("");
  }

  /* -------- Tutor Tab Local Chat (editable) -------- */
  const [tutorInput, setTutorInput] = useState("");
  const [tutorLog, setTutorLog] = useState(["💬 What can I help you with?"]);
  function handleTutorSend(e) {
    e.preventDefault();
    const t = tutorInput.trim();
    if (!t) return;
    setTutorLog((l) => [...l, `You: ${t}`, "Assistant: Got it! (Stub reply)"]);
    setTutorInput("");
  }

  return (
    <>
      {/* Centered page */}
      <div className="page">
        <div className="App">
          {/* Header */}
          <header className="header">
            <h1 className="title">📚 Study Assistant</h1>
            <p className="subtitle">
              Adaptive schedules • Progress tracking • Tutor (MVP)
            </p>
            <button
              className="btn"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            >
              Toggle Theme ({theme})
            </button>
          </header>

          {/* Tabs */}
          <nav className="nav">
            <button
              className={`tab ${activeTab === "plan" ? "active" : ""}`}
              onClick={() => setActiveTab("plan")}
            >
              Plan
            </button>
            <button
              className={`tab ${activeTab === "subjects" ? "active" : ""}`}
              onClick={() => setActiveTab("subjects")}
            >
              Subjects
            </button>
            <button
              className={`tab ${activeTab === "tutor" ? "active" : ""}`}
              onClick={() => setActiveTab("tutor")}
            >
              Tutor
            </button>
            <button
              className={`tab ${activeTab === "progress" ? "active" : ""}`}
              onClick={() => setActiveTab("progress")}
            >
              Progress
            </button>
          </nav>

          {/* Content */}
          <section className="card content">
            {activeTab === "plan" && (
              <>
                <h2>Study Plan</h2>
                <p>Your schedule will adapt as you log study hours.</p>
              </>
            )}

            {activeTab === "subjects" && (
              <>
                <h2>Subjects</h2>
              </>
            )}

            {activeTab === "tutor" && (
              <>
                <h2>Tutor</h2>
                <p className="muted">Ask anything below.</p>

                <div
                  style={{
                    textAlign: "left",
                    margin: "12px 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {tutorLog.map((line, idx) => (
                    <div key={idx} className="muted" style={{ color: "inherit" }}>
                      {line}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleTutorSend}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input
                    type="text"
                    placeholder="Ask something…"
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    aria-label="Tutor message"
                  />
                  <button className="btn brand" type="submit">
                    Send
                  </button>
                </form>
              </>
            )}

            {activeTab === "progress" && (
              <>
                <h2>Progress</h2>
                <div className="progress">
                  <span style={{ width: "42%" }} />
                </div>
                <p className="muted">Example progress bar.</p>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Floating Chat Launcher */}
      <button
        className="chat-launcher"
        aria-label="Open chat"
        onClick={() => setChatOpen((o) => !o)}
        title={chatOpen ? "Close chat" : "Chat"}
      >
        {chatOpen ? "×" : "💬"}
      </button>

      {/* Floating Chat Window */}
      {chatOpen && (
        <div className="chat-window" role="dialog" aria-label="AI chat">
          <div className="chat-header">
            <span>Study Assistant</span>
            <button
              onClick={() => setChatOpen(false)}
              style={{
                background: "transparent",
                color: "#fff",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === "bot" ? "bot" : "user"}`}>
                {m.text}
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>

          <form className="chat-input" onSubmit={sendChatMessage}>
            <input
              type="text"
              placeholder="Type a message…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              aria-label="Chat message"
            />
            <button className="chat-send" type="submit">
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
