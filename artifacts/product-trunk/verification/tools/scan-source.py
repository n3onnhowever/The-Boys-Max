import gzip
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

BASE = "1e4a7a2b454bed87bdcb40559773143c2fc38c9b"
OUTPUT = Path("artifacts/product-trunk/verification/source-secret-scan.json")
HEAD = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()

def paths(*args):
    return [part.decode("utf-8", "surrogateescape") for part in subprocess.check_output(["git", *args, "-z"]).split(b"\0") if part]

tracked = paths("ls-files")
changed = paths("diff", "--name-only", BASE + ".." + HEAD)
forbidden = []
for name in tracked:
    parts = Path(name).parts
    basename = Path(name).name
    if any(part in {".secrets", ".runtime", "node_modules", "dist"} for part in parts):
        forbidden.append({"path": name, "reason": "private-or-generated-directory"})
    elif basename.startswith(".env") and basename not in {".env.example", ".env.release.example"}:
        forbidden.append({"path": name, "reason": "private-env-file"})

patterns = {
    "private-key-material": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]{64,}"),
    "provider-key": re.compile(rb"(?<![A-Za-z0-9])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,200}"),
    "github-token": re.compile(rb"(?:gh[pousr]_[A-Za-z0-9]{25,200}|github_pat_[A-Za-z0-9_]{30,200})"),
    "aws-key": re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "google-key": re.compile(rb"\bAIza[A-Za-z0-9_-]{30,100}\b"),
    "slack-token": re.compile(rb"xox[baprs]-[A-Za-z0-9-]{20,200}"),
    "bot-token": re.compile(rb"(?<![0-9])[0-9]{7,14}:[A-Za-z0-9_-]{25,200}"),
    "jwt": re.compile(rb"\beyJ[A-Za-z0-9_-]{8,1000}\.[A-Za-z0-9_-]{8,2000}\.[A-Za-z0-9_-]{8,1000}\b"),
}
findings = []
scanned = 0
binary_skips = []
archive_skips = []
for name in changed:
    if name not in tracked:
        continue
    if name.lower().endswith((".zip", ".png", ".jpg", ".jpeg", ".ttf", ".crt")):
        archive_skips.append(name)
        continue
    raw = subprocess.check_output(["git", "show", "HEAD:" + name])
    if name.endswith(".gz"):
        try:
            raw = gzip.decompress(raw)
        except OSError:
            findings.append({"path": name, "rule": "invalid-gzip"})
            continue
    if b"\0" in raw[:4096]:
        binary_skips.append(name)
        continue
    scanned += len(raw)
    for label, pattern in patterns.items():
        if pattern.search(raw):
            findings.append({"path": name, "rule": label})
result = {
    "status": "PASS" if not forbidden and not findings else "FAIL",
    "sourceMainSha": BASE,
    "headSha": HEAD,
    "trackedPathCount": len(tracked),
    "changedPathCount": len(changed),
    "textBytesScanned": scanned,
    "prohibitedTrackedPaths": forbidden,
    "strongSignatureFindings": findings,
    "binarySkippedCount": len(binary_skips),
    "archiveAndMediaSkippedCount": len(archive_skips),
    "scopeLimit": "Strong signatures in changed text and gzip blobs; no local ignored credential values read. Binary/archive payloads are not a full secret proof.",
    "timestampUtc": datetime.now(timezone.utc).isoformat(),
}
OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: result[k] for k in ("status", "headSha", "trackedPathCount", "changedPathCount", "textBytesScanned", "prohibitedTrackedPaths", "strongSignatureFindings", "binarySkippedCount", "archiveAndMediaSkippedCount")}))
raise SystemExit(0 if result["status"] == "PASS" else 1)
