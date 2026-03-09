import fs from 'fs';

const DEFAULT_PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin';

export function resolveOpenClawBin() {
  const candidates = [
    process.env.OPENCLAW_BIN,
    '/opt/homebrew/bin/openclaw',
    '/usr/local/bin/openclaw',
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return 'openclaw';
}

export function buildOpenClawEnv() {
  const path = process.env.PATH || '';
  return { ...process.env, PATH: `${DEFAULT_PATH_PREFIX}:${path}` };
}
