const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve('public_dist/index.html'), 'utf8');
const regex = /\/(_next\/static\/[a-zA-Z0-9_\-\./]+)/g;
let match;
let total = 0;
let missing = 0;

while ((match = regex.exec(html)) !== null) {
  total++;
  const rel = match[1];
  const full = path.resolve('public_dist', rel);
  if (!fs.existsSync(full)) {
    console.log('MISSING:', rel);
    missing++;
  }
}

console.log(`Total chunks verified: ${total}, Missing: ${missing}`);
