import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sql = neon(process.env.DATABASE_URL!);
const BASE_URL = "https://docs.edtechhub.org";

interface AttachmentInfo {
  docId: string;
  title: string;
  pdfUrl: string | null;
}

async function getDocumentAttachments(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/lib/${key}`, {
      headers: { "User-Agent": "EdTechHubDemo/1.0", Accept: "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract RSC push data
    const pushes: string[] = [];
    const re = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs;
    let m;
    while ((m = re.exec(html)) !== null) {
      pushes.push(m[1]);
    }
    const fullData = pushes.join("")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\\\/g, "\\");

    // Find PDF attachment URLs
    // Priority 1: EdTech Hub download URLs (/lib/{KEY}/download/{ATTACH_KEY}/{filename}.pdf)
    const ehubRe = /https?:\/\/docs\.edtechhub\.org\/lib\/[A-Z0-9]+\/download\/[A-Z0-9]+\/[^\s"',\\}]+\.pdf/g;
    let match;
    while ((match = ehubRe.exec(fullData)) !== null) {
      return decodeURIComponent(match[0].replace(/\\u0026/g, "&"));
    }

    // Priority 2: Direct PDF links from other sources
    const pdfRe = /https?:\/\/[^\s"',\\}]+\.pdf(?:\?[^\s"',\\}]*)?/g;
    while ((match = pdfRe.exec(fullData)) !== null) {
      const url = match[0].replace(/["'\\,}\]]+$/, "");
      if (!url.includes("favicon") && !url.includes("logo")) {
        return url;
      }
    }

    // Priority 3: Zenodo records
    const zenodoRe = /https?:\/\/zenodo\.org\/records?\/\d+\/files\/[^\s"',\\}]+/g;
    while ((match = zenodoRe.exec(fullData)) !== null) {
      return match[0].replace(/["'\\,}\]]+$/, "");
    }

    return null;
  } catch {
    return null;
  }
}

async function downloadPdf(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EdTechHubDemo/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    // Accept PDF, octet-stream, and anything from known PDF URLs
    const isPdfUrl = url.includes(".pdf") || url.includes("/download/");
    if (!contentType.includes("pdf") && !contentType.includes("octet-stream") && !isPdfUrl) {
      return null;
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const pdfParse = require("pdf-parse");
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text || "";
  } catch (e: any) {
    console.warn(`    PDF parse error: ${e.message}`);
    return "";
  }
}

async function main() {
  console.log("=== PDF Scraper & Text Extractor ===\n");

  // Get all document IDs from the database
  const docs = await sql`SELECT id, title FROM documents ORDER BY id`;
  console.log(`Found ${docs.length} documents to check for PDFs.\n`);

  const pdfDir = path.resolve(__dirname, "../data/pdfs");
  fs.mkdirSync(pdfDir, { recursive: true });

  let found = 0;
  let parsed = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    process.stdout.write(`[${i + 1}/${docs.length}] ${doc.id} ${(doc.title as string).slice(0, 45)}... `);

    // Step 1: Find PDF URL from the document page
    const pdfUrl = await getDocumentAttachments(doc.id as string);
    if (!pdfUrl) {
      console.log("no PDF found");
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    found++;
    console.log(`\n    URL: ${pdfUrl.slice(0, 80)}...`);

    // Step 2: Download PDF
    process.stdout.write("    downloading... ");
    const pdfBuffer = await downloadPdf(pdfUrl);
    if (!pdfBuffer) {
      console.log("download failed");
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }
    console.log(`${(pdfBuffer.length / 1024).toFixed(0)}KB`);

    // Save PDF to disk
    const pdfPath = path.join(pdfDir, `${doc.id}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Step 3: Extract text from PDF
    process.stdout.write("    extracting text... ");
    const text = await extractTextFromPdf(pdfBuffer);
    if (!text || text.trim().length < 100) {
      console.log("no usable text extracted");
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    // Truncate to reasonable size (first 50K chars)
    const truncatedText = text.slice(0, 50000);
    console.log(`${truncatedText.length} chars`);

    // Step 4: Update database with full text
    await sql.query("UPDATE documents SET full_text = $1 WHERE id = $2", [
      truncatedText,
      doc.id,
    ]);
    parsed++;
    console.log("    saved to database");

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n=== PDF Scraper Complete ===`);
  console.log(`PDFs found: ${found}`);
  console.log(`Successfully parsed: ${parsed}`);
  console.log(`Documents with full text: ${parsed}/${docs.length}`);
}

main().catch(console.error);
