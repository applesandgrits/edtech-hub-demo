"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ExplorePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const suggestions = [
    "What evidence exists on mobile learning for girls in Africa?",
    "How effective is digital personalized learning in LMICs?",
    "What are the main challenges for EdTech in emergencies?",
    "Compare approaches to teacher training with technology",
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3" style={{ background: "rgba(92,172,253,0.15)", color: "#3B8DE8" }}>
          Repository Explorer
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#11181C" }}>
          Ask the Evidence
        </h1>
        <p className="text-sm" style={{ color: "#71717A" }}>
          Synthesize insights across all 50 documents in the evidence library.
          The AI will cite which documents support each point.
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <p className="mb-6" style={{ color: "#A1A1AA" }}>
              Ask a question to explore evidence across the entire repository
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-2 rounded-lg text-left transition-colors"
                  style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#71717A" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? { background: "#5CACFD", color: "white" }
                  : { background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#11181C" }
              }
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1.5 text-xs font-medium" style={{ color: "#3B8DE8" }}>
                  <span className="w-4 h-4 rounded flex items-center justify-center text-[10px] text-white font-bold" style={{ background: "#5CACFD" }}>AI</span>
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
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#5CACFD" }} />
                <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.1s]" style={{ background: "#5CACFD" }} />
                <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s]" style={{ background: "#5CACFD" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="sticky bottom-0 pt-2 pb-4" style={{ background: "#F4F2EE" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question across all evidence..."
            className="flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5CACFD] bg-white text-sm"
            style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#11181C" }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 text-white rounded-xl disabled:opacity-50 transition-colors text-sm font-medium"
            style={{ background: "#5CACFD" }}
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
