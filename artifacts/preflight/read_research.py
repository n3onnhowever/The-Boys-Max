from pathlib import Path
import zipfile,json,re
r=Path.cwd();out=[]
for p in sorted((r/'docs/research/2026-09-18/raw').rglob('*.zip')):
 with zipfile.ZipFile(p) as z:
  parts=[]
  for name in ['machine_summary.json','EXECUTIVE_VERDICT.md','GAPS_AND_OPEN_QUESTIONS.md']:
   matches=[n for n in z.namelist() if n.endswith(name)]
   if matches:parts.append('## '+name+'\n'+z.read(matches[0]).decode('utf-8-sig'))
  out.append('# '+p.parent.name+'\n'+'\n'.join(parts))
(r/'artifacts/preflight/RESEARCH_SUMMARIES.md').write_text('\n\n'.join(out),encoding='utf-8')
print('\n'.join(f'{p.parent.name}: {p.name}' for p in (r/'docs/research/2026-09-18/raw').rglob('*.zip')))
