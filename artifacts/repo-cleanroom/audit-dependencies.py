import hashlib,json,re,subprocess
from pathlib import Path
from collections import Counter,defaultdict
R=Path.cwd();O=R/'artifacts/repo-cleanroom';p=json.loads((R/'package.json').read_text());lock=json.loads((R/'package-lock.json').read_text());entries={k:v for k,v in lock['packages'].items() if k}; root=lock['packages'][''];dupes=defaultdict(list)
for k,v in entries.items():dupes[k.split('node_modules/')[-1]].append({'path':k,'version':v['version']})
imports=[];scanned=[]
for path in subprocess.check_output(['git','ls-files','-z']).decode().split('\0'):
 if path.startswith(('apps/','packages/','modules/','scripts/')) and Path(path).suffix in ('.ts','.tsx','.mjs','.js','.cjs'):
  scanned.append(path);txt=(R/path).read_text(encoding='utf-8-sig')
  for name in p['devDependencies']:
   if re.search(r'''(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]'''+re.escape(name)+r'''(?:/[^'"]*)?['"]''',txt):imports.append({'path':path,'dependency':name})
report={'manifest_lock_matching_fields':{k:p.get(k)==root.get(k) for k in ['name','version','dependencies','devDependencies','workspaces','engines']},'direct_runtime':len(p['dependencies']),'direct_dev':len(p['devDependencies']),'all_direct_exact':all(re.fullmatch(r'\d+\.\d+\.\d+(?:-[\w.]+)?',x) for x in list(p['dependencies'].values())+list(p['devDependencies'].values())),'lock_version':lock['lockfileVersion'],'lock_packages':len(entries),'distinct_names':len(dupes),'flags':{flag:sum(bool(v.get(flag)) for v in entries.values()) for flag in ['dev','devOptional','optional','hasInstallScript']},'licenses':dict(Counter(v.get('license','UNKNOWN') for v in entries.values())),'duplicate_names':{k:v for k,v in dupes.items() if len(v)>1},'unapproved_registry_paths':[k for k,v in entries.items() if not v.get('resolved','').startswith('https://registry.npmjs.org/')],'missing_integrity_paths':[k for k,v in entries.items() if not v.get('integrity','').startswith('sha512-')],'install_script_paths':[k for k,v in entries.items() if v.get('hasInstallScript')],'platform_constrained_packages':sum(bool(v.get('os') or v.get('cpu')) for v in entries.values()),'import_scan_files':len(scanned),'dev_dependency_imports':imports,'review_required':['Docker runtime copies build dependencies and source','Node base tag lacks digest pin','EventHive provenance remains BLOCKED_PROVENANCE_T112','Delivered third-party notices require bundle-level acceptance'],'no_packages_changed':True}
(O/'dependency-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ('duplicate_names','licenses')},indent=2))
