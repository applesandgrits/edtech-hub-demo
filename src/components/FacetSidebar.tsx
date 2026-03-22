"use client";

import { useState } from "react";

interface Facet {
  facet_value: string;
  doc_count: string;
  doc_ids: string[];
}

interface FacetSidebarProps {
  dimensions: Record<string, Facet[]>;
  selectedFacets: { type: string; value: string }[];
  onToggleFacet: (type: string, value: string) => void;
}

const DIMENSION_LABELS: Record<string, string> = {
  topic: "Topic area",
  location: "Focus countries",
  methodology: "Research method",
  format: "Publisher and type",
  technology: "Hardware and modality",
  intervention: "Education systems",
  outcome: "Educational level",
};

const DIMENSION_ORDER = [
  "topic",
  "location",
  "methodology",
  "format",
  "technology",
  "intervention",
  "outcome",
];

export default function FacetSidebar({
  dimensions,
  selectedFacets,
  onToggleFacet,
}: FacetSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (dim: string) => {
    setExpanded((prev) => ({ ...prev, [dim]: !prev[dim] }));
  };

  const isSelected = (type: string, value: string) =>
    selectedFacets.some((f) => f.type === type && f.value === value);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "white",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: "#DC3900" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
        </div>
        <span className="font-semibold text-sm" style={{ color: "#11181C" }}>
          Filter by EdTech Hub
        </span>
      </div>

      {/* Facet groups */}
      <div>
        {DIMENSION_ORDER.map((dim) => {
          const facets = dimensions[dim];
          if (!facets || facets.length === 0) return null;
          const isOpen = expanded[dim] ?? false;
          const label = DIMENSION_LABELS[dim] || dim;
          const selectedCount = selectedFacets.filter(
            (f) => f.type === dim
          ).length;

          return (
            <div
              key={dim}
              style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}
            >
              <button
                onClick={() => toggleExpand(dim)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
              >
                <span className="text-sm font-medium" style={{ color: "#11181C" }}>
                  {label}
                  {selectedCount > 0 && (
                    <span
                      className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs text-white font-bold"
                      style={{ background: "#DC3900" }}
                    >
                      {selectedCount}
                    </span>
                  )}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A1A1AA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 space-y-1">
                  {facets.map((facet) => {
                    const selected = isSelected(dim, facet.facet_value);
                    return (
                      <button
                        key={facet.facet_value}
                        onClick={() => onToggleFacet(dim, facet.facet_value)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors text-sm"
                        style={{
                          background: selected ? "rgba(220,57,0,0.08)" : "transparent",
                          color: selected ? "#DC3900" : "#71717A",
                        }}
                      >
                        <span className="truncate pr-2">{facet.facet_value}</span>
                        <span
                          className="text-xs shrink-0"
                          style={{ color: selected ? "#DC3900" : "#A1A1AA" }}
                        >
                          {facet.doc_count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
