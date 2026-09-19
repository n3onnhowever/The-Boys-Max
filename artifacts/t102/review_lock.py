import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'t101'))
from capture import *
pkg=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
lock=json.loads((ROOT/'package-lock.json').read_text(encoding='utf-8'))
for key in ['dependencies','devDependencies','engines','workspaces']:
    assert lock['packages'][''][key]==pkg[key],key
for key in ['dependencies','devDependencies']:
    for name,version in pkg[key].items(): assert lock['packages']['node_modules/'+name]['version']==version,name
assert all(not p.get('resolved') or p['resolved'].startswith('https://registry.npmjs.org/') for p in lock['packages'].values())
assert not (ROOT/'node_modules').exists()
rows=[{'path':path,'version':p.get('version'),'install_script':p.get('hasInstallScript',False),'license':p.get('license','UNKNOWN')} for path,p in lock['packages'].items() if path]
write_json(ROOT/'artifacts/t102/LOCKFILE_RECEIPT.json',{'starting_sha':'4f9a198d4fa2b18686efa19a59b6ac78281d341d','sha256':sha(ROOT/'package-lock.json'),'lockfile_version':lock['lockfileVersion'],'root_manifest_matches':True,'all_direct_versions_preserved':True,'registry':'https://registry.npmjs.org/','node_modules_absent_before_ci':True,'package_entries':len(rows),'install_script_packages':[r for r in rows if r['install_script']],'lifecycle_policy':'npm ci --ignore-scripts; no lifecycle scripts enabled; existing root scripts inspected','limitations':'Lock generation and metadata do not prove typecheck/build/runtime.'})
write_json(ROOT/'artifacts/t102/LOCKED_PACKAGES.json',rows)
(ROOT/'artifacts/t102/dependency-preflight.json').write_bytes((ROOT/'dependency-preflight.json').read_bytes())
print('Lock verified; direct versions unchanged; node_modules absent; lifecycle scripts remain disabled.')
