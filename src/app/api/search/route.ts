import { neon } from "@neondatabase/serverless";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const type = request.nextUrl.searchParams.get("type") ?? "";
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!query.trim()) {
    const docs = await sql.query(
      `SELECT id, title, abstract, authors, item_type, date_published, doi, url, tags, ai_summary
       FROM documents ORDER BY date_published DESC NULLS LAST LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await sql`SELECT COUNT(*) as count FROM documents`;
    return NextResponse.json({ docs, total: parseInt(total[0].count), page });
  }

  const embResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query.slice(0, 8000),
  });
  const queryEmbedding = embResponse.data[0].embedding;
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  let typeFilter = "";
  const params: any[] = [vectorStr, limit, offset];
  if (type) {
    typeFilter = "AND d.item_type = $4";
    params.push(type);
  }

  const docs = await sql.query(
    `SELECT d.id, d.title, d.abstract, d.authors, d.item_type, d.date_published,
            d.doi, d.url, d.tags, d.ai_summary,
            1 - (e.embedding <=> $1::vector) as similarity,
            e.chunk_text as matched_chunk
     FROM embeddings e
     JOIN documents d ON d.id = e.document_id
     WHERE 1=1 ${typeFilter}
     ORDER BY e.embedding <=> $1::vector
     LIMIT $2 OFFSET $3`,
    params
  );

  // Deduplicate by document (keep highest similarity)
  const seen = new Map();
  const deduped = [];
  for (const doc of docs) {
    if (!seen.has(doc.id)) {
      seen.set(doc.id, true);
      deduped.push(doc);
    }
  }

  // Filter out low-relevance results and scale scores.
  // Raw cosine similarity for text-embedding-3-small:
  //   0.5+  = very strong    0.35-0.5 = good
  //   0.25-0.35 = weak       <0.25 = irrelevant
  // Filter: drop anything below 0.20 raw (30% displayed)
  // Scale: raw * 1.5, capped at 99%
  const filtered = [];
  for (const doc of deduped) {
    const raw = parseFloat((doc as any).similarity) || 0;
    if (raw < 0.20) continue; // Skip irrelevant results
    (doc as any).similarity = Math.min(raw * 1.5, 0.99);
    filtered.push(doc);
  }
  const finalDocs = filtered;

  return NextResponse.json({
    docs: finalDocs,
    total: finalDocs.length,
    page,
    query,
  });
}
