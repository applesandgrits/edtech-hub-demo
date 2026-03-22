"use client";

import { useState, useEffect, useCallback } from "react";
import SearchBar from "@/components/SearchBar";
import BrowseDocCard from "@/components/BrowseDocCard";
import FacetSidebar from "@/components/FacetSidebar";

interface Doc {
  id: string;
  title: string;
  abstract: string | null;
  authors: any;
  item_type: string | null;
  date_published: string | null;
  tags: string[];
  ai_summary: string | null;
}

interface Facet {
  facet_value: string;
  doc_count: string;
  doc_ids: string[];
}

export default function BrowsePage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState<Record<string, Facet[]>>({});
  const [selectedFacets, setSelectedFacets] = useState<{ type: string; value: string }[]>([]);
  const [sort, setSort] = useState<"date" | "title">("date");
  const [showAbstract, setShowAbstract] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch facets once
  useEffect(() => {
    fetch("/api/facets?dimension=all&limit=5")
      .then((r) => r.json())
      .then((data) => setDimensions(data.dimensions || {}))
      .catch(() => {});
  }, []);

  // Fetch documents when filters/sort/page change
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("sort", sort);
    if (selectedFacets.length > 0) {
      params.set(
        "facets",
        selectedFacets.map((f) => `${f.type}:${f.value}`).join(",")
      );
    }
    try {
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setDocs(data.docs || []);
      setTotal(data.total || 0);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, selectedFacets]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleToggleFacet = (type: string, value: string) => {
    setPage(1);
    setSelectedFacets((prev) => {
      const exists = prev.some((f) => f.type === type && f.value === value);
      if (exists) return prev.filter((f) => !(f.type === type && f.value === value));
      return [...prev, { type, value }];
    });
  };

  const clearFilters = () => {
    setSelectedFacets([]);
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Search header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold" style={{ color: "#11181C" }}>
            Search
          </h1>
          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as "date" | "title");
                setPage(1);
              }}
              className="text-sm px-3 py-1.5 rounded-lg bg-white focus:outline-none"
              style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#11181C" }}
            >
              <option value="date">Relevance</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>
        <SearchBar />
      </div>

      {/* Mobile filter button */}
      <button
        onClick={() => setMobileFiltersOpen(true)}
        className="lg:hidden flex items-center gap-2 text-sm px-4 py-2 rounded-lg mb-4 w-full justify-center"
        style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#11181C" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
        Filters
        {selectedFacets.length > 0 && (
          <span className="w-5 h-5 rounded-full text-xs text-white font-bold flex items-center justify-center" style={{ background: "#DC3900" }}>
            {selectedFacets.length}
          </span>
        )}
      </button>

      {/* Mobile filter overlay */}
      {mobileFiltersOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setMobileFiltersOpen(false)} />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl shadow-xl overflow-y-auto" style={{ background: "#F4F2EE", maxHeight: "80vh" }}>
            <div className="flex items-center justify-between px-4 py-3 sticky top-0" style={{ background: "#F4F2EE", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              <span className="font-semibold text-sm" style={{ color: "#11181C" }}>Filters</span>
              <button onClick={() => setMobileFiltersOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#11181C" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-4 pb-6">
              <FacetSidebar dimensions={dimensions} selectedFacets={selectedFacets} onToggleFacet={handleToggleFacet} />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <div className="w-[280px] shrink-0 hidden lg:block">
          <FacetSidebar
            dimensions={dimensions}
            selectedFacets={selectedFacets}
            onToggleFacet={handleToggleFacet}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <p className="text-sm" style={{ color: "#71717A" }}>
                <span className="font-semibold text-lg" style={{ color: "#DC3900" }}>
                  {total.toLocaleString()}
                </span>{" "}
                resources
              </p>
              {selectedFacets.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs px-2 py-1 rounded-md transition-colors"
                  style={{ color: "#DC3900", border: "1px solid rgba(220,57,0,0.3)" }}
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#71717A" }}>
                Abstract
                <button
                  onClick={() => setShowAbstract(!showAbstract)}
                  className="relative w-9 h-5 rounded-full transition-colors"
                  style={{ background: showAbstract ? "#5CACFD" : "#D4D4D8" }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                    style={{ left: showAbstract ? "18px" : "2px" }}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* Active filters */}
          {selectedFacets.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedFacets.map((f) => (
                <button
                  key={`${f.type}:${f.value}`}
                  onClick={() => handleToggleFacet(f.type, f.value)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: "rgba(220,57,0,0.08)", color: "#DC3900" }}
                >
                  {f.value}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* Document list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl p-5 animate-pulse"
                  style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}
                >
                  <div className="h-5 rounded w-3/4 mb-3" style={{ background: "#EAE9E5" }} />
                  <div className="h-4 rounded w-1/2 mb-2" style={{ background: "#EAE9E5" }} />
                  <div className="h-3 rounded w-full" style={{ background: "#EAE9E5" }} />
                </div>
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm" style={{ color: "#A1A1AA" }}>
                No documents match the selected filters.
              </p>
              <button
                onClick={clearFilters}
                className="mt-3 text-sm font-medium"
                style={{ color: "#DC3900" }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <BrowseDocCard key={doc.id} {...doc} showAbstract={showAbstract} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm rounded-lg disabled:opacity-40 transition-colors"
                style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#11181C" }}
              >
                Previous
              </button>
              <span className="text-sm px-3" style={{ color: "#71717A" }}>
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-4 py-2 text-sm rounded-lg disabled:opacity-40 transition-colors"
                style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#11181C" }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
