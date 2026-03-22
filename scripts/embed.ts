import { neon } from "@neondatabase/serverless";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chunkText(
  text: string,
  maxWords = 400,
  overlapWords = 50
): string[] {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const chunk = words.slice(start, start + maxWords).join(" ");
    if (chunk.trim()) chunks.push(chunk);
    start += maxWords - overlapWords;
  }
  return chunks;
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

async function generateSummary(
  title: string,
  abstract: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a research summarizer for education technology evidence. Write a 2-3 sentence plain-language summary suitable for policymakers and practitioners in low- and middle-income countries. Focus on key findings and practical implications. Be concise.",
      },
      {
        role: "user",
        content: `Title: ${title}\n\nAbstract: ${abstract}`,
      },
    ],
    max_tokens: 200,
  });
  return response.choices[0].message.content ?? "";
}

async function main() {
  console.log("=== Embedding Pipeline ===\n");

  // Fetch all documents from DB
  const docs = await sql`SELECT id, title, abstract, full_text FROM documents ORDER BY id`;
  console.log(`Found ${docs.length} documents to process.\n`);

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    console.log(
      `[${i + 1}/${docs.length}] ${doc.title?.slice(0, 60)}...`
    );

    // Build text to embed: title + abstract + full_text
    const textParts = [doc.title];
    if (doc.abstract) textParts.push(doc.abstract);
    if (doc.full_text) textParts.push(doc.full_text);
    const fullText = textParts.join("\n\n");

    // Chunk the text
    const chunks = chunkText(fullText);
    console.log(`  ${chunks.length} chunk(s)`);

    // Generate embeddings for each chunk
    for (let j = 0; j < chunks.length; j++) {
      try {
        const embedding = await getEmbedding(chunks[j]);
        const vectorStr = `[${embedding.join(",")}]`;

        await sql.query(
          `INSERT INTO embeddings (document_id, chunk_index, chunk_text, embedding)
           VALUES ($1, $2, $3, $4::vector)
           ON CONFLICT (document_id, chunk_index) DO UPDATE SET
             chunk_text = EXCLUDED.chunk_text,
             embedding = EXCLUDED.embedding`,
          [doc.id, j, chunks[j], vectorStr]
        );
        process.stdout.write(".");
      } catch (e: any) {
        console.warn(`\n  Embedding failed for chunk ${j}: ${e.message}`);
      }
    }
    console.log(" embedded");

    // Generate AI summary if abstract exists and no summary yet
    if (doc.abstract && doc.abstract.length > 50) {
      try {
        const summary = await generateSummary(doc.title, doc.abstract);
        await sql.query("UPDATE documents SET ai_summary = $1 WHERE id = $2", [
          summary,
          doc.id,
        ]);
        console.log("  summary generated");
      } catch (e: any) {
        console.warn(`  Summary failed: ${e.message}`);
      }
    }

    // Small delay to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n=== Embedding pipeline complete ===");

  // Print stats
  const embCount = await sql`SELECT COUNT(*) as count FROM embeddings`;
  const docCount = await sql`SELECT COUNT(*) as count FROM documents WHERE ai_summary IS NOT NULL`;
  console.log(`Total embeddings: ${embCount[0].count}`);
  console.log(`Documents with summaries: ${docCount[0].count}`);
}

main().catch(console.error);
