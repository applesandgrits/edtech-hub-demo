"use client";

import { useState } from "react";
import ChatMessage from "./ChatMessage";

interface RelevanceModalProps {
  docId: string;
  docTitle: string;
  query: string;
  similarity: number;
  matchedChunk: string;
}

export default function RelevanceModal({
  docId,
  docTitle,
  query,
  similarity,
  matchedChunk,
}: RelevanceModalProps) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getExplanation = async () => {
    setOpen(true);
    if (explanation) return; // already loaded

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
          query: `Explain in 2-3 sentences why this document is relevant (or not very relevant) to the user's search query. Be specific about what matches and what doesn't.

User's search: "${query}"
Document title: "${docTitle}"
Matched text excerpt: "${matchedChunk?.slice(0, 500) || "No specific text match available"}"
Similarity score: ${(similarity * 100).toFixed(1)}%`,
          documentId: docId,
          mode: "doc",
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setExplanation(text);
      }
    } catch {
      setExplanation("Unable to generate explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          getExplanation();
        }}
        className="text-xs font-mono px-2 py-0.5 rounded transition-colors cursor-pointer"
        style={{ color: "#DC3900", background: "rgba(220,57,0,0.08)" }}
        title="Click to see why this document matches your search"
      >
        {(similarity * 100).toFixed(0)}% match
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-lg w-full rounded-xl p-6 shadow-xl"
            style={{ background: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "#11181C" }}>
                Relevance Explanation
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-xl leading-none px-2"
                style={{ color: "#A1A1AA" }}
              >
                x
              </button>
            </div>

            <div className="mb-3">
              <p className="text-xs mb-1" style={{ color: "#A1A1AA" }}>Your search</p>
              <p className="text-sm font-medium" style={{ color: "#11181C" }}>
                &ldquo;{query}&rdquo;
              </p>
            </div>

            <div className="mb-3">
              <p className="text-xs mb-1" style={{ color: "#A1A1AA" }}>Document</p>
              <p className="text-sm font-medium" style={{ color: "#11181C" }}>
                {docTitle}
              </p>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  background:
                    similarity > 0.5
                      ? "rgba(92,172,253,0.15)"
                      : similarity > 0.3
                        ? "rgba(220,57,0,0.1)"
                        : "#EAE9E5",
                  color:
                    similarity > 0.5
                      ? "#3B8DE8"
                      : similarity > 0.3
                        ? "#DC3900"
                        : "#71717A",
                }}
              >
                {(similarity * 100).toFixed(1)}% semantic match
              </div>
            </div>

            <div
              className="rounded-lg p-4 text-sm leading-relaxed"
              style={{ background: "#F4F2EE", color: "#11181C" }}
            >
              {loading && !explanation && (
                <div className="flex items-center gap-2" style={{ color: "#A1A1AA" }}>
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#5CACFD", borderTopColor: "transparent" }} />
                  Analyzing relevance...
                </div>
              )}
              {explanation && (
                <div className="whitespace-pre-wrap"><ChatMessage text={explanation} /></div>
              )}
            </div>

            {/* Link to the document */}
            <div className="mt-3 text-center">
              <a
                href={`/doc/${docId}`}
                className="text-xs font-medium hover:underline"
                style={{ color: "#5CACFD" }}
                onClick={(e) => e.stopPropagation()}
              >
                View full document &rarr;
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
