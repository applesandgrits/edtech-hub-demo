"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "edtech-explore-messages";

export default function ExplorePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load persisted messages on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  // Save messages whenever they change (after hydration)
  useEffect(() => {
    if (hydrated && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, hydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

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
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: text };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
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
    <div className="explorer-view flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: "white", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded flex items-center justify-center text-[10px] text-white font-bold"
            style={{ background: "#DC3900" }}
          >
            AI
          </span>
          <h1 className="font-semibold text-sm" style={{ color: "#11181C" }}>
            Repository Explorer
          </h1>
          <span className="text-xs" style={{ color: "#A1A1AA" }}>
            — Synthesize insights across all documents
          </span>
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
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors hover:bg-black/[0.03]"
                style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#A1A1AA" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chat area — fills remaining space */}
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

      {/* Input — pinned to bottom */}
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
  );
}
