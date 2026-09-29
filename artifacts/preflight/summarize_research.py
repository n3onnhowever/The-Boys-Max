from pathlib import Path
import zipfile,json,re
for p in sorted(Path('docs/research/2026-09-18/raw').rglob('*.zip')):
 with zipfile.ZipFile(p) as z:
  names=[n for n in z.namelist() if n.endswith('machine_summary.json')]
  if names:
   d=json.loads(z.read(names[0]));print(json.dumps({'topic':p.parent.name,**{k:v for k,v in d.items() if any(w in k.lower() for w in ['verdict','status','blocker','open_question'])}},ensure_ascii=False))
for p in [Path('C:/Users/admin/.codex/config.toml'),Path('C:/Users/admin/.codex/AGENTS.md')]:
 print('CONFIG_EXISTS',str(p),p.exists())
 if p.exists() and p.suffix=='.toml':print('SECTION_NAMES',re.findall(r'^\[([^\]]+)\]',p.read_text(encoding='utf-8'),re.M))
