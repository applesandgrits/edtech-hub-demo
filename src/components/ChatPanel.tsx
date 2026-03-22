"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import { useAuth } from "@/lib/auth-context";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPanel({
  documentId,
  documentTitle,
}: {
  documentId?: string;
  documentTitle?: string;
}) {
  const { refreshUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"doc" | "all">(documentId ? "doc" : "all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({
          query: userMessage,
          documentId: mode === "doc" ? documentId : undefined,
          mode,
        }),
      });

      if (res.status === 429) {
        throw new Error("You've reached your AI usage limit ($0.50). Contact an admin to reset.");
      }
      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantContent,
          };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      refreshUser(); // Update usage meter in nav
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl" style={{ background: "#EAE9E5", border: "1px solid rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div className="px-4 py-3 rounded-t-xl" style={{ background: "white", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-white font-bold" style={{ background: documentId ? "#DC3900" : "#B83000" }}>
              {documentId ? "Q" : "AI"}
            </span>
            <h3 className="font-semibold text-sm" style={{ color: "#11181C" }}>
              {documentId ? "Document Q&A" : "Repository Explorer"}
            </h3>
          </div>
          {documentId && (
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "#EAE9E5" }}>
              <button
                onClick={() => setMode("doc")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  mode === "doc"
                    ? "bg-white shadow-sm"
                    : ""
                }`}
                style={{ color: mode === "doc" ? "#B83000" : "#71717A" }}
              >
                This doc
              </button>
              <button
                onClick={() => setMode("all")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  mode === "all"
                    ? "bg-white shadow-sm"
                    : ""
                }`}
                style={{ color: mode === "all" ? "#B83000" : "#71717A" }}
              >
                All docs
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "#A1A1AA" }}>
              {documentId
                ? `Ask questions about "${documentTitle?.slice(0, 60)}..."`
                : "Ask questions across all evidence documents"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {[
                "What are the key findings?",
                "What evidence supports this?",
                "What are the limitations?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#71717A" }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? { background: "#DC3900", color: "white" }
                  : { background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#11181C" }
              }
            >
              <div className="whitespace-pre-wrap"><ChatMessage text={msg.content} /></div>
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl" style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
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
      <form onSubmit={handleSubmit} className="p-3" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC3900]/40 bg-white"
            style={{ border: "1px solid rgba(0,0,0,0.08)", color: "#11181C" }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: "#DC3900" }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
