import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "public/icons/SM_logo.png");
const iconsDir = path.resolve(__dirname, "public/icons");
const publicDir = path.resolve(__dirname, "public");

async function generateWithPadding(size, paddingPercent, bgColor = null) {
  const logoSize = Math.round(size * (1 - paddingPercent * 2));
  const padding = Math.round(size * paddingPercent);

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
      background: bgColor ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedLogo, top: padding, left: padding }])
    .png()
    .toBuffer();
}

async function generate() {
  console.log("Generating all PWA icons and favicons...\n");

  // 1. Standard any icons
  console.log("── Standard (any) ──");
  await sharp(src)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, "icon-192.png"));
  console.log("✓ icon-192.png");
  await sharp(src)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, "icon-512.png"));
  console.log("✓ icon-512.png");

  // 2. iOS icons (padding 18%)
  console.log("\n── iOS (padding 18%) ──");
  const IOS_PADDING = 0.18;
  const ios192 = await generateWithPadding(192, IOS_PADDING);
  await fs.promises.writeFile(path.join(iconsDir, "icon-ios-192.png"), ios192);
  console.log("✓ icon-ios-192.png");
  const ios512 = await generateWithPadding(512, IOS_PADDING);
  await fs.promises.writeFile(path.join(iconsDir, "icon-ios-512.png"), ios512);
  console.log("✓ icon-ios-512.png");
  const appleTouch = await generateWithPadding(180, IOS_PADDING);
  await fs.promises.writeFile(
    path.join(publicDir, "apple-touch-icon.png"),
    appleTouch,
  );
  console.log("✓ apple-touch-icon.png  →  public/");

  // 3. Maskable icons (padding 10%)
  console.log("\n── Maskable / Android (padding 10%) ──");
  const MASKABLE_PADDING = 0.1;
  const mask192 = await generateWithPadding(192, MASKABLE_PADDING);
  await fs.promises.writeFile(
    path.join(iconsDir, "icon-maskable-192.png"),
    mask192,
  );
  console.log("✓ icon-maskable-192.png");
  const mask512 = await generateWithPadding(512, MASKABLE_PADDING);
  await fs.promises.writeFile(
    path.join(iconsDir, "icon-maskable-512.png"),
    mask512,
  );
  console.log("✓ icon-maskable-512.png");

  // 4. Favicons
  console.log("\n── Favicons ──");
  await sharp(src)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, "favicon-16x16.png"));
  console.log("✓ favicon-16x16.png  →  public/");
  await sharp(src)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, "favicon-32x32.png"));
  console.log("✓ favicon-32x32.png  →  public/");
  await sharp(src)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, "favicon.ico"));
  console.log("✓ favicon.ico        →  public/");

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Done!

📱 iOS PWA     → public/icons/icon-ios-192/512.png
🤖 Android PWA → public/icons/icon-maskable-192/512.png
🌐 Browser PWA → public/icons/icon-192/512.png
🍎 Apple Touch → public/apple-touch-icon.png
🔖 Favicons    → public/favicon.ico / favicon-16x16/32x32.png

Now, copy these lines:
  cp public/icons/icon-ios-192.png public/icons/icon-192.png
  cp public/icons/icon-ios-512.png public/icons/icon-512.png
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

generate().catch(console.error);
