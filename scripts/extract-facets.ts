/**
 * Extract structured facets from each document using AI.
 * Facets: location, methodology, format, technology, intervention, outcome
 */

import { neon } from "@neondatabase/serverless";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FACET_PROMPT = `Analyze this education technology document and extract structured facets. Return ONLY valid JSON with these keys (use arrays of short strings, 1-4 words each). If a facet doesn't apply, use an empty array.

{
  "location": ["countries or regions mentioned, e.g. Sierra Leone, East Africa, Vietnam, Global"],
  "methodology": ["research methods, e.g. RCT, Case Study, Literature Review, Landscape Scan, Mixed Methods, Survey"],
  "format": ["document type, e.g. Report, Journal Article, Policy Brief, Blog Post, Toolkit, Framework"],
  "technology": ["technologies discussed, e.g. Mobile Learning, Radio, SMS, Tablets, Online Platform, AI, Digital Assessment"],
  "intervention": ["education interventions, e.g. Teacher Training, Girls Education, Personalized Learning, Distance Learning, Literacy, Numeracy"],
  "outcome": ["outcomes measured or discussed, e.g. Learning Outcomes, Access, Equity, Teacher Performance, Cost-Effectiveness, Policy Change"]
}`;

async function extractFacets(
  title: string,
  abstract: string,
  fullText: string
): Promise<Record<string, string[]>> {
  const input = `Title: ${title}\n\nAbstract: ${abstract || "N/A"}\n\nContent excerpt: ${(fullText || "").slice(0, 3000)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: FACET_PROMPT },
      { role: "user", content: input },
    ],
    max_tokens: 400,
    temperature: 0.1,
  });

  const text = response.choices[0].message.content?.trim() || "{}";
  try {
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.warn("    Failed to parse JSON:", text.slice(0, 100));
    return {};
  }
}

async function main() {
  console.log("=== Facet Extraction ===\n");

  const docs = await sql`SELECT id, title, abstract, full_text FROM documents ORDER BY id`;
  console.log(`Processing ${docs.length} documents.\n`);

  // Check which already have facets
  const existing = await sql`SELECT DISTINCT document_id FROM document_facets`;
  const existingIds = new Set(existing.map((r: any) => r.document_id));
  console.log(`${existingIds.size} already have facets.\n`);

  let processed = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    if (existingIds.has(doc.id)) continue;

    process.stdout.write(`[${i + 1}/${docs.length}] ${doc.id} ${(doc.title as string).slice(0, 45)}... `);

    const facets = await extractFacets(
      doc.title as string,
      doc.abstract as string,
      doc.full_text as string
    );

    // Insert facets
    let count = 0;
    for (const [facetType, values] of Object.entries(facets)) {
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        if (!value || typeof value !== "string") continue;
        try {
          await sql.query(
            `INSERT INTO document_facets (document_id, facet_type, facet_value)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [doc.id, facetType, value.trim()]
          );
          count++;
        } catch {}
      }
    }

    console.log(`${count} facets`);
    processed++;

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n=== Done! Processed ${processed} documents. ===`);

  // Print summary
  const summary = await sql`
    SELECT facet_type, COUNT(DISTINCT facet_value) as values, COUNT(*) as total
    FROM document_facets GROUP BY facet_type ORDER BY facet_type
  `;
  console.log("\nFacet summary:");
  summary.forEach((r: any) =>
    console.log(`  ${r.facet_type}: ${r.values} unique values, ${r.total} assignments`)
  );
}

main().catch(console.error);
