"use client";

import Link from "next/link";
import { Fragment } from "react";

/**
 * Renders chat text with basic markdown:
 * - [link text](/doc/DOCID) and [link text](https://...) → clickable links
 * - **bold** → <strong>
 * - *italic* → <em>
 * - Lines starting with - or * → bullet list items
 * - Lines starting with 1. 2. → numbered list items
 */
export default function ChatMessage({ text }: { text: string }) {
  if (!text) return null;

  // Split into lines for block-level formatting
  const lines = text.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, li) => {
        const trimmed = line.trim();

        // Bullet list item
        if (/^[-*]\s/.test(trimmed)) {
          return (
            <div key={li} className="flex gap-2 pl-2">
              <span style={{ color: "#5CACFD" }} className="shrink-0 mt-0.5">
                &bull;
              </span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list item
        const numMatch = trimmed.match(/^(\d+)\.\s(.+)/);
        if (numMatch) {
          return (
            <div key={li} className="flex gap-2 pl-2">
              <span
                className="shrink-0 mt-0.5 font-medium"
                style={{ color: "#5CACFD", minWidth: "1.2em" }}
              >
                {numMatch[1]}.
              </span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={li} className="h-2" />;
        }

        // Regular paragraph
        return <div key={li}>{renderInline(trimmed)}</div>;
      })}
    </div>
  );
}

/** Render inline markdown: links, bold, italic */
function renderInline(text: string) {
  // Split on markdown patterns: [text](url), **bold**, *italic*
  const tokens = text.split(
    /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g
  );

  return (
    <>
      {tokens.map((token, i) => {
        // Link: [text](url)
        const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, linkText, url] = linkMatch;
          if (url.startsWith("/doc/") || url.startsWith("/read/")) {
            return (
              <Link
                key={i}
                href={url}
                className="underline decoration-1 underline-offset-2 font-medium"
                style={{ color: "#5CACFD" }}
                onClick={(e) => e.stopPropagation()}
              >
                {linkText}
              </Link>
            );
          }
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-1 underline-offset-2"
              style={{ color: "#5CACFD" }}
            >
              {linkText}
            </a>
          );
        }

        // Bold: **text**
        const boldMatch = token.match(/^\*\*(.+)\*\*$/);
        if (boldMatch) {
          return (
            <strong key={i} className="font-semibold">
              {boldMatch[1]}
            </strong>
          );
        }

        // Italic: *text*
        const italicMatch = token.match(/^\*(.+)\*$/);
        if (italicMatch) {
          return <em key={i}>{italicMatch[1]}</em>;
        }

        // Plain text
        return <Fragment key={i}>{token}</Fragment>;
      })}
    </>
  );
}
