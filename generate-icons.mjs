import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "public/icons/SM_logo.png");
const outDir = path.resolve(__dirname, "public/icons");
const publicDir = path.resolve(__dirname, "public");

const BRAND_BG = { r: 253, g: 200, b: 47, alpha: 1 }; // #FDC82F
const MASKABLE_PADDING = 0.1; // 10% per side keeps the logo inside the ~80% W3C safe zone, so launchers (Xiaomi/MIUI, etc.) don't crop it
const FAVICON_RADIUS_PERCENT = 0.2; // 20% corner radius — noticeably rounded, not circular

async function generateMaskable(size) {
  const logoSize = Math.round(size * (1 - MASKABLE_PADDING * 2));
  const offset = Math.round((size - logoSize) / 2);

  const resizedLogo = await sharp(src)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: resizedLogo, top: offset, left: offset }])
    .png()
    .toBuffer();
}

async function generateRoundedFavicon(size) {
  const radius = Math.round(size * FAVICON_RADIUS_PERCENT);

  const roundedMask = Buffer.from(
    `<svg width="${size}" height="${size}">
       <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/>
     </svg>`
  );

  const resizedLogo = await sharp(src)
    .resize(size, size, { fit: "cover" })
    .png()
    .toBuffer();

  return sharp(resizedLogo)
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function generate() {
  console.log("Generating PWA icons from SM_logo.png...\n");

  // icon-192.png (any) - plain resize, no padding.
  // This is the version that already renders correctly on iOS, so it's left untouched.
  await sharp(src)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, "icon-192.png"));
  console.log("✓ icon-192.png");

  // icon-512.png (any)
  await sharp(src)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, "icon-512.png"));
  console.log("✓ icon-512.png");

  // icon-maskable-192.png - padded into a safe zone so Android launchers
  // (including Xiaomi/MIUI, which mask aggressively) don't crop the logo
  const mask192 = await generateMaskable(192);
  await fs.promises.writeFile(path.join(outDir, "icon-maskable-192.png"), mask192);
  console.log("✓ icon-maskable-192.png");

  // icon-maskable-512.png
  const mask512 = await generateMaskable(512);
  await fs.promises.writeFile(path.join(outDir, "icon-maskable-512.png"), mask512);
  console.log("✓ icon-maskable-512.png");

  // Favicons (rounded corners)
  const favicon16 = await generateRoundedFavicon(16);
  await fs.promises.writeFile(path.join(publicDir, "favicon-16x16.png"), favicon16);
  console.log("✓ favicon-16x16.png  →  public/");

  const favicon32 = await generateRoundedFavicon(32);
  await fs.promises.writeFile(path.join(publicDir, "favicon-32x32.png"), favicon32);
  console.log("✓ favicon-32x32.png  →  public/");

  await fs.promises.writeFile(path.join(publicDir, "favicon.ico"), favicon32);
  console.log("✓ favicon.ico        →  public/");

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Done! Icons in public/icons/, favicons in public/

🌐 Browser / iOS (any) → icon-192.png, icon-512.png   (no padding, unchanged)
🤖 Android (maskable)  → icon-maskable-192.png, icon-maskable-512.png   (10% safe-zone padding)
🔖 Favicons (rounded)  → favicon-16x16.png, favicon-32x32.png, favicon.ico   (20% corner radius)

No manual copy step needed this time — icon-192/512 are
never overwritten by the maskable versions, so iOS keeps
rendering exactly as it did before.

Make sure manifest.json still has two separate icon entries:
  { "src": "/icons/icon-192.png", "purpose": "any", ... }
  { "src": "/icons/icon-maskable-192.png", "purpose": "maskable", ... }
(and the matching 512 pair)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

generate().catch(console.error);
