const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const maxMinutes = Number(process.env.RECURSIVE_MAX_MINUTES || '30');
const stepTimeoutMs = Number(process.env.RECURSIVE_STEP_TIMEOUT_MS || '300000'); // 5 min

const seenErrors = new Set();
let cycle = 0;
const start = Date.now();

function runCommand(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: projectRoot, stdio: 'pipe', ...opts });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      stderr += `\n[timeout] ${cmd} ${args.join(' ')} exceeded ${stepTimeoutMs}ms\n`;
      child.kill('SIGKILL');
    }, stepTimeoutMs);

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}

async function runCycle() {
  cycle += 1;
  console.log(`\n=== Recursive Test Cycle ${cycle} ===`);

  const build = await runCommand('npm', ['run', 'build']);
  if (build.code !== 0) return { ok: false, errors: [build.stderr || build.stdout] };

  const smoke = await runCommand('node', ['scripts/smoke-check.js']);
  if (smoke.code !== 0) return { ok: false, errors: [smoke.stderr || smoke.stdout] };

  return { ok: true, errors: [] };
}

(async () => {
  setInterval(() => {
    const elapsedMin = ((Date.now() - start) / 60000).toFixed(1);
    console.log(`[recursive-test] heartbeat: ${elapsedMin} min elapsed`);
  }, 600000);

  while (true) {
    const elapsedMin = (Date.now() - start) / 60000;
    if (elapsedMin >= maxMinutes) {
      console.log(`\n[recursive-test] Max duration reached (${maxMinutes} min). Stopping.`);
      process.exit(0);
    }

    const res = await runCycle();
    if (res.ok) {
      console.log('[recursive-test] Cycle passed with no errors.');
      // Continue until maxMinutes to ensure watchdog/timeout monitoring window.
      await new Promise(r => setTimeout(r, 60000));
      continue;
    }

    let newErrorFound = false;
    for (const err of res.errors) {
      const key = (err || '').slice(0, 4000);
      if (!seenErrors.has(key)) {
        seenErrors.add(key);
        newErrorFound = true;
        console.error('[recursive-test] New error detected:\n', err);
      }
    }

    if (!newErrorFound) {
      console.log('[recursive-test] Errors are repeats only. Stopping.');
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, 60000));
  }
})();
