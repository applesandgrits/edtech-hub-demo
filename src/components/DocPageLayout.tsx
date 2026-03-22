"use client";

import { useState } from "react";
import ChatPanel from "./ChatPanel";

export default function DocPageLayout({
  documentId,
  documentTitle,
  children,
}: {
  documentId: string;
  documentTitle: string;
  children: React.ReactNode;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex relative" style={{ height: "calc(100vh - 49px)" }}>
      {/* Document content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ borderRight: "1px solid rgba(0,0,0,0.08)" }}
      >
        {children}
      </div>

      {/* Desktop: always-visible chat panel */}
      <div
        className="hidden lg:flex w-[400px] shrink-0 flex-col"
        style={{ background: "#EAE9E5" }}
      >
        <ChatPanel documentId={documentId} documentTitle={documentTitle} />
      </div>

      {/* Mobile: floating toggle button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
        style={{ background: "#DC3900" }}
      >
        {chatOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>

      {/* Mobile: slide-up chat panel */}
      {chatOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-30"
            style={{ background: "rgba(0,0,0,0.3)" }}
            onClick={() => setChatOpen(false)}
          />
          {/* Panel */}
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex flex-col rounded-t-2xl shadow-xl"
            style={{
              background: "#EAE9E5",
              height: "75vh",
              maxHeight: "calc(100vh - 80px)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.15)" }} />
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel documentId={documentId} documentTitle={documentTitle} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
