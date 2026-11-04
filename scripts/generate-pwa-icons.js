import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceLogo = path.resolve('public/assets/aistudio/logo_afta_c1e6655b.jpeg');
const publicDir = path.resolve('public');

async function generate() {
  console.log('Generating PWA icons from:', sourceLogo);

  // 1. pwa-192x192.png
  await sharp(sourceLogo)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 2. pwa-512x512.png
  await sharp(sourceLogo)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 3. pwa-maskable-512x512.png (with safe-zone 15% padding)
  await sharp(sourceLogo)
    .resize(410, 410, { fit: 'contain' })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#020617'
    })
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 4. apple-touch-icon.png (180x180)
  await sharp(sourceLogo)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 5. favicon.ico / favicon.png
  await sharp(sourceLogo)
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  // 6. Brand SVG icon
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#020617"/>
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#f59e0b" stroke-width="8" stroke-dasharray="16 12" opacity="0.4"/>
  <g transform="translate(256, 210)">
    <circle r="110" fill="#0f172a" stroke="#f59e0b" stroke-width="12"/>
    <path d="M-28 -95 L28 -95 L38 -65 L70 -50 L95 -75 L125 -45 L110 -15 L125 18 L155 28 L155 85 L125 95 L110 125 L125 155 L95 185 L65 170 L35 185 L25 215 L-25 215" fill="none" stroke="#f59e0b" stroke-width="6" opacity="0.3"/>
    <circle r="45" fill="#f59e0b"/>
    <circle r="22" fill="#020617"/>
  </g>
  <text x="256" y="380" font-family="Arial, sans-serif" font-weight="900" font-size="64" fill="#ffffff" text-anchor="middle" letter-spacing="4">IFTA</text>
  <text x="256" y="420" font-family="Arial, sans-serif" font-weight="700" font-size="20" fill="#f59e0b" text-anchor="middle" letter-spacing="3">MANUTENÇÃO & CDI</text>
</svg>`;

  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
  console.log('PWA icons successfully generated in /public!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
