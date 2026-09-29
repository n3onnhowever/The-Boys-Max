from pathlib import Path
import hashlib,json,zipfile,io
from pypdf import PdfReader
r=Path.cwd(); p=r/'input/official/Досуг и развлечения.pdf'; reader=PdfReader(p)
s='\n\n'.join(f'## Page {i+1}\n'+(page.extract_text() or '') for i,page in enumerate(reader.pages))
(r/'artifacts/preflight/OFFICIAL_CASE_TEXT.md').write_text(s,encoding='utf-8')
print('OFFICIAL',len(reader.pages),hashlib.sha256(p.read_bytes()).hexdigest());print(s)
rows=[]
for p in sorted((r/'docs/research/2026-09-18/raw').rglob('*.zip')):
 with zipfile.ZipFile(p) as z:
  row={'topic':p.parent.name,'crc_error':z.testzip(),'members':z.namelist()}; rows.append(row)
(r/'artifacts/preflight/RESEARCH_ARCHIVE_INVENTORY.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
