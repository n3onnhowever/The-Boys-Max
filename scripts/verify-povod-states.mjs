import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outputDirectory = path.resolve(process.argv[2] || 'artifacts/ui-povod-v1/states/logs');
mkdirSync(outputDirectory, { recursive: true });
const node = process.execPath;
const testFiles = readdirSync('tests/unit')
  .filter(file => file.endsWith('.test.ts'))
  .sort()
  .map(file => path.join('tests/unit', file));
const checks = [
  { name: 'verify-dependencies', executable: node, args: ['scripts/verify-dependencies.mjs'] },
  { name: 'syntax', executable: node, args: ['scripts/check-source-syntax.mjs'] },
  { name: 'unit', executable: node, args: ['--experimental-strip-types', '--test', ...testFiles] },
  { name: 'patch-drizzle-typecheck', executable: node, args: ['scripts/patch-drizzle-declarations.mjs'] },
  { name: 'typecheck', executable: node, args: ['node_modules/typescript/bin/tsc', '--noEmit'] },
  { name: 'typecheck-pure', executable: node, args: ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.pure.json'] },
  { name: 'patch-drizzle-build', executable: node, args: ['scripts/patch-drizzle-declarations.mjs'] },
  { name: 'build-typescript', executable: node, args: ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'] },
  { name: 'copy-assets', executable: node, args: ['scripts/copy-assets.mjs'] },
  { name: 'vite-build', executable: node, args: ['node_modules/vite/bin/vite.js', 'build', 'apps/miniapp'] },
  { name: 'diff-check', executable: 'git', args: ['diff', '--check'] },
];

const results = [];
for (const check of checks) {
  const started = new Date();
  const result = spawnSync(check.executable, check.args, { cwd: process.cwd(), encoding: 'utf8', windowsHide: true });
  const finished = new Date();
  const log = [
    `$ ${check.executable} ${check.args.join(' ')}`,
    result.stdout?.trimEnd() ?? '',
    result.stderr?.trimEnd() ?? '',
    `exit=${result.status ?? 1}`,
  ].filter(Boolean).join('\n') + '\n';
  const logPath = path.join(outputDirectory, `${check.name}.log`);
  writeFileSync(logPath, log);
  const receipt = {
    name: check.name,
    command: `${check.executable} ${check.args.join(' ')}`,
    exitCode: result.status ?? 1,
    startedUtc: started.toISOString(),
    finishedUtc: finished.toISOString(),
    log: path.relative(process.cwd(), logPath).replaceAll('\\', '/'),
    logSha256: createHash('sha256').update(readFileSync(logPath)).digest('hex'),
  };
  results.push(receipt);
  process.stdout.write(`${receipt.name}: exit ${receipt.exitCode}\n`);
}

const payload = {
  generatedUtc: new Date().toISOString(),
  node: process.version,
  unitFiles: testFiles.length,
  status: results.every(result => result.exitCode === 0) ? 'PASS' : 'FAIL',
  results,
};
writeFileSync(path.join(outputDirectory, 'verification-results.json'), `${JSON.stringify(payload, null, 2)}\n`);
if (payload.status !== 'PASS') process.exitCode = 1;
