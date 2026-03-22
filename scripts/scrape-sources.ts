/**
 * Scrape actual source URLs for all documents using:
 *  1. Simple fetch() first (fast, works for static sites)
 *  2. Playwright headless browser fallback (for JS-rendered pages)
 *  3. PDF download + parse for PDF URLs
 *
 * Stores the scraped text in documents.full_text
 */

import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL!);

function extractTextFromHtml(html: string): string {
  // Remove non-content elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");

  // Try main content area first
  const mainMatch = html.match(
    /<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i
  );
  if (mainMatch && mainMatch[1].length > 500) {
    text = mainMatch[1];
  }

  // Strip tags, decode entities, collapse whitespace
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

async function fetchSimple(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("html") && !ct.includes("text")) return null;
    const html = await res.text();
    const text = extractTextFromHtml(html);
    return text.length > 300 ? text : null;
  } catch {
    return null;
  }
}

async function fetchWithPlaywright(
  url: string,
  browser: any
): Promise<string | null> {
  let page: any = null;
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    });
    page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    // Wait for content to render
    await page.waitForTimeout(3000);

    // Extract text from the page
    const text = await page.evaluate(() => {
      // Remove non-content elements
      const remove = document.querySelectorAll(
        "nav, footer, header, aside, script, style, noscript, [role=navigation], [role=banner], [role=contentinfo]"
      );
      remove.forEach((el: Element) => el.remove());

      // Try main content area
      const main =
        document.querySelector("main") ||
        document.querySelector("article") ||
        document.querySelector('[role="main"]') ||
        document.querySelector(".content, .article, .post, .entry-content");

      const target = main || document.body;
      return target.innerText || target.textContent || "";
    });

    await context.close();
    const cleaned = (text || "").replace(/\s+/g, " ").trim();
    return cleaned.length > 300 ? cleaned : null;
  } catch {
    if (page) {
      try {
        await page.context().close();
      } catch {}
    }
    return null;
  }
}

async function downloadAndParsePdf(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EdTechHubDemo/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5 || buf.toString("utf8", 0, 5) !== "%PDF-") return null;
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buf);
    return data.text?.trim().length > 100 ? data.text : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== Source URL Scraper (fetch + Playwright) ===\n");

  const docs = await sql`
    SELECT id, title, source_url, abstract, full_text
    FROM documents
    WHERE source_url IS NOT NULL
    ORDER BY id
  `;
  console.log(`${docs.length} documents with source URLs.\n`);

  // Launch browser
  console.log("Launching headless browser...\n");
  const browser = await chromium.launch({ headless: true });

  let fetchSuccess = 0;
  let playwrightSuccess = 0;
  let pdfSuccess = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const url = doc.source_url as string;
    const title = (doc.title as string).slice(0, 45);
    const existingLen = (doc.full_text as string)?.length || 0;

    process.stdout.write(`[${i + 1}/${docs.length}] ${doc.id} ${title}... `);

    // Skip if we already have substantial content (>5000 chars)
    if (existingLen > 5000) {
      skipped++;
      console.log(`skip (already ${existingLen} chars)`);
      continue;
    }

    let text: string | null = null;
    let method = "";

    // Strategy 1: PDF URLs
    if (url.includes(".pdf")) {
      text = await downloadAndParsePdf(url);
      if (text) {
        method = "pdf";
        pdfSuccess++;
      }
    }

    // Strategy 2: Simple fetch
    if (!text) {
      text = await fetchSimple(url);
      if (text) {
        method = "fetch";
        fetchSuccess++;
      }
    }

    // Strategy 3: Playwright headless browser
    if (!text) {
      text = await fetchWithPlaywright(url, browser);
      if (text) {
        method = "playwright";
        playwrightSuccess++;
      }
    }

    if (text) {
      // Prepend the abstract/metadata so we keep both
      const existingAbstract = (doc.abstract as string) || "";
      const combined = existingAbstract
        ? `${doc.title}\n\n${existingAbstract}\n\n---\n\nFull content from source:\n\n${text}`
        : `${doc.title}\n\n${text}`;
      const truncated = combined.slice(0, 50000);

      await sql.query("UPDATE documents SET full_text = $1 WHERE id = $2", [
        truncated,
        doc.id,
      ]);
      console.log(`${method} (${truncated.length} chars)`);
    } else {
      failed++;
      console.log("FAILED");
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  await browser.close();

  console.log(`\n=== Results ===`);
  console.log(`Skipped (already had content): ${skipped}`);
  console.log(`Fetch success: ${fetchSuccess}`);
  console.log(`Playwright success: ${playwrightSuccess}`);
  console.log(`PDF success: ${pdfSuccess}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total with content: ${skipped + fetchSuccess + playwrightSuccess + pdfSuccess}/${docs.length}`);
}

main().catch(console.error);
