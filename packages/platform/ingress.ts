import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {parseBotUpdate,type BotUpdate} from './bot.ts';
import {strictJson,obj,fatalUtf8} from './wire.ts';
import {digest,equalSecret} from './auth.ts';
import {requireThat} from '../domain/errors.ts';
import {transaction,seal} from '../persistence/sessions.ts';
export function ingressService(pool:Pool,config:{credentialScope:string;webhookSecret:string;escrowKey:string;mode:'WEBHOOK'|'POLLING'}){
 return {
 async assertOwner(){
  const r=await pool.query('INSERT INTO max_ingress_owner(credential_scope,mode) VALUES($1,$2) ON CONFLICT(credential_scope) DO UPDATE SET mode=max_ingress_owner.mode RETURNING mode',[config.credentialScope,config.mode]);
  requireThat(r.rows[0]?.mode===config.mode,'INGRESS_MODE_CONFLICT',503);
 },
 async accept(secret:string|undefined,raw:Buffer){
  requireThat(secret&&equalSecret(secret,config.webhookSecret),'WEBHOOK_FORBIDDEN',403);requireThat(raw.byteLength<=1048576,'BODY_TOO_LARGE',413);
  const hash=digest(raw.toString('base64'));
  let parsed:BotUpdate|undefined,reason='UNSUPPORTED_UPDATE';
  try{parsed=parseBotUpdate(obj(strictJson(fatalUtf8(raw),true)));}catch{reason='MALFORMED_UPDATE';}
  return transaction(pool,async c=>{
   if(!parsed){await c.query('INSERT INTO quarantine(id,payload_hash,reason,raw_cipher) VALUES($1,$2,$3,$4)',[randomUUID(),hash,reason,seal(config.escrowKey,raw.toString('base64'))]);return {accepted:true,quarantined:true};}
   const ins=await c.query('INSERT INTO inbox(id,event_key,payload_hash,kind) VALUES($1,$2,$3,$4) ON CONFLICT(event_key) DO NOTHING RETURNING id',[randomUUID(),parsed.key,hash,parsed.kind]);
   if(ins.rowCount===0){const old=await c.query<{payload_hash:string}>('SELECT payload_hash FROM inbox WHERE event_key=$1',[parsed.key]);
    if(old.rows[0]!.payload_hash!==hash)await c.query('INSERT INTO quarantine(id,payload_hash,reason,raw_cipher) VALUES($1,$2,$3,$4)',[randomUUID(),hash,'EVENT_KEY_COLLISION',seal(config.escrowKey,raw.toString('base64'))]);
    return {accepted:true,duplicate:true};}
   if(!parsed.reply){await c.query('UPDATE inbox SET processed=true WHERE id=$1',[ins.rows[0].id]);return {accepted:true,duplicate:false};}
   const reply=parsed.reply;
   const a=await c.query<{id:string}>('INSERT INTO actors(id,external_id,display_name) VALUES($1,$2,$3) ON CONFLICT(external_id) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id',[randomUUID(),reply.actorId,reply.name]);
   await c.query('INSERT INTO destinations(actor_id,chat_id,verified_at,source_digest) VALUES($1,$2,clock_timestamp(),$3) ON CONFLICT(actor_id) DO UPDATE SET chat_id=EXCLUDED.chat_id,verified_at=EXCLUDED.verified_at,source_digest=EXCLUDED.source_digest',[a.rows[0]!.id,reply.chatId,hash]);
   await c.query("INSERT INTO outbox(id,command_id,plan_id,actor_id,kind,purpose,state,inbox_id,expires_at) VALUES($1,NULL,NULL,$2,'BOT_WELCOME',$4,'READY',$3,clock_timestamp()+interval '1 hour') ON CONFLICT DO NOTHING",[randomUUID(),a.rows[0]!.id,ins.rows[0].id,reply.purpose]);
   await c.query('UPDATE inbox SET processed=true WHERE id=$1',[ins.rows[0].id]);return {accepted:true,duplicate:false};
  }); // caller sends HTTP 200 only after transaction COMMIT. Redis is not part of ingress.
 }
 };
}
