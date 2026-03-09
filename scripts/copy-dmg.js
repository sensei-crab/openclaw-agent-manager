const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const desktopDir = path.join(process.env.HOME || '', 'Desktop');

if (!fs.existsSync(distDir)) {
  console.error('dist directory not found:', distDir);
  process.exit(1);
}

const dmgs = fs.readdirSync(distDir)
  .filter((f) => f.toLowerCase().endsWith('.dmg'))
  .map((f) => ({
    name: f,
    path: path.join(distDir, f),
    mtime: fs.statSync(path.join(distDir, f)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (dmgs.length === 0) {
  console.error('No DMG files found in dist');
  process.exit(1);
}

const latest = dmgs[0];
const dest = path.join(desktopDir, latest.name);
fs.copyFileSync(latest.path, dest);
console.log(`Copied ${latest.name} to Desktop`);
