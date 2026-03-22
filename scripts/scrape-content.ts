/**
 * Comprehensive content scraper for all 50 documents.
 *
 * For each doc missing full text:
 *  1. Fetch the EdTech Hub page RSC data
 *  2. Extract ALL attachment URLs and the original source URL
 *  3. Try downloading real PDFs from attachment URLs
 *  4. Try scraping the original source URL as a web page
 *  5. As a last resort, use the abstract from RSC data as the full text
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL!);
const BASE_URL = "https://docs.edtechhub.org";

async function downloadAndParsePdf(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 EdTechHubDemo/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5 || buf.toString("utf8", 0, 5) !== "%PDF-") return null;

    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buf);
    if (data.text && data.text.trim().length > 100) {
      const pdfDir = path.resolve(__dirname, "../data/pdfs");
      fs.mkdirSync(pdfDir, { recursive: true });
      const safeName = url.replace(/[^a-zA-Z0-9.]/g, "_").slice(-60) + ".pdf";
      fs.writeFileSync(path.join(pdfDir, safeName), buf);
      return data.text;
    }
    return null;
  } catch {
    return null;
  }
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");

  // Try to find main content
  const mainMatch = html.match(
    /<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i
  );
  if (mainMatch && mainMatch[1].length > 200) {
    text = mainMatch[1];
  }

  text = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

async function scrapeWebPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("pdf")) {
      // It's a PDF served with HTML content type — try parsing
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.toString("utf8", 0, 5) === "%PDF-") {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buf);
        return data.text?.trim().length > 100 ? data.text : null;
      }
    }
    if (!ct.includes("html") && !ct.includes("text")) return null;

    const html = await res.text();
    const text = extractTextFromHtml(html);
    return text.length > 200 ? text : null;
  } catch {
    return null;
  }
}

interface RscDocData {
  abstractNote?: string;
  sourceUrl?: string;
  pdfUrls: string[];
  externalUrls: string[];
}

function parseRscData(html: string): RscDocData {
  const pushes: string[] = [];
  const re = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs;
  let m;
  while ((m = re.exec(html)) !== null) {
    pushes.push(m[1]);
  }
  const data = pushes.join("").replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");

  const result: RscDocData = { pdfUrls: [], externalUrls: [] };

  // Extract abstractNote
  const absMatch = data.match(/"abstractNote"\s*:\s*"([^"]+)"/);
  if (absMatch) result.abstractNote = absMatch[1];

  // Extract original source URL (the "url" field in the item data)
  const urlMatch = data.match(/"url"\s*:\s*"(https?:\/\/(?!docs\.edtechhub)[^"]+)"/);
  if (urlMatch) result.sourceUrl = urlMatch[1];

  // Find all EdTech Hub download URLs
  const ehubDlRe = /https?:\/\/docs\.edtechhub\.org\/lib\/[A-Z0-9]+\/download\/[A-Z0-9]+\/[^\s"',\\}]+/g;
  while ((m = ehubDlRe.exec(data)) !== null) {
    result.pdfUrls.push(decodeURIComponent(m[0]));
  }

  // Find all external URLs that look like content (not images, css, js)
  const extUrlRe = /https?:\/\/(?!docs\.edtechhub)[^\s"',\\}]+/g;
  while ((m = extUrlRe.exec(data)) !== null) {
    const url = m[0];
    if (
      !url.includes(".css") &&
      !url.includes(".js") &&
      !url.includes(".png") &&
      !url.includes(".jpg") &&
      !url.includes(".svg") &&
      !url.includes("favicon") &&
      !url.includes("google-analytics") &&
      !url.includes("googleapis") &&
      url.length < 500
    ) {
      result.externalUrls.push(url);
    }
  }

  return result;
}

async function main() {
  console.log("=== Comprehensive Content Scraper ===\n");

  const docs = await sql`SELECT id, title, url, full_text, abstract FROM documents ORDER BY id`;
  console.log(`Found ${docs.length} documents.\n`);

  let alreadyHave = 0;
  let scraped = 0;
  let usedAbstract = 0;
  let failed = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const title = (doc.title as string).slice(0, 50);

    if (doc.full_text && (doc.full_text as string).length > 200) {
      alreadyHave++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${docs.length}] ${doc.id} ${title}... `);

    // Step 1: Fetch and parse the EdTech Hub page RSC data
    let rscData: RscDocData | null = null;
    try {
      const res = await fetch(`${BASE_URL}/lib/${doc.id}`, {
        headers: { "User-Agent": "EdTechHubDemo/1.0" },
      });
      if (res.ok) {
        rscData = parseRscData(await res.text());
      }
    } catch {}

    let fullText: string | null = null;

    // Step 2: Try downloading PDFs from EdTech Hub attachments
    if (rscData) {
      for (const pdfUrl of rscData.pdfUrls) {
        if (fullText) break;
        process.stdout.write("pdf... ");
        fullText = await downloadAndParsePdf(pdfUrl);
      }
    }

    // Step 3: Try the original source URL
    if (!fullText && rscData?.sourceUrl) {
      process.stdout.write("source... ");
      // If source URL is a PDF
      if (rscData.sourceUrl.includes(".pdf")) {
        fullText = await downloadAndParsePdf(rscData.sourceUrl);
      }
      if (!fullText) {
        fullText = await scrapeWebPage(rscData.sourceUrl);
      }
    }

    // Step 4: Try external URLs from the RSC data
    if (!fullText && rscData) {
      // Prioritize URLs that look like they have content (not just landing pages)
      const contentUrls = rscData.externalUrls.filter(
        (u) =>
          u.includes(".pdf") ||
          u.includes("/article") ||
          u.includes("/report") ||
          u.includes("/document") ||
          u.includes("/publication") ||
          u.includes("/blog") ||
          u.includes("/news") ||
          u.includes("/feature") ||
          u.includes("/story") ||
          u.includes("zenodo.org") ||
          u.includes("worldbank.org") ||
          u.includes("unicef.org") ||
          u.includes("globalpartnership.org")
      );
      for (const url of contentUrls.slice(0, 3)) {
        if (fullText) break;
        process.stdout.write("ext... ");
        if (url.includes(".pdf")) {
          fullText = await downloadAndParsePdf(url);
        } else {
          fullText = await scrapeWebPage(url);
        }
      }
    }

    // Step 5: Use the abstract from RSC if nothing else worked
    if (!fullText) {
      const abstract = rscData?.abstractNote || (doc.abstract as string) || "";
      if (abstract.length > 30 && !abstract.startsWith("An output of the EdTech Hub")) {
        fullText = `${doc.title}\n\n${abstract}`;
        usedAbstract++;
        process.stdout.write("abstract... ");
      }
    }

    if (fullText) {
      const truncated = fullText.slice(0, 50000);
      await sql.query("UPDATE documents SET full_text = $1 WHERE id = $2", [
        truncated,
        doc.id,
      ]);
      scraped++;
      console.log(`OK (${truncated.length} chars)`);
    } else {
      failed++;
      console.log("FAILED");
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n=== Results ===`);
  console.log(`Already had text: ${alreadyHave}`);
  console.log(`Newly scraped (web/pdf): ${scraped - usedAbstract}`);
  console.log(`Used abstract as fallback: ${usedAbstract}`);
  console.log(`Failed completely: ${failed}`);
  console.log(`Total with content: ${alreadyHave + scraped}/${docs.length}`);
}

main().catch(console.error);
