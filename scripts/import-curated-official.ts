import {readFileSync} from 'node:fs';
import {Pool} from 'pg';
import {importCuratedOfficialCatalog} from '../packages/real-catalog/import.ts';
import type {CuratedFile} from '../packages/real-catalog/adapters.ts';
import {parseCuratedCsv,parseCuratedIcs} from '../packages/real-catalog/operator-formats.ts';

const path=process.argv[2];if(!path)throw Error('CURATED_FILE_PATH_REQUIRED');
const url=process.env.DATABASE_URL;if(!url)throw Error('DATABASE_URL_REQUIRED');
const input=readFileSync(path,'utf8'),asOf=process.env.CURATED_AS_OF||new Date().toISOString();
const file:CuratedFile=path.endsWith('.csv')?parseCuratedCsv(input,asOf):path.endsWith('.ics')?parseCuratedIcs(input,asOf):path.endsWith('.json')?JSON.parse(input) as CuratedFile:(()=>{throw Error('CURATED_FORMAT_UNSUPPORTED');})();
const pool=new Pool({connectionString:url});
const allowedHosts=(process.env.CURATED_SOURCE_HOSTS||'www.darwinmuseum.ru,darwinmuseum.ru').split(',').map(host=>host.trim()).filter(Boolean);
try{console.log(JSON.stringify(await importCuratedOfficialCatalog(pool,file,allowedHosts)));}
finally{await pool.end();}
