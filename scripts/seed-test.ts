import {syntheticCandidate} from '../tests/catalog-fixtures.ts';
import {connect} from '../packages/persistence/db.ts';import {config} from '../packages/platform/config.ts';import {requireThat} from '../packages/domain/errors.ts';
import {O,A,B} from '../tests/fixtures.ts';
const cfg=config();requireThat(cfg.mode==='test'&&new URL(cfg.databaseUrl).pathname==='/max23_test','ISOLATED_TEST_DATABASE_REQUIRED');
const {pool}=connect(cfg.databaseUrl);
try{for(const [id,external,name] of [[O,'9007199254740993','Тест Организатор'],[A,'9007199254740994','Тест Участник'],[B,'9007199254740995','Тест Посторонний']]){
 await pool.query('INSERT INTO actors(id,external_id,display_name) VALUES($1,$2,$3) ON CONFLICT(external_id) DO NOTHING',[id,external,name]);
 await pool.query("INSERT INTO destinations(actor_id,chat_id,verified_at,source_digest) VALUES($1,$2,clock_timestamp(),'SYNTHETIC_TEST_FIXTURE') ON CONFLICT(actor_id) DO NOTHING",[id,external]);
}
const candidate=syntheticCandidate(new Date().toISOString());
await pool.query(`INSERT INTO catalog_occurrences(observation_id,provider_id,event_id,occurrence_id,body,data_mode) VALUES($1,$2,$3,$4,$5,'SYNTHETIC') ON CONFLICT(observation_id) DO NOTHING`,[candidate.provenance.observation_id,candidate.ref.provider_id,candidate.ref.event_id,candidate.ref.occurrence_id,candidate]);
console.log('One owned SYNTHETIC catalog fixture seeded; freshness expires after one hour and then shows UNKNOWN.');
console.log('Three synthetic roles and test-only destinations seeded. No session issued; real API exchange remains required.');}finally{await pool.end();}
