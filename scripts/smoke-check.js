const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distMain = path.join(projectRoot, 'dist', 'main', 'main.js');
const distRenderer = path.join(projectRoot, 'dist', 'renderer', 'index.html');

const missing = [];
if (!fs.existsSync(distMain)) missing.push(distMain);
if (!fs.existsSync(distRenderer)) missing.push(distRenderer);

if (missing.length) {
  console.error('Smoke check failed. Missing build outputs:');
  for (const m of missing) console.error(' -', m);
  process.exit(1);
}

console.log('Smoke check passed. Build outputs present.');
process.exit(0);
