import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

async function generateIcon(size) {
  const fontSize = Math.round(size * 0.38);
  const cornerRadius = Math.round(size * 0.15);
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#FFFDF7"/>
    <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="#FFD600"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
      font-family="sans-serif" font-weight="700" font-size="${fontSize}" fill="#0D0D0D">SM</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);

  console.log(`Generated icon-${size}.png`);
}

async function generateMaskableIcon(size) {
  const fontSize = Math.round(size * 0.28);
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#FFD600"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
      font-family="sans-serif" font-weight="700" font-size="${fontSize}" fill="#0D0D0D">SM</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-maskable-${size}.png`);

  console.log(`Generated icon-maskable-${size}.png`);
}

await generateIcon(192);
await generateIcon(512);
await generateMaskableIcon(192);
await generateMaskableIcon(512);
