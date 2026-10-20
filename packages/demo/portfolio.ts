import {createHmac,randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {Config} from '../platform/config.ts';
import {requireThat} from '../domain/errors.ts';
import {hash} from '../domain/event.ts';
import {canonicalCatalog} from '../persistence/canonical-catalog.ts';
import {socialService} from '../persistence/social.ts';
import {DEMO_ITEMS,demoRecord,demoCandidate} from './catalog-v3.ts';
import {parseCandidate} from '../../modules/search/core/candidate.ts';

export function assertOfflinePortfolio(c:Config,env:NodeJS.ProcessEnv=process.env){
 const origin=new URL(c.publicOrigin),database=new URL(c.databaseUrl),redis=new URL(c.redisUrl);
 requireThat(env.POVOD_OFFLINE_DEMO==='1'&&env.NODE_ENV!=='production'&&c.mode==='test'&&
  origin.protocol==='http:'&&origin.hostname==='127.0.0.1'&&origin.origin===c.publicOrigin&&
  database.hostname==='127.0.0.1'&&database.pathname==='/max23_test'&&redis.hostname==='127.0.0.1'&&
  !c.aiExternalEnabled&&!env.POVOD_OWNER_PREVIEW&&!env.RUNTIME_FILE,'OFFLINE_PORTFOLIO_LOCAL_TEST_ONLY',503);
}
/** Uses the existing signed exchange with an ephemeral local key, never an auth bypass. */
export function syntheticPortfolioLaunch(token:string){
 const fields={auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:900000001,first_name:'DEMO · Повод'}),query_id:randomUUID()};
 const text=Object.entries(fields).sort(([a],[b])=>a<b?-1:1).map(([key,value])=>key+'='+value).join('\n');
 const key=createHmac('sha256','WebAppData').update(token).digest();
 return new URLSearchParams({...fields,hash:createHmac('sha256',key).update(text).digest('hex')}).toString();
}
export function portfolioFixtures(origin:string,now=new Date()){
 // Separate synthetic run namespace: historical fixture bytes and real facts are untouched.
 const day=new Date(now);day.setUTCHours(0,0,0,0);day.setUTCDate(day.getUTCDate()+1);
 const offset=day.getTime()-Date.parse('2026-09-30T00:00:00.000Z');
 const sourceId='synthetic:povod-demo:portfolio-v1',requestId='portfolio-'+randomUUID();
 return DEMO_ITEMS.map((item,index)=>{
  const shifted={...item,start:new Date(Date.parse(item.start)+offset).toISOString()};
  const record=demoRecord(shifted,index,origin),candidate=structuredClone(demoCandidate(shifted,index));
  record.sourceId=sourceId;record.requestId=requestId;record.fetchedAt=now.toISOString();
  record.apiVersion='portfolio/v1';record.transformVersion='portfolio/v1';record.rightsRevision='owned-portfolio/v1';
  record.responseSha256=hash(['portfolio/v1',shifted]);
  candidate.provenance.observation_id=randomUUID();candidate.provenance.observed_at=now.toISOString();candidate.provenance.fetched_at=now.toISOString();
  candidate.price.provenance.observation_id=candidate.provenance.observation_id;
  candidate.provenance.payload_sha256=record.responseSha256;candidate.provenance.transform_version='portfolio-v1';
  candidate.rights={...candidate.rights,policy_revision:'portfolio-v1',reviewed_at:now.toISOString(),review_due_at:new Date(day.getTime()+90*86400000).toISOString(),evidence_refs:['TEAM_AUTHORED_LOCAL_PORTFOLIO_SCENARIOS']};
  return {record,candidate:parseCandidate(candidate)};
 });
}
export async function seedPortfolio(pool:Pool,c:Config){
 assertOfflinePortfolio(c);
 // Dedicated containers are fresh per invocation; refuse any pre-existing catalog.
 requireThat((await pool.query('SELECT 1 FROM canonical_events LIMIT 1')).rowCount===0,'PORTFOLIO_REQUIRES_EMPTY_ISOLATED_DATABASE');
 const rows=portfolioFixtures(c.publicOrigin),catalog=canonicalCatalog(pool),source=rows[0]!.record.sourceId;
 await catalog.registerSyntheticSource(source,'ManualProvider','owned-portfolio/v1');
 const run=await catalog.beginRun(source,hash('portfolio/v1')),page=await catalog.dispatchPage(run.runId,run.epoch,1);
 const result=await catalog.commitPage(page.pageId,run.epoch,rows.map(x=>x.record),{allowedHosts:['127.0.0.1'],allowLive:false},true);
 requireThat(result.status==='COMMITTED'&&result.accepted===48&&result.quarantined===0,'PORTFOLIO_CANONICAL_SEED_FAILED');
 await catalog.finishRun(run.runId,run.epoch);
 for(const {candidate:candidate} of rows)await pool.query("INSERT INTO catalog_occurrences(observation_id,provider_id,event_id,occurrence_id,body,data_mode) VALUES($1,$2,$3,$4,$5,'SYNTHETIC')",[candidate.provenance.observation_id,candidate.ref.provider_id,candidate.ref.event_id,candidate.ref.occurrence_id,candidate]);
 const actors=[];
 for(const [external,name] of [['900000001','DEMO · Повод'],['900000002','DEMO · Друг']]){
  const id=randomUUID();actors.push(id);
  await pool.query('INSERT INTO actors(id,external_id,display_name) VALUES($1,$2,$3)',[id,external,name]);
  await pool.query("INSERT INTO destinations(actor_id,chat_id,verified_at,source_digest) VALUES($1,$2,clock_timestamp(),'SYNTHETIC_PORTFOLIO_TEST_ONLY')",[id,external]);
 }
 const social=socialService(pool);await social.requestFriend(actors[0]!,actors[1]!);await social.acceptFriend(actors[1]!,actors[0]!);
 return {canonicalOccurrences:48,searchCandidates:48,dataMode:'SYNTHETIC'};
}
