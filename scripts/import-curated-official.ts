import {readFileSync} from 'node:fs';
import {Pool} from 'pg';
import {assertDistinctCuratedFiles,importCuratedOfficialCatalog} from '../packages/real-catalog/import.ts';
import {curatedOfficialImport} from '../packages/real-catalog/adapters.ts';
import type {CuratedFile} from '../packages/real-catalog/adapters.ts';
import {parseCuratedCsv,parseCuratedIcs} from '../packages/real-catalog/operator-formats.ts';

const paths=process.argv.slice(2);if(!paths.length)throw Error('CURATED_FILE_PATH_REQUIRED');
const url=process.env.DATABASE_URL;if(!url)throw Error('DATABASE_URL_REQUIRED');
const asOf=process.env.CURATED_AS_OF||new Date().toISOString();
const fileFrom=(path:string):CuratedFile=>{const input=readFileSync(path,'utf8');return path.endsWith('.csv')?parseCuratedCsv(input,asOf):path.endsWith('.ics')?parseCuratedIcs(input,asOf):path.endsWith('.json')?JSON.parse(input) as CuratedFile:(()=>{throw Error('CURATED_FORMAT_UNSUPPORTED');})();};
const files=paths.map(fileFrom);assertDistinctCuratedFiles(files);
const pool=new Pool({connectionString:url});
const allowedHosts=(process.env.CURATED_SOURCE_HOSTS||'www.darwinmuseum.ru,darwinmuseum.ru').split(',').map(host=>host.trim()).filter(Boolean);
for(const file of files){
 const parsed=curatedOfficialImport(file,allowedHosts);
 if(parsed.quarantined.length)throw Error('CURATED_BATCH_QUARANTINED:'+JSON.stringify(parsed.quarantined));
}
try{
 const imported=[];
 for(const file of files)imported.push(await importCuratedOfficialCatalog(pool,file,allowedHosts));
 console.log(JSON.stringify(imported));
}
finally{await pool.end();}
