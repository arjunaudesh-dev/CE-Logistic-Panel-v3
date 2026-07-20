const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  try {
    if (fs.existsSync(from)) {
      fs.mkdirSync(to, { recursive: true });
      fs.cpSync(from, to, { recursive: true, force: true });
      console.log(`Successfully copied ${from} to ${to}`);
    } else {
      console.warn(`Source folder ${from} does not exist, skipping copy.`);
    }
  } catch (err) {
    console.error(`Error copying ${from} to ${to}:`, err);
    process.exit(1);
  }
}

const root = path.join(__dirname, '..');
copyFolderSync(path.join(root, '.next/static'), path.join(root, '.next/standalone/.next/static'));
copyFolderSync(path.join(root, 'public'), path.join(root, '.next/standalone/public'));
