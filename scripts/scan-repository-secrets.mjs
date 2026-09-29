// Dependency-free, redacted pre-publication scan. This is a pattern scan, not a
// guarantee that arbitrary secrets can be recognized. Review every new finding.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const git = (...args) => execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024 });
const ref = process.argv.find(arg => arg.startsWith('--history='))?.slice(10) || 'HEAD';
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['vendor-key', /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}|AKIA[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{35})\b/g],
  ['bot-token', /\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/g],
  ['credential-assignment', /(?:bot_?token|(?:max_?)?webhook_?secret|session_?key|escrow_?key|api_?key|password)["']?[ \t]*[:=][ \t]*["']?([A-Za-z0-9_+\/=-]{16,})/gi],
  ['url-password', /(?:postgres(?:ql)?|mysql|redis):\/\/[^\s:@]+:([^\s@]+)@/g],
  ['bearer-value', /["']?(?:authorization)["']?[ \t]*[:=][ \t]*["']Bearer[ \t]+([A-Za-z0-9_.-]{24,})/gi],
];
const exceptions = JSON.parse(readFileSync(new URL('./secret-scan-exceptions.json', import.meta.url), 'utf8'));
const accepted = new Map(exceptions.map(item => [item.blob + ':' + item.rule + ':' + item.line, item.reason]));
const findings = [], reviewed = [], prohibited = [], large = [];
const blobHash = data => createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
function scan(data, path, blob, scope) {
  const text = data.toString('utf8');
  for (const [rule, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const line = text.slice(0, match.index).split('\n').length;
      const finding = { scope, path, blob, rule, line };
      const reason = accepted.get(blob + ':' + rule + ':' + line);
      if (reason) reviewed.push({ ...finding, reason }); else findings.push(finding);
    }
  }
}
const objects = git('rev-list', '--objects', ref).toString().trim().split('\n').map(line => {
  const space = line.indexOf(' '); return { id: space < 0 ? line : line.slice(0, space), path: space < 0 ? '' : line.slice(space + 1) };
});
const metadata = execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], { input: objects.map(x => x.id).join('\n'), maxBuffer: 32 * 1024 * 1024 }).toString().trim().split('\n');
const blobs = metadata.flatMap((line, index) => { const [id, type, size] = line.split(' '); return type === 'blob' ? [{ id, size: Number(size), path: objects[index].path }] : []; });
// Read the entire reachable history, including historical evidence and binary
// blobs. Compressed archive payloads are not unpacked by this pattern scanner.
const payload = execFileSync('git', ['cat-file', '--batch'], { input: blobs.map(x => x.id).join('\n'), maxBuffer: 256 * 1024 * 1024 });
let offset = 0;
for (const blob of blobs) {
  offset = payload.indexOf(10, offset) + 1;
  const data = payload.subarray(offset, offset + blob.size); offset += blob.size + 1;
  if (blob.size >= 100 * 1024 * 1024) large.push({ path: blob.path, blob: blob.id, bytes: blob.size });
  scan(data, blob.path, blob.id, 'history');
}
const files = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').toString().split('\0').filter(Boolean))];
for (const path of files) {
  if (!existsSync(path)) continue;
  const safeTemplate = ['.env.example', '.env.release.example'].includes(path);
  if ((!safeTemplate && /(^|\/)\.env(?:\.|$)/.test(path)) || /(^|\/)(?:node_modules|dist|\.run-evidence|\.runtime|\.secrets|pgdata|redis-data)\//.test(path) || /\.(?:log|sqlite3?|db|p12|pfx|key)$/.test(path) || /(^|\/)logs\//.test(path) || /(^|\/)raw-logs\.zip$/.test(path)) prohibited.push(path);
  const data = readFileSync(path); scan(data, path, blobHash(data), 'worktree');
}
console.log(JSON.stringify({ status: findings.length || prohibited.length || large.length ? 'FAIL' : 'PASS', history: ref, historyBlobs: blobs.length, worktreeFiles: files.length, reviewedSyntheticOrTemplateMatches: reviewed.length, findings, prohibitedPaths: prohibited, githubOversizedBlobs: large, limitation: 'Pattern scan; compressed archive payloads are not unpacked.' }, null, 2));
process.exitCode = findings.length || prohibited.length || large.length ? 1 : 0;
