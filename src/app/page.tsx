import { neon } from "@neondatabase/serverless";
import SearchBar from "@/components/SearchBar";
import DocCard from "@/components/DocCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getRecentDocs() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql`SELECT id, title, abstract, authors, item_type, date_published, tags, ai_summary
     FROM documents ORDER BY date_published DESC NULLS LAST LIMIT 9`;
}

async function getStats() {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`SELECT COUNT(*) as total,
            COUNT(DISTINCT item_type) as types,
            COUNT(ai_summary) as summaries
     FROM documents`;
  return result[0];
}

export default async function Home() {
  const [docs, stats] = await Promise.all([getRecentDocs(), getStats()]);

  return (
    <div>
      {/* Hero */}
      <div style={{ background: "#11181C" }}>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-3 text-white tracking-tight">
            EdTech Hub Evidence Library
          </h1>
          <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
            AI-powered search and discovery across education technology research
            for low- and middle-income countries.
          </p>
          <SearchBar large />
          <div className="mt-4 flex items-center justify-center gap-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>{stats.total} documents</span>
            <span>{stats.types} document types</span>
            <span>{stats.summaries} AI summaries</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4" style={{ color: "#11181C" }}>
              Recent Evidence
            </h2>
            <div className="space-y-3">
              {docs.map((doc: any) => (
                <DocCard key={doc.id} {...doc} />
              ))}
            </div>
          </div>

          {/* Sidebar — 3 AI Features */}
          <div className="space-y-4">
            {/* Feature 1: Evidence Finder */}
            <Link href="/search" className="block rounded-xl p-5 hover:shadow-md transition-all" style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white font-bold" style={{ background: "#5CACFD" }}>1</span>
                <h3 className="font-semibold text-sm" style={{ color: "#11181C" }}>Evidence Finder</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#71717A" }}>
                Search with natural language. AI matches your question to the most relevant documents using semantic similarity, with scores showing how well each result matches.
              </p>
            </Link>

            {/* Feature 2: Document Q&A */}
            <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white font-bold" style={{ background: "#3B8DE8" }}>2</span>
                <h3 className="font-semibold text-sm" style={{ color: "#11181C" }}>Document Q&A</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#71717A" }}>
                Open any document and ask questions about it. The AI reads the full text and answers based on what the paper actually says.
              </p>
              <p className="text-xs mt-2 italic" style={{ color: "#A1A1AA" }}>
                Available on each document&apos;s detail page
              </p>
            </div>

            {/* Feature 3: Repository Explorer */}
            <Link href="/explore" className="block rounded-xl p-5 hover:shadow-md transition-all" style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white font-bold" style={{ background: "#11181C" }}>3</span>
                <h3 className="font-semibold text-sm" style={{ color: "#11181C" }}>Repository Explorer</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#71717A" }}>
                Ask big-picture questions across the entire library. The AI synthesizes evidence from multiple documents and cites its sources.
              </p>
              <div className="mt-2 text-xs font-medium" style={{ color: "#5CACFD" }}>
                Try it &rarr;
              </div>
            </Link>

            {/* Example questions */}
            <div className="rounded-xl p-5" style={{ background: "#EAE9E5" }}>
              <h3 className="font-semibold mb-3 text-sm" style={{ color: "#11181C" }}>
                Try asking...
              </h3>
              <ul className="space-y-2 text-xs" style={{ color: "#71717A" }}>
                <li className="flex gap-2">
                  <span style={{ color: "#DC3900" }} className="shrink-0 font-bold">?</span>
                  What works for girls&apos; education with mobile phones?
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "#DC3900" }} className="shrink-0 font-bold">?</span>
                  How effective is technology-based assessment in Sub-Saharan Africa?
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "#DC3900" }} className="shrink-0 font-bold">?</span>
                  What are the challenges of blended learning in LMICs?
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
