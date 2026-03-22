// Orchestrator: runs scrape then embed
import { execSync } from "child_process";
import * as path from "path";

const scriptsDir = path.resolve(__dirname);

console.log("=== EdTech Hub Demo Seed ===\n");
console.log("Step 1: Scraping documents...\n");
execSync(`npx tsx ${path.join(scriptsDir, "scrape.ts")}`, {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
});

console.log("\n\nStep 2: Generating embeddings + summaries...\n");
execSync(`npx tsx ${path.join(scriptsDir, "embed.ts")}`, {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
});

console.log("\n=== Seed complete! Run `npm run dev` to start the demo. ===");
