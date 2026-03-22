"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ReaderPanel({
  docId,
  docTitle,
  fullText,
  abstract,
  aiSummary,
  sourceUrl,
}: {
  docId: string;
  docTitle: string;
  fullText: string;
  abstract: string;
  aiSummary: string;
  sourceUrl: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Capture text selection in the reader panel
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 5) {
        const range = selection.getRangeAt(0);
        if (contentRef.current?.contains(range.commonAncestorContainer)) {
          setSelectedText(selection.toString().trim());
        }
      }
    };
    document.addEventListener("mouseup", handleSelection);
    return () => document.removeEventListener("mouseup", handleSelection);
  }, []);

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
        body: JSON.stringify({
          query: userMessage,
          documentId: docId,
          mode: "doc",
        }),
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

  const askAboutSelection = () => {
    if (selectedText) {
      setInput(`Explain this passage: "${selectedText.slice(0, 300)}"`);
      setSelectedText("");
    }
  };

  // Format the full text into paragraphs
  const paragraphs = (fullText || abstract || "")
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Document content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
        style={{ borderRight: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div className="max-w-3xl mx-auto px-8 py-6">
          {/* AI Summary at top */}
          {aiSummary && (
            <div
              className="rounded-lg p-4 mb-6"
              style={{
                background: "rgba(92,172,253,0.08)",
                border: "1px solid rgba(92,172,253,0.15)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="w-4 h-4 rounded flex items-center justify-center text-[9px] text-white font-bold"
                  style={{ background: "#5CACFD" }}
                >
                  AI
                </span>
                <span className="text-xs font-medium" style={{ color: "#3B8DE8" }}>
                  Summary
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#11181C" }}>
                {aiSummary}
              </p>
            </div>
          )}

          {/* Selected text action */}
          {selectedText && (
            <div
              className="sticky top-2 z-10 flex items-center gap-2 rounded-lg px-3 py-2 mb-4 shadow-lg"
              style={{ background: "#11181C" }}
            >
              <span className="text-xs text-white/70 truncate flex-1">
                &ldquo;{selectedText.slice(0, 80)}...&rdquo;
              </span>
              <button
                onClick={askAboutSelection}
                className="text-xs px-3 py-1 rounded-md text-white shrink-0"
                style={{ background: "#5CACFD" }}
              >
                Ask about this
              </button>
              <button
                onClick={() => setSelectedText("")}
                className="text-xs text-white/50 shrink-0"
              >
                x
              </button>
            </div>
          )}

          {/* Document body */}
          <div className="space-y-4">
            {paragraphs.map((para, i) => {
              const trimmed = para.trim();
              // Detect headings (all caps, short, or starts with numbers like "1.", "2.")
              const isHeading =
                (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && trimmed.length > 3) ||
                /^\d+\.\s+[A-Z]/.test(trimmed) ||
                /^#{1,3}\s/.test(trimmed);

              if (isHeading) {
                return (
                  <h2
                    key={i}
                    className="text-base font-semibold pt-4"
                    style={{ color: "#11181C" }}
                  >
                    {trimmed.replace(/^#+\s*/, "")}
                  </h2>
                );
              }

              return (
                <p
                  key={i}
                  className="text-sm leading-relaxed"
                  style={{ color: "#11181C", lineHeight: "1.8" }}
                >
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Source link at bottom */}
          {sourceUrl && (
            <div className="mt-8 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:underline"
                style={{ color: "#5CACFD" }}
              >
                View original source &rarr;
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat panel */}
      <div
        className="w-[380px] shrink-0 flex flex-col"
        style={{ background: "#EAE9E5" }}
      >
        {/* Chat header */}
        <div
          className="px-4 py-3 shrink-0"
          style={{ background: "white", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-white font-bold"
              style={{ background: "#5CACFD" }}
            >
              Q
            </span>
            <h3 className="font-semibold text-sm" style={{ color: "#11181C" }}>
              Document Q&A
            </h3>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "#A1A1AA" }}>
            Ask questions or select text and click &ldquo;Ask about this&rdquo;
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs mb-3" style={{ color: "#A1A1AA" }}>
                Ask about this document
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  "Summarize the key findings",
                  "What methodology was used?",
                  "What are the limitations?",
                  "What are the policy implications?",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-xs px-3 py-2 rounded-lg text-left transition-colors"
                    style={{
                      background: "white",
                      border: "1px solid rgba(0,0,0,0.06)",
                      color: "#71717A",
                    }}
                  >
                    {s}
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
                className="max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "#5CACFD", color: "white" }
                    : {
                        background: "white",
                        border: "1px solid rgba(0,0,0,0.06)",
                        color: "#11181C",
                      }
                }
              >
                <div className="whitespace-pre-wrap">
                  <ChatMessage text={msg.content} />
                </div>
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div
                className="px-3 py-2 rounded-xl"
                style={{ background: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#5CACFD" }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.1s]" style={{ background: "#5CACFD" }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]" style={{ background: "#5CACFD" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="p-3 shrink-0"
          style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this document..."
              className="flex-1 px-3 py-2 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5CACFD] bg-white"
              style={{ border: "1px solid rgba(0,0,0,0.06)", color: "#11181C" }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-2 text-white text-xs rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: "#5CACFD" }}
            >
              Ask
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
