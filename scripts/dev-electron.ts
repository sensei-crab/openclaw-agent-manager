import { spawn } from 'child_process';
import path from 'path';

const electronPath = require('electron');
const mainPath = path.join(__dirname, '../dist/main/main.js');

const tsc = spawn('tsc', ['-p', 'tsconfig.main.json', '--watch'], { stdio: 'inherit' });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await wait(1500);
  const electron = spawn(electronPath, [mainPath], { stdio: 'inherit' });

  const cleanup = () => {
    tsc.kill('SIGTERM');
    electron.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
