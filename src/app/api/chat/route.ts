import { neon } from "@neondatabase/serverless";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { checkUsageCap, recordUsage } from "@/lib/services/usage";

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  // Auth check
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response("Authentication required", { status: 401 });
  }

  // Usage cap check
  const underCap = await checkUsageCap(user.userId);
  if (!underCap) {
    return new Response("AI usage limit reached ($0.50). Contact an admin to reset.", { status: 429 });
  }

  const { query, documentId, mode } = await request.json();

  if (!query) {
    return new Response("Query is required", { status: 400 });
  }

  // Generate query embedding
  const embResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query.slice(0, 8000),
  });
  const queryEmbedding = embResponse.data[0].embedding;
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  let contextChunks: { text: string; title: string; docId: string }[];

  if (documentId && mode !== "all") {
    // Chat with a specific document
    const chunks = await sql.query(
      `SELECT e.chunk_text, d.title, d.id as doc_id
       FROM embeddings e
       JOIN documents d ON d.id = e.document_id
       WHERE e.document_id = $1
       ORDER BY e.embedding <=> $2::vector
       LIMIT 5`,
      [documentId, vectorStr]
    );
    contextChunks = chunks.map((c: any) => ({
      text: c.chunk_text,
      title: c.title,
      docId: c.doc_id,
    }));
  } else {
    // Chat across all documents
    const chunks = await sql.query(
      `SELECT e.chunk_text, d.title, d.id as doc_id
       FROM embeddings e
       JOIN documents d ON d.id = e.document_id
       ORDER BY e.embedding <=> $1::vector
       LIMIT 8`,
      [vectorStr]
    );
    contextChunks = chunks.map((c: any) => ({
      text: c.chunk_text,
      title: c.title,
      docId: c.doc_id,
    }));
  }

  // Build a lookup of docId → title for the AI to reference
  const docMap = new Map<string, string>();
  contextChunks.forEach((c) => docMap.set(c.docId, c.title));
  const docList = [...docMap.entries()]
    .map(([id, title]) => `- "${title}" → link as [${title}](/doc/${id})`)
    .join("\n");

  const context = contextChunks
    .map((c) => `[From "${c.title}" (ID: ${c.docId})]\n${c.text}`)
    .join("\n\n---\n\n");

  const linkInstruction = `\n\nIMPORTANT: When you mention or cite a document, ALWAYS use a markdown link to it. Use the format [Document Title](/doc/DOCID). Here are the available documents and their links:\n${docList}\n\nFor example, write: "According to [Using Technology to Improve Education](/doc/BCNUTSXS), ..." — never just mention a title without linking it.`;

  const systemPrompt =
    documentId && mode !== "all"
      ? `You are a research assistant helping users understand evidence from the EdTech Hub Evidence Library. Answer questions based on the provided document context. Be specific, cite relevant details, and note when information is not available in the context.${linkInstruction}`
      : `You are a research assistant for the EdTech Hub Evidence Library. Synthesize evidence across multiple documents to answer the question. Cite which documents support each point. Be specific and evidence-based.${linkInstruction}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Evidence context:\n\n${context}\n\n---\n\nQuestion: ${query}`,
      },
    ],
    max_tokens: 1500,
  });

  const encoder = new TextEncoder();
  let totalOutputTokens = 0;
  // Estimate input tokens: ~4 chars per token
  const estimatedInputTokens = Math.ceil((systemPrompt.length + context.length + query.length) / 4);

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          controller.enqueue(encoder.encode(text));
          totalOutputTokens += Math.ceil(text.length / 4);
        }
      }
      // Record usage after stream completes
      await recordUsage(user.userId, estimatedInputTokens, totalOutputTokens);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
