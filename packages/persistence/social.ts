import {createHash,randomBytes,randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {requireThat} from '../domain/errors.ts';
import {transaction} from './sessions.ts';

export interface Preferences {city:string;interests:string[];budgetRub:number|null;radiusKm:number;notificationsEnabled:boolean;preferredTime:'ANY'|'MORNING'|'DAY'|'EVENING'|'NIGHT'}
export interface PreferenceState extends Preferences {catalogCoverage:'SUPPORTED'|'UNSUPPORTED'}
export interface PlanPresentationInput {title:string;meetingTime:string|null;meetingPoint:string|null;note:string|null;participantLimit:number|null;expectedVersion:number}
export function socialService(pool:Pool){
 const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
 const settings=async(actor:string):Promise<PreferenceState>=>{
  const result=await pool.query<{city:string;interests:string[];budget_rub:number|null;radius_km:number;notifications_enabled:boolean;preferred_time:Preferences['preferredTime']}>(
   'SELECT city,interests,budget_rub,radius_km,notifications_enabled,preferred_time FROM actor_preferences WHERE actor_id=$1',[actor]);
  const row=result.rows[0];const value:Preferences=row?{city:row.city,interests:row.interests,budgetRub:row.budget_rub,radiusKm:row.radius_km,notificationsEnabled:row.notifications_enabled,preferredTime:row.preferred_time}
   :{city:'Москва',interests:[],budgetRub:null,radiusKm:15,notificationsEnabled:true,preferredTime:'ANY'};
  return {...value,catalogCoverage:value.city==='Москва'?'SUPPORTED' as const:'UNSUPPORTED' as const};
 };
 const mayReadPlan=async(actor:string,plan:string)=>{
  const r=await pool.query('SELECT 1 FROM plans p WHERE p.id=$1 AND (p.organizer_id=$2 OR EXISTS(SELECT 1 FROM plan_slots s WHERE s.plan_id=p.id AND s.actor_id=$2 AND s.state=\'ACTIVE\'))',[plan,actor]);
  requireThat(r.rowCount===1,'FORBIDDEN',403);
 };
 return {
  settings,
  async createFriendLink(actor:string){
   const token=randomBytes(32).toString('hex');
   await pool.query("INSERT INTO friend_links(token_hash,actor_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '14 days')",[digest(token),actor]);
   return {token};
  },
  async requestFromFriendLink(actor:string,token:string){
   const r=await pool.query<{actor_id:string}>('SELECT actor_id FROM friend_links WHERE token_hash=$1 AND expires_at>clock_timestamp()',[digest(token)]);
   requireThat(r.rows[0],'INVITE_EXPIRED',404);
   return this.requestFriend(actor,r.rows[0].actor_id);
  },
  async friendLinkStatus(actor:string,token:string){
   const r=await pool.query<{actor_id:string;display_name:string}>(`SELECT l.actor_id,a.display_name FROM friend_links l JOIN actors a ON a.id=l.actor_id WHERE l.token_hash=$1 AND l.expires_at>clock_timestamp()`,[digest(token)]);
   requireThat(r.rows[0],'INVITE_EXPIRED',404);
   const inviter=r.rows[0]!;
   if(inviter.actor_id===actor)return {name:inviter.display_name,state:'SELF'};
   const relation=await pool.query<{state:string;requester_id:string}>(`SELECT state,requester_id FROM friendships WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1) ORDER BY CASE WHEN state='ACCEPTED' THEN 0 ELSE 1 END LIMIT 1`,[actor,inviter.actor_id]);
   return {name:inviter.display_name,state:relation.rows[0]?.state==='ACCEPTED'?'FRIEND':relation.rows[0]?.state==='PENDING'?'PENDING':relation.rows[0]?.state==='REJECTED'?'REJECTED':'AVAILABLE'};
  },
  async rejectFriend(actor:string,requester:string){
   const r=await pool.query("UPDATE friendships SET state='REJECTED' WHERE requester_id=$1 AND recipient_id=$2 AND state='PENDING' RETURNING requester_id",[requester,actor]);
   if(!r.rowCount){const old=await pool.query("SELECT 1 FROM friendships WHERE requester_id=$1 AND recipient_id=$2 AND state='REJECTED'",[requester,actor]);requireThat(old.rowCount===1,'FRIEND_REQUEST_NOT_FOUND',404);}
   return {rejected:true};
  },
  async rejectJoin(actor:string,plan:string,requester:string){
   return transaction(pool,async db=>{
    const owner=await db.query('SELECT 1 FROM plans WHERE id=$1 AND organizer_id=$2 FOR UPDATE',[plan,actor]);requireThat(owner.rowCount===1,'FORBIDDEN',403);
    const r=await db.query("UPDATE join_requests SET state='REJECTED' WHERE plan_id=$1 AND actor_id=$2 AND state='PENDING' RETURNING actor_id",[plan,requester]);
    if(!r.rowCount){const old=await db.query("SELECT 1 FROM join_requests WHERE plan_id=$1 AND actor_id=$2 AND state='REJECTED'",[plan,requester]);requireThat(old.rowCount===1,'JOIN_REQUEST_NOT_FOUND',404);return {rejected:true};}
    await db.query("INSERT INTO in_app_notifications(id,actor_id,kind,title,plan_id,actor_context_id) VALUES(gen_random_uuid(),$1,'JOIN_REJECTED','Запрос на участие отклонён',$2,$3)",[requester,plan,actor]);
    return {rejected:true};
   });
  },
  async joinRequests(actor:string,plan:string){
   const owner=await pool.query('SELECT 1 FROM plans WHERE id=$1 AND organizer_id=$2',[plan,actor]);requireThat(owner.rowCount===1,'FORBIDDEN',403);
   const r=await pool.query<{actor_id:string;display_name:string;state:string}>("SELECT j.actor_id,a.display_name,j.state FROM join_requests j JOIN actors a ON a.id=j.actor_id WHERE j.plan_id=$1 AND j.state='PENDING' ORDER BY a.display_name",[plan]);
   return {items:r.rows.map(x=>({actorId:x.actor_id,name:x.display_name,state:x.state}))};
  },
  async planPresentation(actor:string,plan:string){
   await mayReadPlan(actor,plan);
   const core=await pool.query<{title:string;slots:unknown[];phase:string;organizer_id:string;organizer_name:string}>("SELECT p.state->>'title' title,p.state->'slots' slots,p.state->>'phase' phase,p.organizer_id,a.display_name organizer_name FROM plans p JOIN actors a ON a.id=p.organizer_id WHERE p.id=$1",[plan]);
   const participants=await pool.query<{actor_id:string;display_name:string}>("SELECT s.actor_id,a.display_name FROM plan_slots s JOIN actors a ON a.id=s.actor_id WHERE s.plan_id=$1 AND s.state='ACTIVE'",[plan]);
   const r=await pool.query<{version:number;reconfirm_version:number;title:string;meeting_time:Date|null;meeting_point:string|null;note:string|null;participant_limit:number|null;changed_fields:Record<string,{from:string|null;to:string|null}>;seen_version:number|null}>(`SELECT p.*,s.seen_version FROM plan_presentation p LEFT JOIN plan_presentation_seen s ON s.plan_id=p.plan_id AND s.actor_id=$2 WHERE p.plan_id=$1`,[plan,actor]);
   const row=r.rows[0];
   const history=row&&row.version>(row.seen_version??0)?await pool.query<{version:number;changed_fields:Record<string,{from:string|null;to:string|null}>}>(
    'SELECT version,changed_fields FROM plan_presentation_changes WHERE plan_id=$1 AND version>$2 AND version<=$3 ORDER BY version',[plan,row.seen_version??0,row.version]):null;
   const changedFields:Record<string,{from:string|null;to:string|null}>={};
   for(const entry of history?.rows??[])for(const [key,change] of Object.entries(entry.changed_fields)){
    if(changedFields[key])changedFields[key].to=change.to;else changedFields[key]={...change};
   }
   const changeHistoryComplete=!row||row.version<=(row.seen_version??0)||history?.rows[0]?.version===(row.seen_version??0)+1;
   return {version:row?.version??0,reconfirmVersion:row?.reconfirm_version??0,title:row?.title??core.rows[0]?.title??'План',meetingTime:row?.meeting_time?.toISOString()??null,
    meetingPoint:row?.meeting_point??null,note:row?.note??null,participantLimit:row?.participant_limit??null,
    maxParticipants:core.rows[0]?.slots?.length??1,phase:core.rows[0]?.phase??'DRAFT',organizerId:core.rows[0]!.organizer_id,organizerName:core.rows[0]!.organizer_name,
    participantNames:Object.fromEntries(participants.rows.map(row=>[row.actor_id,row.display_name])),
    changedFields,changeHistoryComplete};
  },
  async savePlanPresentation(actor:string,plan:string,input:PlanPresentationInput){
   const core=await pool.query<{organizer_id:string;state:{slots:{state:string}[];phase:string}}> ('SELECT organizer_id,state FROM plans WHERE id=$1',[plan]);
   requireThat(core.rows[0]&&core.rows[0].organizer_id===actor,'FORBIDDEN',403);
   requireThat(!['CANCELLED','CLOSED'].includes(core.rows[0].state.phase),'TERMINAL',409);
   const occupied=core.rows[0].state.slots.filter(x=>x.state==='ACTIVE').length;
   requireThat(input.participantLimit===null||input.participantLimit>=occupied&&input.participantLimit<=core.rows[0].state.slots.length,'PARTICIPANT_LIMIT',422);
   const current=await this.planPresentation(actor,plan);
   const next={title:input.title.trim(),meetingTime:input.meetingTime,meetingPoint:input.meetingPoint?.trim()||null,note:input.note?.trim()||null,participantLimit:input.participantLimit};
   const changed:Record<string,{from:string|null;to:string|null}>={};
   for(const key of ['title','meetingTime','meetingPoint','note','participantLimit'] as const){
    const before=current[key],after=next[key];if(before!==after)changed[key]={from:before===null?null:String(before),to:after===null?null:String(after)};
   }
   if(!Object.keys(changed).length)return current;
   requireThat(current.version===input.expectedVersion,'VERSION_CONFLICT',409);
   const material=Boolean(changed.meetingTime||changed.meetingPoint);
   await transaction(pool,async db=>{
   const locked=await db.query<{state:{slots:{state:string}[];phase:string}}>('SELECT state FROM plans WHERE id=$1 AND organizer_id=$2 FOR UPDATE',[plan,actor]);requireThat(locked.rowCount===1,'FORBIDDEN',403);
   requireThat(!['CANCELLED','CLOSED'].includes(locked.rows[0]!.state.phase),'TERMINAL',409);
   const lockedOccupied=locked.rows[0]!.state.slots.filter(x=>x.state==='ACTIVE').length;
   requireThat(next.participantLimit===null||next.participantLimit>=lockedOccupied&&next.participantLimit<=locked.rows[0]!.state.slots.length,'PARTICIPANT_LIMIT',422);
   const result=await db.query<{version:number;reconfirm_version:number}>(`INSERT INTO plan_presentation(plan_id,version,title,meeting_time,meeting_point,note,participant_limit,changed_fields,reconfirm_version)
    VALUES($1,1,$2,$3,$4,$5,$6,$7::jsonb,CASE WHEN $9 THEN 1 ELSE 0 END)
    ON CONFLICT(plan_id) DO UPDATE SET version=plan_presentation.version+1,title=EXCLUDED.title,meeting_time=EXCLUDED.meeting_time,
    meeting_point=EXCLUDED.meeting_point,note=EXCLUDED.note,participant_limit=EXCLUDED.participant_limit,changed_fields=EXCLUDED.changed_fields,
    reconfirm_version=plan_presentation.reconfirm_version+CASE WHEN $9 THEN 1 ELSE 0 END,changed_at=clock_timestamp()
    WHERE plan_presentation.version=$8 RETURNING version,reconfirm_version`,
    [plan,next.title,next.meetingTime,next.meetingPoint,next.note,next.participantLimit,JSON.stringify(changed),input.expectedVersion,material]);
   requireThat(result.rowCount===1,'VERSION_CONFLICT',409);
   await db.query('INSERT INTO plan_presentation_changes(plan_id,version,changed_fields) VALUES($1,$2,$3::jsonb)',[plan,result.rows[0]!.version,JSON.stringify(changed)]);
   await db.query(`INSERT INTO in_app_notifications(id,actor_id,kind,title,plan_id,actor_context_id)
    SELECT gen_random_uuid(),s.actor_id,'PLAN_CHANGED','План изменился',$1,$2 FROM plan_slots s
    WHERE s.plan_id=$1 AND s.state='ACTIVE' AND s.actor_id<>$2 AND COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=s.actor_id),true)`,[plan,actor]);
   if(material)await db.query(`INSERT INTO outbox(id,command_id,plan_id,actor_id,kind,purpose,state,expires_at,notification_key,semantic_revision)
    SELECT gen_random_uuid(),NULL,$1::uuid,s.actor_id,'RECONFIRMATION','RECONFIRMATION','READY',clock_timestamp()+interval '1 hour',
     'reconfirm:'||($1::uuid)::text||':'||s.actor_id::text||':'||($2::integer)::text,$2::integer
    FROM plan_slots s JOIN plan_rsvps r ON r.plan_id=s.plan_id AND r.actor_id=s.actor_id AND r.state='YES' AND r.reconfirm_version<$2::integer
    WHERE s.plan_id=$1::uuid AND s.state='ACTIVE' AND s.actor_id<>$3::uuid
    AND COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=s.actor_id),true)
    ON CONFLICT DO NOTHING`,[plan,result.rows[0]!.reconfirm_version,actor]);
   });
   return this.planPresentation(actor,plan);
  },
  async acknowledgePlanPresentation(actor:string,plan:string,expectedVersion:number){
   const current=await this.planPresentation(actor,plan);
   requireThat(expectedVersion===current.version,'VERSION_CONFLICT',409);
   await pool.query(`INSERT INTO plan_presentation_seen(plan_id,actor_id,seen_version) VALUES($1,$2,$3)
    ON CONFLICT(plan_id,actor_id) DO UPDATE SET seen_version=GREATEST(plan_presentation_seen.seen_version,EXCLUDED.seen_version)`,[plan,actor,expectedVersion]);
   return {seen:true};
  },
  async planRsvps(actor:string,plan:string){
   await mayReadPlan(actor,plan);
   const r=await pool.query<{actor_id:string|null;state:'YES'|'MAYBE'|'NO'|null;reconfirm_version:number|null;current_version:number}>(`SELECT r.actor_id,r.state,r.reconfirm_version,COALESCE(p.reconfirm_version,0) current_version
    FROM plans core LEFT JOIN plan_presentation p ON p.plan_id=core.id LEFT JOIN plan_rsvps r ON r.plan_id=core.id WHERE core.id=$1`,[plan]);
   return {currentReconfirmVersion:r.rows[0]?.current_version??0,items:r.rows.filter(x=>x.actor_id!==null&&x.state!==null&&x.reconfirm_version!==null).map(x=>({actorId:x.actor_id!,state:x.state!,reconfirmVersion:x.reconfirm_version!,needsReconfirmation:x.state==='YES'&&x.reconfirm_version!<x.current_version,responseRequired:x.state==='YES'&&x.reconfirm_version!<x.current_version}))};
  },
  async setPlanRsvp(actor:string,plan:string,state:'YES'|'MAYBE'|'NO',expectedReconfirmVersion:number){
   return transaction(pool,async db=>{
   const phase=await db.query<{phase:string;organizer_id:string}>("SELECT state->>'phase' phase,organizer_id FROM plans WHERE id=$1 FOR SHARE",[plan]);
   requireThat(phase.rows[0],'NOT_FOUND',404);
   const allowed=await db.query('SELECT 1 FROM plan_slots WHERE plan_id=$1 AND actor_id=$2 AND state=\'ACTIVE\'',[plan,actor]);
   requireThat(phase.rows[0].organizer_id===actor||allowed.rowCount===1,'FORBIDDEN',403);
   requireThat(!['CANCELLED','CLOSED'].includes(phase.rows[0]?.phase??''),'TERMINAL',409);
   const version=await db.query<{reconfirm_version:number}>('SELECT reconfirm_version FROM plan_presentation WHERE plan_id=$1',[plan]);
   const currentVersion=version.rows[0]?.reconfirm_version??0;
   requireThat(expectedReconfirmVersion===currentVersion,'VERSION_CONFLICT',409);
   const changed=await db.query(`INSERT INTO plan_rsvps(plan_id,actor_id,state,reconfirm_version) VALUES($1,$2,$3,$4)
    ON CONFLICT(plan_id,actor_id) DO UPDATE SET state=EXCLUDED.state,reconfirm_version=EXCLUDED.reconfirm_version,updated_at=clock_timestamp()
    WHERE plan_rsvps.state IS DISTINCT FROM EXCLUDED.state OR plan_rsvps.reconfirm_version IS DISTINCT FROM EXCLUDED.reconfirm_version RETURNING actor_id`,[plan,actor,state,currentVersion]);
   if(changed.rowCount&&phase.rows[0]?.organizer_id!==actor)await db.query(`INSERT INTO in_app_notifications(id,actor_id,kind,title,plan_id,actor_context_id)
    SELECT gen_random_uuid(),$2,'RSVP_CHANGED','Участник изменил ответ',$1,$3
    WHERE COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=$2),true)`,[plan,phase.rows[0]?.organizer_id,actor]);
   return {state,reconfirmVersion:currentVersion};
   });
  },
  async saveSettings(actor:string,value:Preferences){
   await pool.query(`INSERT INTO actor_preferences(actor_id,city,interests,budget_rub,radius_km,notifications_enabled,preferred_time) VALUES($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(actor_id) DO UPDATE SET city=EXCLUDED.city,interests=EXCLUDED.interests,budget_rub=EXCLUDED.budget_rub,radius_km=EXCLUDED.radius_km,notifications_enabled=EXCLUDED.notifications_enabled,preferred_time=EXCLUDED.preferred_time,updated_at=clock_timestamp()`,
    [actor,value.city,value.interests,value.budgetRub,value.radiusKm,value.notificationsEnabled,value.preferredTime]);return settings(actor);
  },
  async friends(actor:string){
   const r=await pool.query<{id:string;display_name:string;state:string;direction:string}>(`SELECT a.id,a.display_name,f.state,CASE WHEN f.requester_id=$1 THEN 'OUTGOING' ELSE 'INCOMING' END direction
    FROM friendships f JOIN actors a ON a.id=CASE WHEN f.requester_id=$1 THEN f.recipient_id ELSE f.requester_id END
    WHERE (f.requester_id=$1 OR f.recipient_id=$1) AND f.state<>'REJECTED' ORDER BY f.created_at DESC`,[actor]);return {items:r.rows.map(x=>({id:x.id,name:x.display_name,state:x.state,direction:x.direction}))};
  },
  async requestFriend(actor:string,recipient:string){
   requireThat(actor!==recipient,'SELF_FRIEND',400);
   return transaction(pool,async db=>{
    const exists=await db.query('SELECT 1 FROM actors WHERE id=$1',[recipient]);requireThat(exists.rowCount===1,'USER_NOT_FOUND',404);
    const inserted=await db.query(`INSERT INTO friendships(requester_id,recipient_id,state) VALUES($1,$2,'PENDING') ON CONFLICT DO NOTHING RETURNING requester_id`,[actor,recipient]);
    if(inserted.rowCount)await db.query(`INSERT INTO in_app_notifications(id,actor_id,kind,title,actor_context_id) VALUES($1,$2,'FRIEND_REQUEST','Новый запрос в друзья',$3)`,[randomUUID(),recipient,actor]);
    if(!inserted.rowCount){
     const current=await db.query<{state:string}>(`SELECT state FROM friendships WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1) LIMIT 1`,[actor,recipient]);
     requireThat(current.rows[0],'FRIEND_STATE_UNAVAILABLE',503);
     return {requested:false,state:current.rows[0].state};
    }
    return {requested:true,state:'PENDING'};
   });
  },
  async acceptFriend(actor:string,requester:string){
   const r=await pool.query(`UPDATE friendships SET state='ACCEPTED' WHERE requester_id=$1 AND recipient_id=$2 AND state='PENDING' RETURNING requester_id`,[requester,actor]);
   if(!r.rowCount){const old=await pool.query("SELECT 1 FROM friendships WHERE requester_id=$1 AND recipient_id=$2 AND state='ACCEPTED'",[requester,actor]);requireThat(old.rowCount===1,'FRIEND_REQUEST_NOT_FOUND',404);}
   return {accepted:true};
  },
  async messages(actor:string,plan:string){
   await mayReadPlan(actor,plan);
   const r=await pool.query<{id:string;actor_id:string;display_name:string;body:string;created_at:Date}>(`SELECT m.id,m.actor_id,a.display_name,m.body,m.created_at FROM plan_messages m JOIN actors a ON a.id=m.actor_id WHERE m.plan_id=$1 ORDER BY m.created_at,m.id LIMIT 200`,[plan]);
   return {items:r.rows.map(x=>({id:x.id,senderId:x.actor_id,sender:x.display_name,text:x.body,createdAt:x.created_at.toISOString()}))};
  },
  async sendMessage(actor:string,plan:string,body:string){
   await mayReadPlan(actor,plan);
   const id=randomUUID();
   await pool.query('INSERT INTO plan_messages(id,plan_id,actor_id,body) VALUES($1,$2,$3,$4)',[id,plan,actor,body]);
   await pool.query(`INSERT INTO in_app_notifications(id,actor_id,kind,title,plan_id)
    SELECT gen_random_uuid(),member.actor_id,'PLAN_CHAT','Новое сообщение в плане',$1 FROM
    (SELECT organizer_id actor_id FROM plans WHERE id=$1 UNION SELECT actor_id FROM plan_slots WHERE plan_id=$1 AND state='ACTIVE') member
    WHERE member.actor_id<>$2 AND COALESCE((SELECT notifications_enabled FROM actor_preferences WHERE actor_id=member.actor_id),true)`,[plan,actor]);
   return {id};
  },
  async planInviteStatuses(actor:string,plan:string){
   await mayReadPlan(actor,plan);
   const [members,notifications,invites]=await Promise.all([
    pool.query<{actor_id:string}>("SELECT actor_id FROM plan_slots WHERE plan_id=$1 AND state='ACTIVE' AND actor_id IS NOT NULL",[plan]),
    pool.query<{actor_id:string;invite_ref:string|null}>("SELECT actor_id,invite_ref FROM in_app_notifications WHERE plan_id=$1 AND kind='PLAN_INVITE'",[plan]),
    pool.query<{token_hash:string}>("SELECT token_hash FROM invites WHERE plan_id=$1 AND NOT revoked AND expires_at>clock_timestamp()",[plan])
   ]);
   const states=new Map<string,string>(members.rows.map(x=>[x.actor_id,'PARTICIPATING']));
   const live=new Set(invites.rows.map(x=>x.token_hash));
   for(const n of notifications.rows)if(!states.has(n.actor_id)&&n.invite_ref&&live.has(digest(n.invite_ref)))states.set(n.actor_id,'PENDING');
   return {items:[...states].sort(([a],[b])=>a.localeCompare(b)).map(([friendId,state])=>({friendId,state}))};
  },
  async notifications(actor:string){
   const r=await pool.query<{id:string;kind:string;title:string;plan_id:string|null;invite_ref:string|null;actor_context_id:string|null;read_at:Date|null;created_at:Date;actor_name:string|null;plan_title:string|null;event_title:string|null}>(`SELECT n.id,n.kind,n.title,n.plan_id,n.invite_ref,n.actor_context_id,n.read_at,n.created_at,a.display_name actor_name,
    COALESCE(pp.title,p.state->>'title') plan_title,p.state->'options'->0->'snapshots'->0->'terms'->>'title' event_title
    FROM in_app_notifications n LEFT JOIN actors a ON a.id=n.actor_context_id LEFT JOIN plans p ON p.id=n.plan_id
    LEFT JOIN plan_presentation pp ON pp.plan_id=n.plan_id WHERE n.actor_id=$1 AND n.kind<>'PLAN_CHAT' ORDER BY n.created_at DESC,n.id DESC LIMIT 100`,[actor]);
   const count=await pool.query<{count:string}>("SELECT count(*) AS count FROM in_app_notifications WHERE actor_id=$1 AND read_at IS NULL AND kind<>'PLAN_CHAT'",[actor]);
   return {unreadCount:Number(count.rows[0]!.count),items:r.rows.map(x=>({id:x.id,kind:x.kind,title:x.title,planId:x.plan_id,inviteRef:x.invite_ref,actorId:x.actor_context_id,read:x.read_at!==null,createdAt:x.created_at.toISOString(),actorName:x.actor_name,planTitle:x.plan_title,eventTitle:x.event_title,
    target:x.invite_ref?{kind:'INVITE',inviteRef:x.invite_ref}:x.plan_id?{kind:'PLAN',planId:x.plan_id}:x.kind==='FRIEND_REQUEST'?{kind:'FRIENDS'}:{kind:'UNAVAILABLE'}}))};
  },
  async unreadCount(actor:string){
   const r=await pool.query<{count:string}>("SELECT count(*) AS count FROM in_app_notifications WHERE actor_id=$1 AND read_at IS NULL AND kind<>'PLAN_CHAT'",[actor]);
   return {unreadCount:Number(r.rows[0]!.count)};
  },
  async readNotification(actor:string,id:string){
   const r=await pool.query('UPDATE in_app_notifications SET read_at=COALESCE(read_at,clock_timestamp()) WHERE actor_id=$1 AND id=$2 RETURNING id',[actor,id]);
   requireThat(r.rowCount===1,'NOTIFICATION_NOT_FOUND',404);return {read:true};
  }
 };
}
