"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "@/components/ChatMessage";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string;
}

const SESSIONS_KEY = "edtech-explore-sessions";
const ACTIVE_KEY = "edtech-explore-active";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function autoName(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const text = first.content.slice(0, 50);
  return text.length < first.content.length ? text + "..." : text;
}

export default function ExplorePage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage
  useEffect(() => {
    const loaded = loadSessions();
    // Migrate old single-session format
    if (loaded.length === 0) {
      try {
        const old = localStorage.getItem("edtech-explore-messages");
        if (old) {
          const msgs = JSON.parse(old);
          if (msgs.length > 0) {
            const migrated: ChatSession = {
              id: generateId(),
              name: autoName(msgs),
              messages: msgs,
              createdAt: new Date().toISOString(),
            };
            loaded.push(migrated);
            localStorage.removeItem("edtech-explore-messages");
          }
        }
      } catch {}
    }
    setSessions(loaded);
    const savedActive = localStorage.getItem(ACTIVE_KEY);
    if (savedActive && loaded.some((s) => s.id === savedActive)) {
      setActiveId(savedActive);
    } else if (loaded.length > 0) {
      setActiveId(loaded[0].id);
    }
    // Collapse sidebar on mobile after hydration
    if (window.innerWidth < 1024) setSidebarOpen(false);
    setHydrated(true);
  }, []);

  // Persist sessions
  useEffect(() => {
    if (hydrated) saveSessions(sessions);
  }, [sessions, hydrated]);

  // Persist active session id
  useEffect(() => {
    if (hydrated && activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId, hydrated]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;
  const messages = activeSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const updateActiveMessages = useCallback(
    (updater: (prev: Message[]) => Message[]) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? { ...s, messages: updater(s.messages), name: s.name === "New chat" ? autoName(updater(s.messages)) : s.name }
            : s
        )
      );
    },
    [activeId]
  );

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: generateId(),
      name: "New chat",
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (activeId === id) {
        setActiveId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const handleRename = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    setRenamingId(id);
    setRenameValue(session.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      setSessions((prev) =>
        prev.map((s) => (s.id === renamingId ? { ...s, name: renameValue.trim() } : s))
      );
    }
    setRenamingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Auto-create a session if none exists
    if (!activeId) {
      const newSession: ChatSession = {
        id: generateId(),
        name: "New chat",
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setSessions([newSession]);
      setActiveId(newSession.id);
      // Need to wait for state to settle, so handle inline
      const userMessage = input.trim();
      setInput("");
      newSession.messages = [{ role: "user", content: userMessage }];
      newSession.name = autoName(newSession.messages);
      setSessions([newSession]);
      setLoading(true);
      await streamResponse(userMessage, newSession.id);
      return;
    }

    const userMessage = input.trim();
    setInput("");
    updateActiveMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    await streamResponse(userMessage, activeId);
  };

  const streamResponse = async (userMessage: string, sessionId: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: userMessage, mode: "all" }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response");

      const decoder = new TextDecoder();
      let text = "";
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, { role: "assistant", content: "" }] }
            : s
        )
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const captured = text;
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            const updated = [...s.messages];
            updated[updated.length - 1] = { role: "assistant", content: captured };
            return { ...s, messages: updated };
          })
        );
      }
    } catch {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            messages: [...s.messages, { role: "assistant", content: "Something went wrong. Please try again." }],
          };
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (messages.length === 0) return;
    const { exportChatToDocx } = await import("@/lib/export-chat");
    await exportChatToDocx(messages);
  };

  const suggestions = [
    "What evidence exists on mobile learning for girls in Africa?",
    "How effective is digital personalized learning in LMICs?",
    "What are the main challenges for EdTech in emergencies?",
    "Compare approaches to teacher training with technology",
  ];

  return (
    <div className="explorer-view flex" style={{ height: "calc(100vh - 57px)" }}>
      {/* Session sidebar */}
      <div
        className="shrink-0 flex flex-col transition-all overflow-hidden"
        style={{
          width: sidebarOpen ? 260 : 0,
          background: "white",
          borderRight: sidebarOpen ? "1px solid rgba(0,0,0,0.08)" : "none",
        }}
      >
        <div className="px-3 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <span className="text-xs font-semibold" style={{ color: "#11181C" }}>Chat Sessions</span>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors hover:bg-black/[0.04]"
            style={{ color: "#DC3900" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {sessions.length === 0 && (
            <p className="text-[10px] text-center py-6" style={{ color: "#A1A1AA" }}>
              No conversations yet
            </p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className="group relative"
            >
              {renamingId === session.id ? (
                <div className="px-3 py-2">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                    className="w-full text-xs px-2 py-1 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#DC3900]/40"
                    style={{ border: "1px solid rgba(0,0,0,0.15)", color: "#11181C" }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setActiveId(session.id)}
                  className="w-full text-left px-3 py-2.5 transition-colors"
                  style={{
                    background: activeId === session.id ? "rgba(220,57,0,0.06)" : "transparent",
                    borderLeft: activeId === session.id ? "2px solid #DC3900" : "2px solid transparent",
                  }}
                >
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: activeId === session.id ? "#DC3900" : "#11181C" }}
                  >
                    {session.name}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#A1A1AA" }}>
                    {session.messages.length} messages · {new Date(session.createdAt).toLocaleDateString()}
                  </p>

                  {/* Hover actions */}
                  <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                    <span
                      onClick={(e) => { e.stopPropagation(); handleRename(session.id); }}
                      className="w-5 h-5 rounded flex items-center justify-center cursor-pointer hover:bg-black/[0.06]"
                      title="Rename"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                      className="w-5 h-5 rounded flex items-center justify-center cursor-pointer hover:bg-red-50"
                      title="Delete"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC3900" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </span>
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ background: "white", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/[0.04] transition-colors"
              title={sidebarOpen ? "Hide sessions" : "Show sessions"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            <span
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] text-white font-bold"
              style={{ background: "#DC3900" }}
            >
              AI
            </span>
            <h1 className="font-semibold text-sm" style={{ color: "#11181C" }}>
              {activeSession?.name || "Repository Explorer"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors hover:bg-black/[0.03]"
                  style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#71717A" }}
                  title="Export to Word"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export .docx
                </button>
              </>
            )}
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors hover:bg-black/[0.03]"
              style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#71717A" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New chat
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-lg">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(220,57,0,0.1)" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC3900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "#11181C" }}>
                  Ask the Evidence
                </h2>
                <p className="text-sm mb-6" style={{ color: "#71717A" }}>
                  Synthesize insights across all 50 documents in the evidence library.
                  The AI will cite which documents support each point.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-xs px-3 py-2 rounded-lg text-left transition-colors hover:shadow-sm"
                      style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#71717A" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[70%] px-5 py-3 rounded-2xl text-sm leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "#DC3900", color: "white" }
                    : { background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#11181C" }
                }
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-medium" style={{ color: "#DC3900" }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center text-[10px] text-white font-bold" style={{ background: "#DC3900" }}>AI</span>
                    Repository Explorer
                  </div>
                )}
                <div className="whitespace-pre-wrap"><ChatMessage text={msg.content} /></div>
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl" style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#DC3900" }} />
                  <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.1s]" style={{ background: "#DC3900" }} />
                  <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s]" style={{ background: "#DC3900" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 px-6 py-4"
          style={{ background: "#F4F2EE", borderTop: "1px solid rgba(0,0,0,0.08)" }}
        >
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question across all evidence..."
              className="flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC3900]/40 bg-white text-sm"
              style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#11181C" }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 text-white rounded-xl disabled:opacity-50 transition-colors text-sm font-medium"
              style={{ background: "#DC3900" }}
            >
              Ask
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
