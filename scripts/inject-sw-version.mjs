import { readFileSync, writeFileSync } from "fs";

const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString();
const swPath = "./public/sw.js";
const content = readFileSync(swPath, "utf-8");
const updated = content.replace('"splitmate-v__BUILD_ID__"', `"splitmate-v${buildId}"`);

if (content === updated) {
  console.warn("SW inject: pattern not found — sw.js may already be injected or pattern changed.");
} else {
  writeFileSync(swPath, updated);
  console.log(`Service worker versioned: splitmate-v${buildId}`);
}
