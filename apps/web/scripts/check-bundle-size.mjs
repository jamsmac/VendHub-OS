import { statSync, readdirSync } from "node:fs";
import path from "node:path";

const TOTAL_JS_BUDGET = 8 * 1024 * 1024; // 8MB total JS budget
const WARN_RATIO = 0.9;

const buildDir = path.resolve(".next/static/chunks");

function walkJs(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkJs(full));
    else if (entry.name.endsWith(".js")) results.push(full);
  }
  return results;
}

let files;
try {
  files = walkJs(buildDir);
} catch {
  console.error("No build output found. Run `pnpm build` first.");
  process.exit(1);
}

const totalSize = files.reduce((sum, f) => sum + statSync(f).size, 0);
const totalKb = (totalSize / 1024).toFixed(1);
const budgetKb = (TOTAL_JS_BUDGET / 1024).toFixed(1);
const ratio = totalSize / TOTAL_JS_BUDGET;

console.log(`JS chunks: ${files.length} files`);

if (ratio >= 1.0) {
  console.error(`❌ Total JS: ${totalKb}KB > ${budgetKb}KB budget`);
  process.exit(1);
} else if (ratio >= WARN_RATIO) {
  console.warn(
    `⚠️  Total JS: ${totalKb}KB is ${(ratio * 100).toFixed(0)}% of ${budgetKb}KB budget`,
  );
} else {
  console.log(`✅ Total JS: ${totalKb}KB / ${budgetKb}KB (${(ratio * 100).toFixed(0)}%)`);
}
