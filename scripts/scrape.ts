import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL!);
const BASE_URL = "https://docs.edtechhub.org";
const RIS_URL =
  "https://ocivvlhqiwtxvnycqnia.supabase.co/storage/v1/object/public/new-kerko/2405685/allRIS.ris";

interface DocData {
  id: string;
  title: string;
  abstract: string;
  authors: { firstName: string; lastName: string }[];
  item_type: string;
  date_published: string | null;
  doi: string | null;
  url: string;
  rights: string | null;
  tags: string[];
  collections: any;
  institution: string[];
}

function parseRisKeys(content: string): { id: string; title: string; doi: string | null; type: string }[] {
  const entries: { id: string; title: string; doi: string | null; type: string }[] = [];
  const blocks = content.split(/\nER  - /);
  const typeMap: Record<string, string> = {
    RPRT: "Report", JOUR: "Journal Article", BOOK: "Book",
    CHAP: "Book Section", THES: "Thesis", CONF: "Conference Paper",
    BLOG: "Blog Post", ELEC: "Web Page", GEN: "Document",
  };

  for (const block of blocks) {
    const fields: Record<string, string[]> = {};
    for (const line of block.split("\n")) {
      const m = line.match(/^([A-Z][A-Z0-9])  - (.+)$/);
      if (m) {
        if (!fields[m[1]]) fields[m[1]] = [];
        fields[m[1]].push(m[2].trim());
      }
    }
    if (!fields.ID || !fields.TI) continue;
    // Only include entries that have at least a partial abstract (sign of substance)
    if (fields.AB && fields.AB[0].length > 30) {
      entries.push({
        id: fields.ID[0],
        title: fields.TI[0],
        doi: fields.DO ? fields.DO[0] : null,
        type: typeMap[fields.TY?.[0] || ""] || "Document",
      });
    }
  }
  return entries;
}

async function scrapeDocPage(key: string): Promise<DocData | null> {
  try {
    const res = await fetch(`${BASE_URL}/lib/${key}`, {
      headers: { "User-Agent": "EdTechHubDemo/1.0", Accept: "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract RSC push data and concatenate
    const pushes: string[] = [];
    const re = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs;
    let m;
    while ((m = re.exec(html)) !== null) {
      pushes.push(m[1]);
    }
    let fullData = pushes.join("")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\\\/g, "\\");

    // Find the item JSON: look for "item":{ ... "key":"XXXXXXXX" ... }
    const itemIdx = fullData.indexOf('"item":{');
    if (itemIdx === -1) return null;

    // Extract the item object by matching braces
    const start = itemIdx + 7; // position of opening {
    let depth = 0;
    let end = start;
    for (let i = start; i < fullData.length; i++) {
      if (fullData[i] === "{") depth++;
      if (fullData[i] === "}") {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }

    const itemJson = fullData.substring(start, end);
    let item: any;
    try {
      item = JSON.parse(itemJson);
    } catch {
      return null;
    }

    if (!item.title) return null;

    const creators = Array.isArray(item.creators) ? item.creators : [];
    const authors = creators
      .filter((c: any) => c.creatorType === "author" || !c.creatorType)
      .map((c: any) => ({ firstName: c.firstName || "", lastName: c.lastName || "" }));

    let datePub: string | null = null;
    if (item.date) {
      const d = item.date.split("T")[0];
      // Normalize partial dates: "2022" → "2022-01-01", "2020/03" → "2020-03-01"
      if (/^\d{4}$/.test(d)) {
        datePub = `${d}-01-01`;
      } else if (/^\d{4}\/\d{1,2}$/.test(d)) {
        const [y, m] = d.split("/");
        datePub = `${y}-${m.padStart(2, "0")}-01`;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
        datePub = d;
      } else if (/^\d{4}-\d{2}/.test(d)) {
        datePub = `${d}-01`;
      }
    }

    const tags = (item.tags || [])
      .map((t: any) => (typeof t === "string" ? t : t.tag || t.name || ""))
      .filter((t: string) => t && !t.startsWith("_") && t !== "Hide" && t !== "Internal");

    return {
      id: key,
      title: item.title,
      abstract: item.abstractNote || "",
      authors,
      item_type: item.itemType || "Document",
      date_published: datePub,
      doi: item.DOI || null,
      url: `${BASE_URL}/lib/${key}`,
      rights: item.rights || "Creative Commons Attribution 4.0 International",
      tags,
      collections: item.collectionsData || [],
      institution: item.institution
        ? Array.isArray(item.institution) ? item.institution : [item.institution]
        : [],
    };
  } catch (e: any) {
    return null;
  }
}

async function insertDocument(doc: DocData): Promise<void> {
  await sql.query(
    `INSERT INTO documents (id, title, abstract, authors, item_type, date_published, doi, url, rights, tags, collections, institution)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, abstract = EXCLUDED.abstract, authors = EXCLUDED.authors,
       item_type = EXCLUDED.item_type, date_published = EXCLUDED.date_published,
       doi = EXCLUDED.doi, url = EXCLUDED.url, rights = EXCLUDED.rights,
       tags = EXCLUDED.tags, collections = EXCLUDED.collections, institution = EXCLUDED.institution`,
    [
      doc.id, doc.title, doc.abstract, JSON.stringify(doc.authors),
      doc.item_type, doc.date_published, doc.doi, doc.url, doc.rights,
      doc.tags, JSON.stringify(doc.collections), doc.institution,
    ]
  );
}

async function main() {
  console.log("=== EdTech Hub Document Scraper ===\n");

  // Step 1: Download and parse RIS for document keys
  console.log("Downloading RIS export for document keys...");
  const risRes = await fetch(RIS_URL);
  const risContent = await risRes.text();
  const allKeys = parseRisKeys(risContent);
  console.log(`Found ${allKeys.length} entries with abstracts in RIS.\n`);

  // Sort by recency (approximate: entries appear in reverse chronological order in the RIS)
  // Take top 200 to have buffer for failures (many pages fail RSC parsing)
  const candidates = allKeys.slice(0, 200);

  // Step 2: Scrape individual pages for full data
  console.log("Scraping individual pages for full metadata...\n");
  const docs: DocData[] = [];
  let failures = 0;

  for (let i = 0; i < candidates.length && docs.length < 50; i++) {
    const { id, title } = candidates[i];
    process.stdout.write(
      `  [${i + 1}/${candidates.length}] ${id} ${title.slice(0, 45)}... `
    );

    const doc = await scrapeDocPage(id);
    if (doc && doc.abstract && doc.abstract.length > 30 &&
        !doc.abstract.startsWith("An output of the EdTech Hub")) {
      docs.push(doc);
      console.log(`OK (${doc.abstract.length} chars)`);
    } else if (doc) {
      console.log("skipped (short/boilerplate abstract)");
    } else {
      console.log("failed");
      failures++;
    }

    // Rate limit: 400ms between requests
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nScraped ${docs.length} substantive documents (${failures} failures).\n`);

  // Step 3: Insert into database
  console.log("Inserting into Neon database...");
  let inserted = 0;
  for (const doc of docs) {
    try {
      await insertDocument(doc);
      inserted++;
      process.stdout.write(".");
    } catch (e: any) {
      console.warn(`\n  DB error for ${doc.id}: ${e.message}`);
    }
  }

  console.log(`\n\nDone! ${inserted} documents inserted.\n`);

  // Save raw data
  const outPath = path.resolve(__dirname, "../data");
  fs.mkdirSync(outPath, { recursive: true });
  fs.writeFileSync(
    path.join(outPath, "scraped_docs.json"),
    JSON.stringify(docs, null, 2)
  );
  console.log(`Raw data saved to data/scraped_docs.json`);
}

main().catch(console.error);
