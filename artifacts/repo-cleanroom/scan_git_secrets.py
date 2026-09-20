import subprocess,re,json,collections
G=lambda a:subprocess.check_output(['git']+a)
head=G(['rev-parse','HEAD']).decode().strip()
commits=G(['rev-list','--all']).decode().splitlines()
refs=G(['for-each-ref','--format=%(objecttype) %(objectname)']).decode().splitlines()
roots=list(dict.fromkeys(commits+[x.split()[1] for x in refs if x.startswith('tree ')]))
paths=collections.defaultdict(set);anchors={};secret=set();secretpaths=[];headblobs=set()
for root in roots:
 for row in G(['ls-tree','-r','-z',root]).split(b'\0'):
  if not row:continue
  inf,p=row.split(b'\t',1);_,typ,sha=inf.decode().split();p=p.decode('utf-8','replace')
  if typ!='blob':continue
  paths[sha].add(p);anchors.setdefault(sha,root)
  if root==head:headblobs.add(sha)
  if '.secrets' in p.lower().split('/'):
   secret.add(sha);secretpaths.append({'root':root,'path':p})
rows=[x.split(' ',1) for x in G(['rev-list','--objects','--all']).decode().splitlines()]
meta=subprocess.run(['git','cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],input='\n'.join(x[0] for x in rows)+'\n',capture_output=True,text=True,check=True).stdout
blobs={s:int(n) for s,t,n in (x.split() for x in meta.splitlines()) if t=='blob'}
for row in rows:
 if len(row)>1 and not paths[row[0]]:paths[row[0]].add(row[1])
P=[
('private_key',r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),
('openai_style_key',r'(?<![A-Za-z0-9])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,300}'),
('github_token',r'(?<![A-Za-z0-9])(?:gh[pousr]_[A-Za-z0-9]{25,200}|github_pat_[A-Za-z0-9_]{30,200})'),
('slack_token',r'xox[baprs]-[A-Za-z0-9-]{20,200}'),
('aws_access_key',r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
('google_api_key',r'\bAIza[A-Za-z0-9_-]{30,100}\b'),
('jwt',r'\beyJ[A-Za-z0-9_-]{8,1000}\.[A-Za-z0-9_-]{8,2000}\.[A-Za-z0-9_-]{8,1000}\b'),
('bot_token_shape',r'(?<![0-9])[0-9]{7,14}:[A-Za-z0-9_-]{25,200}'),
('credential_assignment',r'''(?i)\b[A-Za-z0-9_]{0,50}(?:api[_-]?key|access[_-]?token|refresh[_-]?token|bot[_-]?token|password|passwd|client[_-]?secret|session[_-]?secret|webhook[_-]?secret|secret[_-]?key)[A-Za-z0-9_]{0,30}["']?\s{0,20}[:=]\s{0,20}["']([^"'\r\n]{5,1000})["']'''),
('authorization_literal',r'(?i)\b(?:Bearer|Basic)\s{1,10}([A-Za-z0-9+/_=.-]{8,1000})'),
('credential_in_url',r'''(?i)(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?)://([^\s/:<>"'`]{1,100}:[^\s/@<>"'`]{1,200})@'''),
('cookie_literal',r'''(?i)\b(?:cookie|set-cookie)["']?\s{0,20}[:=]\s{0,20}["']([^\r\n"']{10,2000})["']'''),
('private_network_url',r'(?i)https?://(?:10\.[0-9.]{1,15}|192\.168\.[0-9.]{1,12}|172\.(?:1[6-9]|2[0-9]|3[01])\.[0-9.]{1,12}|[^/\s]{1,200}\.(?:internal|local|corp))(?:[:/]|\b)'),
('email_address',r'(?i)\b[A-Z0-9._%+-]{1,100}@[A-Z0-9.-]{1,150}\.[A-Z]{2,20}\b'),
('russian_phone_shape',r'(?<![\w\d])(?:\+7|8)[ (.-]{0,3}\d{3}[ ).-]{0,3}\d{3}[ .-]{0,2}\d{2}[ .-]{0,2}\d{2}(?!\d)')]
P=[(t,re.compile(p)) for t,p in P]
placeholder=re.compile(r'(?i)(example|placeholder|dummy|fake|sample|test|redacted|replace|changeme|your[_ -]|not[-_]?(?:a[-_])?secret|process\.env|os\.environ|\$\{|<[^>]{0,200}>|undefined|null|fixture|development|dev[-_]|localhost|127\.0\.0\.1|^true$|^false$|^password$|^postgres$|^povod$|^secret$|^token$|^api[-_]key$|^Bearer$|^required$)')
count=collections.Counter();skips=collections.Counter();safe=collections.Counter();findings=[];total=0
p=subprocess.Popen(['git','cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE)
for sha,n in blobs.items():
 if sha in secret:skips['secret_path_not_read']+=1;continue
 if n>33554432:skips['over_32MiB']+=1;continue
 p.stdin.write((sha+'\n').encode());p.stdin.flush();p.stdout.readline();data=p.stdout.read(n);p.stdout.read(1)
 if b'\0' in data[:8192]:skips['binary']+=1;continue
 try:txt=data.decode('utf-8-sig')
 except UnicodeDecodeError:skips['non_utf8']+=1;continue
 count['text_blobs_scanned']+=1;total+=n;hits=collections.Counter()
 for start in range(0,len(txt),65536):
  chunk=txt[max(0,start-4096):start+65536]
  for typ,pat in P:
   for m in pat.finditer(chunk):
    if start and m.end()<=4096:continue
    v=m.group(1) if m.lastindex else m.group()
    if placeholder.search(v):safe[typ]+=1;continue
    if typ=='credential_assignment' and (re.fullmatch(r'[A-Z][A-Z0-9_]+',v) or (len(v)<20 and re.fullmatch(r'[A-Za-z_$][A-Za-z0-9_$.]*(?:\([^)]*\))?',v))):safe['code_or_simple_symbol_assignment']+=1;continue
    if typ=='authorization_literal' and v.lower() in ['authentication','authorization','credentials','credential','tokenvalue','undefined','sessiontoken']:safe['code_or_docs_authorization']+=1;continue
    hits[typ]+=1
 for typ,num in hits.items():
  count[typ]+=num
  path=sorted(paths[sha],key=lambda x:(x.startswith('artifacts/research/consolidated/'),len(x)))[0] if paths[sha] else ''
  findings.append({'blob':sha,'path':path,'type':typ,'matches':num,'present_HEAD':sha in headblobs,'anchor':anchors.get(sha),'anchor_type':'commit' if anchors.get(sha) in commits else 'tree'})
p.stdin.close();p.wait()
print(json.dumps({'method':'Git reachable UTF-8 blobs <=32MiB; 64KiB chunks +4KiB overlap; bounded regexes; values never printed','HEAD':head,'reachable_commits':len(commits),'additional_tree_roots':len(roots)-len(commits),'unique_blobs':len(blobs),'HEAD_unique_blobs':len(headblobs),'text_bytes_scanned':total,'counts':dict(count),'skips':dict(skips),'safe_suppressions':dict(safe),'secret_path_entries':secretpaths,'findings':findings},indent=2))
