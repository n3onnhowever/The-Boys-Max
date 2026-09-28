import type {Pool,PoolClient} from 'pg';
import {randomBytes,randomUUID,createCipheriv,createDecipheriv} from 'node:crypto';
import {keyed,equalSecret,verifyInitData} from '../platform/auth.ts';
import {requireThat} from '../domain/errors.ts';
export interface SessionConfig {sessionKey:string;escrowKey:string;botToken:string;}
export function seal(key:string,value:string){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);
 const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');
}
export function unseal(key:string,value:string){const b=Buffer.from(value,'base64'),d=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8');}
export async function transaction<T>(pool:Pool,fn:(c:PoolClient)=>Promise<T>):Promise<T>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
type SessionRow={id:string;actor_id:string;family_id:string;csrf_generation:number;absolute_expires_at:Date;display_name:string};
export function sessionService(pool:Pool,config:SessionConfig){
 const csrf=(id:string,gen:number)=>keyed(config.sessionKey,`csrf:${id}:${gen}`);
 return {
 async ownerPreview(persona:'owner'|'friend'='owner'){
  const externalId=persona==='owner'?'9223372036854775807':'9223372036854775806';
  const name=persona==='owner'?'Владелец · предпросмотр':'Друг · предпросмотр';
  const actor=await pool.query<{id:string;display_name:string}>(`INSERT INTO actors(id,external_id,display_name) VALUES($1,$2,$3)
   ON CONFLICT(external_id) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id,display_name`,[randomUUID(),externalId,name]);
  const token=randomBytes(32).toString('base64url'),id=randomUUID(),family=randomUUID();
  const expires=new Date(Date.now()+3600_000);
  await pool.query(`INSERT INTO app_sessions(id,actor_id,family_id,token_hash,issued_at,absolute_expires_at,last_seen_at) VALUES($1,$2,$3,$4,clock_timestamp(),$5,clock_timestamp())`,[id,actor.rows[0]!.id,family,keyed(config.sessionKey,token),expires]);
  return {token,actor:actor.rows[0]!.id,expiresAt:expires.toISOString()};
 },
 async bootstrap(){
  const binding=randomBytes(32).toString('base64url'),csrfToken=randomBytes(32).toString('base64url'),id=randomUUID();
  const r=await pool.query<{expires_at:Date}>('INSERT INTO session_bootstraps(id,binding_hash,csrf_hash,expires_at) VALUES($1,$2,$3,clock_timestamp()+interval \'120 seconds\') RETURNING expires_at',[id,keyed(config.sessionKey,binding),keyed(config.sessionKey,csrfToken)]);
  return {binding,body:{bootstrapId:id,csrfToken,expiresAt:r.rows[0]!.expires_at.toISOString()}};
 },
 async exchange(binding:string|undefined,header:string|undefined,raw:string,exchangeKey:string,previousToken:string|undefined){
  requireThat(binding&&header,'SESSION_STORAGE_UNSUPPORTED',401);
  return transaction(pool,async c=>{
   const clock=await c.query<{seconds:string}>('SELECT extract(epoch FROM clock_timestamp())::text AS seconds');
   const now=Number(clock.rows[0]!.seconds),proof=verifyInitData(raw,config.botToken,now);
   const bh=keyed(config.sessionKey,binding),ph=keyed(config.sessionKey,`proof:${proof.proofFingerprint}`);
   const b=await c.query<{csrf_hash:string}>('SELECT csrf_hash FROM session_bootstraps WHERE binding_hash=$1 AND expires_at>clock_timestamp() FOR UPDATE',[bh]);
   requireThat(b.rows[0]&&equalSecret(b.rows[0].csrf_hash,keyed(config.sessionKey,header)),'BOOTSTRAP_INVALID',401);
   const replay=await c.query<{proof_hash:string;escrow:string|null;valid:boolean;revoked:boolean}>('SELECT e.proof_hash,e.escrow,e.escrow_expires_at>clock_timestamp() AND s.absolute_expires_at>clock_timestamp() AND s.last_seen_at>clock_timestamp()-interval \'900 seconds\' AS valid,e.revoked OR s.revoked AS revoked FROM session_exchanges e JOIN app_sessions s ON s.id=e.session_id WHERE e.binding_hash=$1 AND e.exchange_key=$2 FOR UPDATE OF s',[bh,exchangeKey]);
   if(replay.rows[0]){const x=replay.rows[0];requireThat(x.proof_hash===ph,'EXCHANGE_CONFLICT',409);requireThat(x.valid&&!x.revoked&&x.escrow,'REAUTH_REQUIRED',401);
    return JSON.parse(unseal(config.escrowKey,x.escrow)) as {token:string;body:{actor:{id:string;displayName:string};csrfToken:string;absoluteExpiresAt:string;idleTtlSeconds:900}};}
   await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[ph]);
   // Resume a repeated launch only with the exact active cookie already bound to this proof.
   if(previousToken){
    const resumed=await c.query<SessionRow>(`SELECT s.id,s.actor_id,s.family_id,s.csrf_generation,s.absolute_expires_at,a.display_name FROM session_exchanges e JOIN app_sessions s ON s.id=e.session_id JOIN actors a ON a.id=s.actor_id WHERE e.proof_hash=$1 AND s.token_hash=$2 AND NOT e.revoked AND NOT s.revoked AND s.absolute_expires_at>clock_timestamp() AND s.last_seen_at>clock_timestamp()-interval '900 seconds' FOR UPDATE OF s`,[ph,keyed(config.sessionKey,previousToken)]);
    const row=resumed.rows[0];
    if(row){
     await c.query('UPDATE app_sessions SET last_seen_at=clock_timestamp() WHERE id=$1',[row.id]);
     return {token:previousToken,body:{actor:{id:row.actor_id,displayName:row.display_name},csrfToken:csrf(row.id,row.csrf_generation),absoluteExpiresAt:row.absolute_expires_at.toISOString(),idleTtlSeconds:900 as const}};
    }
   }
   const reused=await c.query('SELECT 1 FROM session_exchanges WHERE proof_hash=$1 OR binding_hash=$2',[ph,bh]);requireThat(reused.rowCount===0,'REAUTH_REQUIRED',401);
   const actor=await c.query<{id:string;display_name:string}>('INSERT INTO actors(id,external_id,display_name) VALUES($1,$2,$3) ON CONFLICT(external_id) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id,display_name',[randomUUID(),proof.actorExternalId,proof.displayName]);
   if(previousToken){const old=await c.query<{family_id:string}>('SELECT family_id FROM app_sessions WHERE token_hash=$1 FOR UPDATE',[keyed(config.sessionKey,previousToken)]);
    if(old.rows[0]){await c.query('UPDATE app_sessions SET revoked=true WHERE family_id=$1',[old.rows[0].family_id]);await c.query('UPDATE session_exchanges SET revoked=true,escrow=NULL WHERE session_id IN (SELECT id FROM app_sessions WHERE family_id=$1)',[old.rows[0].family_id]);}}
   const token=randomBytes(32).toString('base64url'),id=randomUUID(),family=randomUUID(),expires=new Date(Math.min(now+3600,proof.authDate+3600)*1000);
   await c.query('INSERT INTO app_sessions(id,actor_id,family_id,token_hash,issued_at,absolute_expires_at,last_seen_at) VALUES($1,$2,$3,$4,clock_timestamp(),$5,clock_timestamp())',[id,actor.rows[0]!.id,family,keyed(config.sessionKey,token),expires]);
   const result={token,body:{actor:{id:actor.rows[0]!.id,displayName:actor.rows[0]!.display_name},csrfToken:csrf(id,1),absoluteExpiresAt:expires.toISOString(),idleTtlSeconds:900 as const}};
   await c.query('INSERT INTO session_exchanges(binding_hash,exchange_key,proof_hash,session_id,escrow,escrow_expires_at) VALUES($1,$2,$3,$4,$5,clock_timestamp()+interval \'120 seconds\')',[bh,exchangeKey,ph,id,seal(config.escrowKey,JSON.stringify(result))]);
   return result;
  });
 },
 async authenticate(token:string|undefined,csrfHeader?:string){
  requireThat(token&&/^[\w-]{43}$/.test(token),'SESSION_REQUIRED',401);
  return transaction(pool,async c=>{
   const result=await c.query<SessionRow>(`SELECT s.id,s.actor_id,s.family_id,s.csrf_generation,s.absolute_expires_at,a.display_name FROM app_sessions s JOIN actors a ON a.id=s.actor_id WHERE token_hash=$1 AND NOT s.revoked AND absolute_expires_at>clock_timestamp() AND last_seen_at>clock_timestamp()-interval '900 seconds' FOR UPDATE OF s`,[keyed(config.sessionKey,token)]);
   const row=result.rows[0];requireThat(row,'SESSION_EXPIRED',401);const csrfToken=csrf(row.id,row.csrf_generation);
   if(csrfHeader!==undefined)requireThat(equalSecret(csrfToken,csrfHeader),'CSRF_INVALID',403);
   await c.query('UPDATE app_sessions SET last_seen_at=clock_timestamp() WHERE id=$1',[row.id]);
   return {id:row.id,familyId:row.family_id,actor:{id:row.actor_id,displayName:row.display_name},csrfToken,absoluteExpiresAt:row.absolute_expires_at.toISOString(),idleTtlSeconds:900 as const};
  });
 },
 async logout(family:string){return transaction(pool,async c=>{await c.query('UPDATE app_sessions SET revoked=true WHERE family_id=$1',[family]);await c.query('UPDATE session_exchanges SET revoked=true,escrow=NULL WHERE session_id IN (SELECT id FROM app_sessions WHERE family_id=$1)',[family]);});}
 };
}
