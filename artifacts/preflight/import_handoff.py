from pathlib import Path
import zipfile,hashlib,json
root=Path.cwd(); source=Path(r'C:\Users\admin\Downloads\POVOD_SYNTHESIS_HANDOFF_2026-09-19.zip'); evidence=root/'artifacts/preflight'
sha=lambda b:hashlib.sha256(b).hexdigest()
records=[]
with zipfile.ZipFile(source) as z:
 for entry in z.infolist():
  if entry.is_dir():continue
  rel=Path(*Path(entry.filename).parts[1:]); group=rel.parts[0]; name=rel.name
  if '..' in rel.parts or rel.is_absolute():raise ValueError(entry.filename)
  if group=='research_archives':
   topic=name.removeprefix('POVOD_RESEARCH_').split('_FINAL_')[0].lower()
   target=root/'docs/research/2026-09-18/raw'/topic/name
  elif group=='canonical':target=root/'docs/product/povod-2026-09-19'/name
  elif group=='adr':target=root/'docs/architecture/adr/povod-2026-09-19'/name
  elif group=='synthesis':target=root/'docs/research/2026-09-18/synthesis'/name
  else:target=root/'docs/research/2026-09-18/handoff'/rel
  data=z.read(entry)
  if target.exists():raise FileExistsError(target)
  target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(data)
  records.append(dict(source_member=entry.filename,path=target.relative_to(root).as_posix(),sha256=sha(data),bytes=len(data)))
manifest=dict(source=str(source),source_sha256=sha(source.read_bytes()),files=records)
(evidence/'IMPORT_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
