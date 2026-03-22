"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import SearchBar from "@/components/SearchBar";
import DocCard from "@/components/DocCard";
import RelevanceModal from "@/components/RelevanceModal";
import Link from "next/link";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function doSearch() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setResults(data.docs);
        setTotal(data.total);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }
    doSearch();
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <SearchBar initialQuery={query} />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div
            className="inline-block w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#5CACFD", borderTopColor: "transparent" }}
          />
          <p className="mt-3" style={{ color: "#71717A" }}>
            {query ? "Searching with AI..." : "Loading documents..."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "#11181C" }}>
              {query
                ? `${total} result${total !== 1 ? "s" : ""} for "${query}"`
                : `${total} documents`}
            </h2>
          </div>
          <div className="space-y-3">
            {results.map((doc: any) => (
              <div key={doc.id}>
                <Link href={`/doc/${doc.id}`} className="block">
                  <div
                    className="rounded-lg p-5 hover:shadow-md transition-all"
                    style={{
                      background: "white",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {doc.item_type && (
                        <span
                          className="inline-block px-2 py-0.5 text-xs font-medium rounded"
                          style={{ background: "rgba(92,172,253,0.15)", color: "#3B8DE8" }}
                        >
                          {doc.item_type}
                        </span>
                      )}
                      {doc.date_published && (
                        <span className="text-xs" style={{ color: "#A1A1AA" }}>
                          {new Date(doc.date_published).getFullYear()}
                        </span>
                      )}
                      {doc.similarity !== undefined && query && (
                        <RelevanceModal
                          docId={doc.id}
                          docTitle={doc.title}
                          query={query}
                          similarity={doc.similarity}
                          matchedChunk={doc.matched_chunk || ""}
                        />
                      )}
                    </div>
                    <h3
                      className="text-base font-semibold mb-1 line-clamp-2"
                      style={{ color: "#11181C" }}
                    >
                      {doc.title}
                    </h3>
                    {(() => {
                      const authorList =
                        typeof doc.authors === "string"
                          ? JSON.parse(doc.authors)
                          : doc.authors || [];
                      const authorStr = authorList
                        .slice(0, 3)
                        .map((a: any) => `${a.firstName} ${a.lastName}`.trim())
                        .join(", ");
                      return authorStr ? (
                        <p className="text-sm mb-2" style={{ color: "#71717A" }}>
                          {authorStr}
                          {authorList.length > 3 ? ` +${authorList.length - 3}` : ""}
                        </p>
                      ) : null;
                    })()}
                    <p className="text-sm line-clamp-3" style={{ color: "#71717A" }}>
                      {(doc.ai_summary || doc.abstract || "No abstract available.").slice(0, 200)}
                      {(doc.ai_summary || doc.abstract || "").length > 200 ? "..." : ""}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          {results.length === 0 && !loading && (
            <div className="text-center py-12" style={{ color: "#71717A" }}>
              <p className="text-lg mb-2">No results found</p>
              <p className="text-sm">
                Try a different search query or browse all documents.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-8 text-center" style={{ color: "#71717A" }}>
          Loading...
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
