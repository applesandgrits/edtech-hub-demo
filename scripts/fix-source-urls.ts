/**
 * Extract the actual source URL from each document's EdTech Hub page.
 * The "url" field in the RSC item data points to the original source
 * (e.g., worldometers.info, worldbank.org), not the EdTech Hub page.
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL!);
const BASE_URL = "https://docs.edtechhub.org";

async function main() {
  console.log("=== Extracting Source URLs ===\n");

  const docs = await sql`SELECT id, title FROM documents ORDER BY id`;
  let updated = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    process.stdout.write(`[${i + 1}/${docs.length}] ${doc.id} ... `);

    try {
      const res = await fetch(`${BASE_URL}/lib/${doc.id}`, {
        headers: { "User-Agent": "EdTechHubDemo/1.0" },
      });
      if (!res.ok) { console.log("fetch failed"); continue; }

      const html = await res.text();
      const pushes: string[] = [];
      const re = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs;
      let m;
      while ((m = re.exec(html)) !== null) pushes.push(m[1]);
      const data = pushes.join("").replace(/\\"/g, '"').replace(/\\n/g, "\n");

      // Find the item's url field (the original source, not the EdTech Hub page)
      const urlMatch = data.match(/"url"\s*:\s*"(https?:\/\/(?!docs\.edtechhub\.org)[^"]+)"/);
      if (urlMatch) {
        const sourceUrl = urlMatch[1];
        await sql.query("UPDATE documents SET source_url = $1 WHERE id = $2", [sourceUrl, doc.id]);
        updated++;
        console.log(sourceUrl.slice(0, 70));
      } else {
        console.log("no external URL found");
      }
    } catch {
      console.log("error");
    }

    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\nUpdated ${updated}/${docs.length} documents with source URLs.`);
}

main().catch(console.error);
