"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ThemeDoc {
  id: string;
  title: string;
  item_type: string;
  ai_summary: string;
  authors: { firstName: string; lastName: string }[] | string | null;
  date_published: string | null;
  tags: string[] | null;
  x: number;
  y: number;
}

interface Theme {
  id: number;
  label: string;
  docs: ThemeDoc[];
}

interface FacetValue {
  facet_value: string;
  doc_count: string;
  doc_ids: string[];
}

const COLORS = [
  { bg: "#5CACFD", light: "rgba(92,172,253,0.15)" },
  { bg: "#DC3900", light: "rgba(220,57,0,0.1)" },
  { bg: "#22C55E", light: "rgba(34,197,94,0.1)" },
  { bg: "#A855F7", light: "rgba(168,85,247,0.1)" },
  { bg: "#F59E0B", light: "rgba(245,158,11,0.1)" },
  { bg: "#EC4899", light: "rgba(236,72,153,0.1)" },
];

const DIMENSIONS = [
  { key: "topic", label: "Topic (AI Clusters)", icon: "T" },
  { key: "location", label: "Location", icon: "L" },
  { key: "methodology", label: "Methodology", icon: "M" },
  { key: "format", label: "Format", icon: "F" },
  { key: "technology", label: "Technology", icon: "C" },
  { key: "intervention", label: "Intervention", icon: "I" },
  { key: "outcome", label: "Outcome", icon: "O" },
];

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDoc, setHoveredDoc] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);

  // Facet state
  const [activeDimension, setActiveDimension] = useState("topic");
  const [facetValues, setFacetValues] = useState<FacetValue[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set());
  const [facetLoading, setFacetLoading] = useState(false);

  // Load AI-clustered themes
  useEffect(() => {
    fetch("/api/themes")
      .then((r) => r.json())
      .then((data) => {
        setThemes(data.themes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Load facets when dimension changes
  useEffect(() => {
    if (activeDimension === "topic") {
      setFacetValues([]);
      setSelectedFacets(new Set());
      return;
    }
    setFacetLoading(true);
    setSelectedFacets(new Set());
    fetch(`/api/facets?dimension=${activeDimension}`)
      .then((r) => r.json())
      .then((data) => {
        setFacetValues(data.facets || []);
        setFacetLoading(false);
      })
      .catch(() => setFacetLoading(false));
  }, [activeDimension]);

  const toggleFacet = (value: string) => {
    setSelectedFacets((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
    setSelectedTheme(null);
  };

  // Compute which doc IDs are highlighted by facet filters
  const highlightedDocIds: Set<string> | null =
    activeDimension !== "topic" && selectedFacets.size > 0
      ? new Set(
          facetValues
            .filter((f) => selectedFacets.has(f.facet_value))
            .flatMap((f) => f.doc_ids)
        )
      : null;

  // Build visible docs list
  let visibleDocs: ThemeDoc[];
  if (highlightedDocIds) {
    visibleDocs = themes
      .flatMap((t) => t.docs)
      .filter((d) => highlightedDocIds.has(d.id));
  } else if (selectedTheme !== null) {
    visibleDocs = themes[selectedTheme]?.docs || [];
  } else {
    visibleDocs = themes.flatMap((t) => t.docs);
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div
          className="inline-block w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mb-4"
          style={{ borderColor: "#5CACFD", borderTopColor: "transparent" }}
        />
        <p style={{ color: "#71717A" }}>
          Analyzing embeddings and discovering themes...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-4">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
          style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}
        >
          Themes &amp; Embeddings
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#11181C" }}>
          Evidence Landscape
        </h1>
        <p className="text-sm" style={{ color: "#71717A" }}>
          Explore how 50 documents relate by topic, location, methodology, technology, and more.
        </p>
      </div>

      {/* Dimension tabs */}
      <div
        className="flex flex-wrap gap-1 mb-4 p-1 rounded-lg"
        style={{ background: "#EAE9E5" }}
      >
        {DIMENSIONS.map((dim) => (
          <button
            key={dim.key}
            onClick={() => {
              setActiveDimension(dim.key);
              setSelectedTheme(null);
            }}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: activeDimension === dim.key ? "white" : "transparent",
              color: activeDimension === dim.key ? "#11181C" : "#71717A",
              boxShadow:
                activeDimension === dim.key ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            {dim.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visualization */}
        <div className="lg:col-span-2">
          <div
            className="rounded-xl p-4 relative"
            style={{
              background: "white",
              border: "1px solid rgba(0,0,0,0.08)",
              height: "480px",
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {[20, 40, 60, 80].map((v) => (
                <g key={v}>
                  <line x1={v} y1="5" x2={v} y2="95" stroke="rgba(0,0,0,0.04)" strokeWidth="0.2" />
                  <line x1="5" y1={v} x2="95" y2={v} stroke="rgba(0,0,0,0.04)" strokeWidth="0.2" />
                </g>
              ))}

              {themes.map((theme, ti) =>
                theme.docs.map((doc) => {
                  const isHighlighted = highlightedDocIds
                    ? highlightedDocIds.has(doc.id)
                    : selectedTheme === null || selectedTheme === ti;
                  const isHovered = hoveredDoc === doc.id;

                  return (
                    <g key={doc.id}>
                      {/* Connection lines between highlighted docs */}
                      {isHighlighted &&
                        highlightedDocIds &&
                        visibleDocs
                          .filter((d) => d.id > doc.id)
                          .map((other) => (
                            <line
                              key={`${doc.id}-${other.id}`}
                              x1={doc.x}
                              y1={doc.y}
                              x2={other.x}
                              y2={other.y}
                              stroke={COLORS[ti % COLORS.length].bg}
                              strokeWidth="0.15"
                              opacity="0.2"
                            />
                          ))}
                      <circle
                        cx={doc.x}
                        cy={doc.y}
                        r={isHovered ? 2.8 : isHighlighted ? 2 : 1.5}
                        fill={COLORS[ti % COLORS.length].bg}
                        opacity={isHighlighted ? (isHovered ? 1 : 0.75) : 0.12}
                        style={{ cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={() => setHoveredDoc(doc.id)}
                        onMouseLeave={() => setHoveredDoc(null)}
                      />
                      {isHovered && (
                        <>
                          <rect
                            x={doc.x - 20}
                            y={doc.y - 6}
                            width="40"
                            height="4"
                            rx="0.5"
                            fill="white"
                            opacity="0.9"
                          />
                          <text
                            x={doc.x}
                            y={doc.y - 3.2}
                            textAnchor="middle"
                            fontSize="1.8"
                            fill="#11181C"
                            fontWeight="600"
                          >
                            {doc.title.slice(0, 45)}
                            {doc.title.length > 45 ? "..." : ""}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })
              )}
            </svg>

            {/* Legend — show topic clusters or facet filter info */}
            <div className="absolute bottom-3 left-3 right-3">
              {activeDimension === "topic" ? (
                <div className="flex flex-wrap gap-1.5">
                  {themes.map((theme, i) => (
                    <button
                      key={theme.id}
                      onClick={() =>
                        setSelectedTheme(selectedTheme === i ? null : i)
                      }
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] transition-all"
                      style={{
                        background:
                          selectedTheme === i
                            ? COLORS[i % COLORS.length].bg
                            : COLORS[i % COLORS.length].light,
                        color:
                          selectedTheme === i
                            ? "white"
                            : COLORS[i % COLORS.length].bg,
                        fontWeight: selectedTheme === i ? 600 : 400,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: COLORS[i % COLORS.length].bg }}
                      />
                      {theme.label}
                    </button>
                  ))}
                </div>
              ) : highlightedDocIds ? (
                <div
                  className="px-3 py-1.5 rounded-lg text-[10px]"
                  style={{ background: "rgba(92,172,253,0.1)", color: "#3B8DE8" }}
                >
                  Showing {highlightedDocIds.size} documents matching:{" "}
                  {[...selectedFacets].join(", ")}
                </div>
              ) : (
                <div
                  className="px-3 py-1.5 rounded-lg text-[10px]"
                  style={{ background: "#EAE9E5", color: "#71717A" }}
                >
                  Select values from the right panel to filter documents
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: facet values or document list */}
        <div className="space-y-3">
          {activeDimension === "topic" ? (
            <>
              <h2 className="font-semibold text-sm" style={{ color: "#11181C" }}>
                {selectedTheme !== null
                  ? themes[selectedTheme]?.label
                  : "All Themes"}
                <span className="font-normal ml-1" style={{ color: "#A1A1AA" }}>
                  ({visibleDocs.length} docs)
                </span>
              </h2>
              <DocList
                docs={visibleDocs}
                themes={themes}
                hoveredDoc={hoveredDoc}
                setHoveredDoc={setHoveredDoc}
              />
            </>
          ) : (
            <>
              {/* Facet filter chips */}
              <h2 className="font-semibold text-sm" style={{ color: "#11181C" }}>
                Filter by {DIMENSIONS.find((d) => d.key === activeDimension)?.label}
              </h2>

              {facetLoading ? (
                <p className="text-xs" style={{ color: "#A1A1AA" }}>
                  Loading facets...
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {facetValues.map((fv) => {
                    const isSelected = selectedFacets.has(fv.facet_value);
                    return (
                      <button
                        key={fv.facet_value}
                        onClick={() => toggleFacet(fv.facet_value)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all"
                        style={{
                          background: isSelected ? "#5CACFD" : "white",
                          color: isSelected ? "white" : "#71717A",
                          border: `1px solid ${isSelected ? "#5CACFD" : "rgba(0,0,0,0.08)"}`,
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        {fv.facet_value}
                        <span
                          className="text-[9px] opacity-60"
                          style={{ color: isSelected ? "white" : "#A1A1AA" }}
                        >
                          {fv.doc_count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Filtered document list */}
              {selectedFacets.size > 0 && (
                <>
                  <h3 className="font-semibold text-xs" style={{ color: "#11181C" }}>
                    Matching documents
                    <span className="font-normal ml-1" style={{ color: "#A1A1AA" }}>
                      ({visibleDocs.length})
                    </span>
                  </h3>
                  <DocList
                    docs={visibleDocs}
                    themes={themes}
                    hoveredDoc={hoveredDoc}
                    setHoveredDoc={setHoveredDoc}
                  />
                </>
              )}

              {selectedFacets.size === 0 && !facetLoading && facetValues.length > 0 && (
                <p className="text-xs mt-2" style={{ color: "#A1A1AA" }}>
                  Click values above to highlight documents on the map
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatAuthors(authors: ThemeDoc["authors"]): string {
  const list = typeof authors === "string" ? JSON.parse(authors) : authors || [];
  if (list.length === 0) return "";
  const names = list
    .slice(0, 2)
    .map((a: any) => `${a.lastName || ""}${a.lastName && a.firstName ? ", " : ""}${(a.firstName || "").charAt(0)}.`.trim())
    .filter(Boolean);
  return names.join(" & ") + (list.length > 2 ? ` +${list.length - 2}` : "");
}

function DocList({
  docs,
  themes,
  hoveredDoc,
  setHoveredDoc,
}: {
  docs: ThemeDoc[];
  themes: Theme[];
  hoveredDoc: string | null;
  setHoveredDoc: (id: string | null) => void;
}) {
  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
      {docs.map((doc) => {
        const themeIdx = themes.findIndex((t) =>
          t.docs.some((d) => d.id === doc.id)
        );
        const authorStr = formatAuthors(doc.authors);
        const year = doc.date_published
          ? new Date(doc.date_published).getFullYear()
          : null;
        const tags = typeof doc.tags === "string" ? JSON.parse(doc.tags) : doc.tags;

        return (
          <Link
            key={doc.id}
            href={`/doc/${doc.id}`}
            className="block rounded-lg p-3 transition-all group"
            style={{
              background:
                hoveredDoc === doc.id ? "white" : "rgba(255,255,255,0.6)",
              border: `1px solid ${
                hoveredDoc === doc.id
                  ? COLORS[themeIdx % COLORS.length].bg
                  : "rgba(0,0,0,0.04)"
              }`,
            }}
            onMouseEnter={() => setHoveredDoc(doc.id)}
            onMouseLeave={() => setHoveredDoc(null)}
          >
            <div className="flex items-start gap-2">
              <span
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{
                  background: COLORS[themeIdx % COLORS.length].bg,
                }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-semibold line-clamp-2 group-hover:underline"
                  style={{ color: "#11181C" }}
                >
                  {doc.title}
                </p>

                {/* Metadata row */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {doc.item_type && (
                    <span
                      className="px-1.5 py-0.5 text-[9px] font-medium rounded"
                      style={{ background: "rgba(220,57,0,0.1)", color: "#DC3900" }}
                    >
                      {doc.item_type}
                    </span>
                  )}
                  {authorStr && (
                    <span className="text-[10px]" style={{ color: "#71717A" }}>
                      {authorStr}
                    </span>
                  )}
                  {year && (
                    <span className="text-[10px]" style={{ color: "#A1A1AA" }}>
                      {year}
                    </span>
                  )}
                </div>

                {doc.ai_summary && (
                  <p
                    className="text-[10px] mt-1 line-clamp-2 leading-relaxed"
                    style={{ color: "#71717A" }}
                  >
                    {doc.ai_summary}
                  </p>
                )}

                {/* Tags */}
                {tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tags.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-[8px] rounded"
                        style={{ background: "#EAE9E5", color: "#A1A1AA" }}
                      >
                        {tag}
                      </span>
                    ))}
                    {tags.length > 3 && (
                      <span className="text-[8px]" style={{ color: "#A1A1AA" }}>
                        +{tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* View link */}
                <span
                  className="text-[10px] font-medium mt-1.5 inline-block opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#DC3900" }}
                >
                  View document →
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
