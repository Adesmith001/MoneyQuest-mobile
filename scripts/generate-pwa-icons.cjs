// One-off script: generates the PWA icon set from assets/icon.png into public/icons/.
// Uses @expo/image-utils (bundled with the Expo CLI) so no new dependencies are added.
const path = require('path');
const fs = require('fs');

// @expo/image-utils is a transitive dep of the Expo CLI and not hoisted to the
// top-level node_modules with pnpm; resolve it from the store directly.
const storeDir = path.join(__dirname, '..', 'node_modules', '.pnpm');
const imageUtilsDir = fs
  .readdirSync(storeDir)
  .find((d) => d.startsWith('@expo+image-utils@'));
if (!imageUtilsDir) {
  console.error('@expo/image-utils not found in pnpm store');
  process.exit(1);
}
const { generateImageAsync, compositeImagesAsync, jimpAsync } = require(
  path.join(storeDir, imageUtilsDir, 'node_modules', '@expo', 'image-utils')
);

const projectRoot = path.resolve(__dirname, '..');
const source = path.join(projectRoot, 'assets', 'icon.png');
const outDir = path.join(projectRoot, 'public', 'icons');

const SIZES = [
  { name: 'logo-white.png', width: 192, height: 192 },
  { name: 'logo-white.png', width: 512, height: 512 },
  { name: 'maskable-512.png', width: 512, height: 512 },
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  for (const size of SIZES) {
    // For the maskable icon, add safe-zone padding (icon artwork at ~60% with a
    // solid background) so it doesn't get clipped by the mask.
    const isMaskable = size.name.startsWith('maskable');
    const padded = {
      ...size,
      src: source,
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    };

    const { source: buffer } = await generateImageAsync(
      { projectRoot, cacheType: 'pwa-icon' },
      isMaskable
        ? {
            ...padded,
            // Maskable icons need the artwork inset; image-utils 'contain'
            // keeps it centered, so we bake padding into a square canvas by
            // pre-compositing: resize onto a white canvas is handled below.
          }
        : padded
    );

    let finalBuffer = buffer;
    if (isMaskable) {
      // Maskable icons need the artwork inset (safe zone ~40% margin). Bake a
      // white 512 canvas and composite a smaller centered artwork on top.
      const bg = await generateImageAsync(
        { projectRoot, cacheType: 'pwa-icon-bg' },
        {
          src: source,
          name: 'maskable-bg.png',
          width: 512,
          height: 512,
          resizeMode: 'cover',
          backgroundColor: '#ffffff',
        }
      );
      const artwork = await generateImageAsync(
        { projectRoot, cacheType: 'pwa-icon-art' },
        {
          src: source,
          name: 'maskable-art.png',
          width: 320,
          height: 320,
          resizeMode: 'contain',
        }
      );
      finalBuffer = await compositeImagesAsync({
        foreground: artwork.source,
        background: bg.source,
      });
      void jimpAsync;
    }

    fs.writeFileSync(path.join(outDir, size.name), finalBuffer);
    console.log('wrote', size.name, finalBuffer.length, 'bytes');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
