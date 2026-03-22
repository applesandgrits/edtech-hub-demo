"use client";

import Link from "next/link";
import { useState } from "react";

interface BrowseDocCardProps {
  id: string;
  title: string;
  abstract: string | null;
  authors: { firstName: string; lastName: string }[] | string;
  item_type: string | null;
  date_published: string | null;
  ai_summary: string | null;
  tags: string[];
  showAbstract: boolean;
}

export default function BrowseDocCard({
  id,
  title,
  authors,
  item_type,
  date_published,
  abstract,
  ai_summary,
  tags,
  showAbstract,
}: BrowseDocCardProps) {
  const [copied, setCopied] = useState(false);

  const authorList =
    typeof authors === "string" ? JSON.parse(authors) : authors || [];
  const authorStr = authorList
    .slice(0, 3)
    .map((a: any) => `${a.lastName || ""}${a.lastName && a.firstName ? ", " : ""}${(a.firstName || "").charAt(0)}.`.trim())
    .filter(Boolean)
    .join(" & ");
  const moreAuthors = authorList.length > 3 ? ` et al.` : "";

  const date = date_published
    ? new Date(date_published).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const displayText = ai_summary || abstract;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/doc/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Link href={`/doc/${id}`} className="block">
      <div
        className="rounded-xl p-5 hover:shadow-md transition-all"
        style={{
          background: "white",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <h3
          className="text-base font-semibold mb-1.5 line-clamp-2"
          style={{ color: "#11181C" }}
        >
          {title}
        </h3>

        <div className="flex items-center gap-1.5 mb-2 flex-wrap text-sm" style={{ color: "#71717A" }}>
          {item_type && (
            <>
              <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: "#DC3900" }}>
                <span className="text-white text-[9px] font-bold">EH</span>
              </div>
            </>
          )}
          {authorStr && (
            <span>
              {authorStr}
              {moreAuthors}
            </span>
          )}
          {date && (
            <>
              <span style={{ color: "#A1A1AA" }}>|</span>
              <span>{date}</span>
            </>
          )}
          {item_type === "Coming Soon" && (
            <span
              className="px-2 py-0.5 text-xs rounded-md font-medium"
              style={{ border: "1px solid #DC3900", color: "#DC3900" }}
            >
              Coming Soon
            </span>
          )}
        </div>

        {showAbstract && displayText && (
          <p className="text-sm leading-relaxed line-clamp-3 mb-2" style={{ color: "#71717A" }}>
            {displayText}
          </p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded"
                style={{ background: "#EAE9E5", color: "#71717A" }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-xs" style={{ color: "#A1A1AA" }}>
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{
              color: copied ? "#22C55E" : "#A1A1AA",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </Link>
  );
}
