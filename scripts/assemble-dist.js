const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'public_dist');

console.log('[CMSys Logistics] Assembling static distribution package in public_dist...');

if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });
fs.mkdirSync(path.join(dist, '_next'), { recursive: true });

// Copy pre-rendered index.html
const indexHtmlSrc = path.join(root, '.next/server/app/index.html');
if (fs.existsSync(indexHtmlSrc)) {
  fs.copyFileSync(indexHtmlSrc, path.join(dist, 'index.html'));
  console.log('✓ Copied index.html');
} else {
  console.error('✗ Error: .next/server/app/index.html not found! Run next build first.');
  process.exit(1);
}

// Copy static chunks (_next/static)
const staticSrc = path.join(root, '.next/static');
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, path.join(dist, '_next/static'), { recursive: true });
  console.log('✓ Copied _next/static assets');
} else {
  console.error('✗ Error: .next/static not found!');
  process.exit(1);
}

// Copy public assets
const publicSrc = path.join(root, 'public');
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, dist, { recursive: true });
  console.log('✓ Copied public assets');
}

console.log('[CMSys Logistics] Distribution ready for Firebase Hosting deployment.');
