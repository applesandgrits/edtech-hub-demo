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

  // Normalize scores: scale relative to the best match so top result = ~95%
  if (deduped.length > 0) {
    const rawScores = deduped.map((d: any) => parseFloat(d.similarity) || 0);
    const maxScore = Math.max(...rawScores);
    const minScore = Math.min(...rawScores);
    const range = maxScore - minScore || 0.01;

    for (let i = 0; i < deduped.length; i++) {
      // Map to 60-98% range: top match ~95%, lowest ~60%
      const normalized = ((rawScores[i] - minScore) / range) * 0.35 + 0.60;
      (deduped[i] as any).similarity = Math.min(normalized, 0.98);
    }
  }

  return NextResponse.json({
    docs: deduped,
    total: deduped.length,
    page,
    query,
  });
}
