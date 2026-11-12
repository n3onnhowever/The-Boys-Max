import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {join} from 'node:path';

export const migrationHistoryBase='ae05e8f88d937c6c96972b3619dff383de706a4a';

/** Engineering acceptance needs actual historical bytes; deployment archives do not. */
export function requireIntegrationHistory(root=process.cwd()){
 const git=(args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  if(git(['rev-parse','--is-shallow-repository'])!=='false')throw Error('SHALLOW_HISTORY');
  const files=readdirSync(join(root,'migrations')).filter(name=>/^\d{4}_.*\.sql$/.test(name));
  for(const file of ['scripts/migrate.ts',...files.map(name=>'migrations/'+name)])git(['cat-file','-e',`${migrationHistoryBase}:${file}`]);
 }catch{
  throw Error(`BLOCKED_GIT_HISTORY: integration acceptance requires a full Git checkout containing ${migrationHistoryBase}. Fetch full history (CI fetch-depth: 0), then rerun npm run test:integration:isolated. Git-free deployment archives must use npm run test:package:amvera from the source checkout instead.`);
 }
}
