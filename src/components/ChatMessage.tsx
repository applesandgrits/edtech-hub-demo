"use client";

import Link from "next/link";

/**
 * Renders chat text with markdown-style links converted to clickable Next.js Links.
 * Handles: [link text](/doc/DOCID) and [link text](https://...)
 */
export default function ChatMessage({ text }: { text: string }) {
  if (!text) return null;

  // Split text on markdown links: [text](url)
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

  return (
    <span>
      {parts.map((part, i) => {
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, linkText, url] = linkMatch;
          // Internal links to /doc/
          if (url.startsWith("/doc/")) {
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
          // External links
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
        // Plain text — preserve whitespace
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
