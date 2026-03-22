import { neon } from "@neondatabase/serverless";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReaderPanel from "@/components/ReaderPanel";

export const dynamic = "force-dynamic";

async function getDocument(id: string) {
  const sql = neon(process.env.DATABASE_URL!);
  const results = await sql.query("SELECT * FROM documents WHERE id = $1", [id]);
  return results[0] || null;
}

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) return notFound();

  const authors =
    typeof doc.authors === "string" ? JSON.parse(doc.authors) : doc.authors || [];
  const year = doc.date_published
    ? new Date(doc.date_published).getFullYear()
    : null;

  return (
    <div className="reader-view flex flex-col" style={{ height: "calc(100vh - 49px)" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: "white", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/doc/${id}`}
            className="text-xs shrink-0 px-2 py-1 rounded transition-colors"
            style={{ color: "#71717A", background: "#EAE9E5" }}
          >
            &larr; Details
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {doc.item_type && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "rgba(92,172,253,0.15)", color: "#3B8DE8" }}
                >
                  {doc.item_type}
                </span>
              )}
              {year && (
                <span className="text-[10px] shrink-0" style={{ color: "#A1A1AA" }}>
                  {year}
                </span>
              )}
            </div>
            <h1
              className="text-sm font-semibold truncate"
              style={{ color: "#11181C" }}
              title={doc.title as string}
            >
              {doc.title as string}
            </h1>
            {authors.length > 0 && (
              <p className="text-[10px] truncate" style={{ color: "#A1A1AA" }}>
                {authors.map((a: any) => `${a.firstName} ${a.lastName}`.trim()).join(", ")}
              </p>
            )}
          </div>
        </div>
        {(doc.source_url || doc.url) && (
          <a
            href={(doc.source_url || doc.url) as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg shrink-0"
            style={{ background: "#5CACFD", color: "white" }}
          >
            Original source
          </a>
        )}
      </div>

      {/* Split panel: Reader + Chat */}
      <ReaderPanel
        docId={doc.id as string}
        docTitle={doc.title as string}
        fullText={doc.full_text as string}
        abstract={doc.abstract as string}
        aiSummary={doc.ai_summary as string}
        sourceUrl={(doc.source_url || doc.url) as string}
      />
    </div>
  );
}
