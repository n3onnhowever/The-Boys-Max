from capture import *
for name,args in [('starting-status',GIT+['status','--short']),('starting-head',GIT+['rev-parse','HEAD']),('starting-branch',GIT+['branch','--show-current'])]: run('t101',name,args)
paths=[]
for base in ['AGENTS.md','README.md','README_CODEX.md','Dockerfile','compose.yaml','compose.release.yaml','.gitignore','.dockerignore','.npmrc','.env.example','.env.release.example','package.json','docs','apps','packages','modules','scripts','tests','migrations','licenses','artifacts/preflight','archive']:
    p=ROOT/base
    paths.extend([p] if p.is_file() else [x for x in p.rglob('*') if x.is_file()])
write_json(ROOT/'artifacts/t101/BASELINE_HASHES.json',{p.relative_to(ROOT).as_posix():sha(p) for p in sorted(set(paths))})
docpaths=[ROOT/'AGENTS.md',ROOT/'README.md',ROOT/'README_CODEX.md']+list((ROOT/'docs').rglob('*.md'))
# Preserve original editable governance documents, not duplicate immutable imported archives.
docpaths=[p for p in docpaths if 'research' not in p.parts and 'povod-2026-09-19' not in p.parts]
write_json(ROOT/'artifacts/t101/BASELINE_DOCUMENTS.json',{p.relative_to(ROOT).as_posix():p.read_text(encoding='utf-8-sig') for p in docpaths})
manifest=json.loads((ROOT/'artifacts/preflight/IMPORT_MANIFEST.json').read_text(encoding='utf-8'))
rows=[{'path':x['path'],'expected':x['sha256'],'actual':sha(ROOT/x['path'])} for x in manifest['files']]
assert all(x['expected']==x['actual'] for x in rows)
pdf=ROOT/'input/official/Досуг и развлечения.pdf'
assert sha(pdf)=='638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a'
write_json(ROOT/'artifacts/t101/SOURCE_VERIFICATION.json',{'official_pdf_sha256':sha(pdf),'imports':rows,'result':'PASS'})
