import { neon } from "@neondatabase/serverless";
import { notFound } from "next/navigation";
import Link from "next/link";
import ChatPanel from "@/components/ChatPanel";
import CommentsPanel from "@/components/CommentsPanel";

export const dynamic = "force-dynamic";

async function getDocument(id: string) {
  const sql = neon(process.env.DATABASE_URL!);
  const results = await sql.query("SELECT * FROM documents WHERE id = $1", [id]);
  return results[0] || null;
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) return notFound();

  const authors =
    typeof doc.authors === "string" ? JSON.parse(doc.authors) : doc.authors || [];
  const tags = doc.tags || [];
  const institution = doc.institution || [];
  const year = doc.date_published
    ? new Date(doc.date_published).getFullYear()
    : null;

  return (
    <div className="flex" style={{ height: "calc(100vh - 49px)" }}>
      {/* Left: Document content (scrollable) */}
      <div className="flex-1 overflow-y-auto" style={{ borderRight: "1px solid rgba(0,0,0,0.08)" }}>
        <div className="max-w-3xl mx-auto px-8 py-8">
          <Link
            href="/search"
            className="inline-flex items-center gap-1 text-sm mb-6 transition-colors"
            style={{ color: "#71717A" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to library
          </Link>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={`/read/${id}`}
                className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
                style={{ background: "#DC3900", color: "white" }}
              >
                Read
              </Link>
              {doc.item_type && (
                <span
                  className="px-2 py-0.5 text-xs font-medium rounded"
                  style={{ background: "rgba(220,57,0,0.1)", color: "#DC3900" }}
                >
                  {doc.item_type}
                </span>
              )}
              {year && <span className="text-sm" style={{ color: "#A1A1AA" }}>{year}</span>}
            </div>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "#11181C" }}>
              {doc.title}
            </h1>
            {authors.length > 0 && (
              <p style={{ color: "#71717A" }}>
                {authors.map((a: any) => `${a.firstName} ${a.lastName}`.trim()).join(", ")}
              </p>
            )}
          </div>

          {/* AI Summary */}
          {doc.ai_summary && (
            <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(92,172,253,0.1)", border: "1px solid rgba(92,172,253,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#DC3900" }}>
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <h3 className="font-semibold text-sm" style={{ color: "#DC3900" }}>
                  AI Summary
                </h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#11181C" }}>
                {doc.ai_summary}
              </p>
            </div>
          )}

          {/* Abstract */}
          {doc.abstract && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2" style={{ color: "#11181C" }}>Abstract</h2>
              <p className="leading-relaxed" style={{ color: "#71717A" }}>{doc.abstract}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-xl p-5 space-y-3 mb-6" style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
            <h3 className="font-semibold" style={{ color: "#11181C" }}>Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {doc.doi && (
                <div>
                  <span style={{ color: "#A1A1AA" }}>DOI</span>
                  <p>
                    <a href={`https://doi.org/${doc.doi}`} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "#DC3900" }}>
                      {doc.doi}
                    </a>
                  </p>
                </div>
              )}
              {doc.item_type && (
                <div>
                  <span style={{ color: "#A1A1AA" }}>Type</span>
                  <p style={{ color: "#11181C" }}>{doc.item_type}</p>
                </div>
              )}
              {institution.length > 0 && (
                <div>
                  <span style={{ color: "#A1A1AA" }}>Institution</span>
                  <p style={{ color: "#11181C" }}>{institution.join(", ")}</p>
                </div>
              )}
              {doc.rights && (
                <div>
                  <span style={{ color: "#A1A1AA" }}>License</span>
                  <p style={{ color: "#11181C" }}>{doc.rights}</p>
                </div>
              )}
              {(doc.source_url || doc.url) && (
                <div className="col-span-2">
                  <span style={{ color: "#A1A1AA" }}>Source</span>
                  <p>
                    <a href={(doc.source_url || doc.url) as string} target="_blank" rel="noopener noreferrer" className="hover:underline break-all" style={{ color: "#DC3900" }}>
                      {(doc.source_url || doc.url) as string}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2" style={{ color: "#11181C" }}>Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 text-sm rounded-full" style={{ background: "#EAE9E5", color: "#71717A" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <CommentsPanel documentId={id} />
        </div>
      </div>

      {/* Right: Full-height chat panel */}
      <div className="w-[400px] shrink-0 flex flex-col" style={{ background: "#EAE9E5" }}>
        <ChatPanel documentId={doc.id} documentTitle={doc.title} />
      </div>
    </div>
  );
}
