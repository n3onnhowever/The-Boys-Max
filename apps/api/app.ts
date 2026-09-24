import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import {validatorCompiler,serializerCompiler,jsonSchemaTransform} from 'fastify-type-provider-zod';
import type {ZodTypeProvider} from 'fastify-type-provider-zod';
import type {FastifyRequest} from 'fastify';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Config} from '../../packages/platform/config.ts';
import {connect} from '../../packages/persistence/db.ts';
import {sessionService} from '../../packages/persistence/sessions.ts';
import {savedService} from '../../packages/persistence/saved.ts';
import {DEMO_ITEMS,DEMO_NOTICE} from '../../packages/demo/catalog-v1.ts';
import {planService} from '../../packages/persistence/plans.ts';
import {ingressService} from '../../packages/platform/ingress.ts';
import {AppError,requireThat} from '../../packages/domain/errors.ts';
import {equalSecret} from '../../packages/platform/auth.ts';
import {strictJson,fatalUtf8} from '../../packages/platform/wire.ts';
import {uiService} from '../../packages/persistence/ui.ts';
import {CoreError} from '../../modules/search/core/guard.ts';
import {routeSchema as uiRoute,envelopeSchema as uiEnvelope,viewSchema as uiView} from '../miniapp/src/port/schema.ts';
import * as S from '../../packages/contracts/http.ts';
export async function buildApp(c:Config){
 const app=Fastify({bodyLimit:73728,logger:false,disableRequestLogging:true,genReqId:()=>randomUUID(),trustProxy:false}).withTypeProvider<ZodTypeProvider>();
 app.setValidatorCompiler(validatorCompiler);app.setSerializerCompiler(serializerCompiler);
 app.removeContentTypeParser('application/json');
 app.addContentTypeParser('application/json',{parseAs:'buffer'},(req,body,done)=>{try{done(null,strictJson(fatalUtf8(body as Buffer)));}catch(e){done(e as Error,undefined);}});
 await app.register(cookie);
 await app.register(swagger,{openapi:{openapi:'3.0.3',info:{title:'The Boys — личная афиша и совместный план',version:'26.1.0-candidate'},servers:[{url:c.publicOrigin}],components:{securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'__Host-max_session'}}}},transform:jsonSchemaTransform});
 const {pool,db}=connect(c.databaseUrl),sessions=sessionService(pool,c),plans=planService(db,c.sessionKey),ingress=ingressService(pool,{...c,mode:c.ingressMode}),saved=savedService(pool,c.mode);
 const ui=uiService(pool,plans,c);
 const attrs={secure:true,httpOnly:true,path:'/',sameSite:c.cookieProfile==='LAX_FIRST_PARTY'?'lax' as const:'none' as const,partitioned:c.cookieProfile==='PARTITIONED_EMBEDDED'};
 const header=(r:FastifyRequest,name:string)=>{const h=r.headers[name];return typeof h==='string'?h:undefined;};
 const origin=(r:FastifyRequest)=>requireThat(header(r,'origin')===c.publicOrigin,'ORIGIN_INVALID',403);
 const readOrigin=(r:FastifyRequest)=>{if(header(r,'origin')!==undefined)origin(r);requireThat(header(r,'sec-fetch-site')!=='cross-site','ORIGIN_INVALID',403);};
 const json=(r:FastifyRequest)=>requireThat(/^application\/json(?:\s*;.*)?$/i.test(header(r,'content-type')??''),'JSON_REQUIRED',415);
 const auth=async(r:FastifyRequest,write=false)=>{readOrigin(r);if(write){origin(r);json(r);requireThat(header(r,'x-csrf-token'),'CSRF_REQUIRED',403);}return sessions.authenticate(r.cookies['__Host-max_session'],write?header(r,'x-csrf-token'):undefined);};
 app.addHook('onSend',async(_r,reply,payload)=>{reply.header('Cache-Control','no-store');reply.header('X-Content-Type-Options','nosniff');reply.header('Referrer-Policy','no-referrer');return payload;});
 app.addHook('onResponse',async(r,reply)=>{console.log(JSON.stringify({event:'http_end',requestId:r.id,route:r.routeOptions.url,status:reply.statusCode}));});
 app.setErrorHandler((err,req,reply)=>{
  // Fastify 5 passes unknown: thrown values need not be Error instances.
  const validation=typeof err==='object'&&err!==null&&'validation' in err&&Array.isArray(err.validation);
  const statusCode=typeof err==='object'&&err!==null&&'statusCode' in err?err.statusCode:undefined;
  const status=err instanceof CoreError?422:err instanceof AppError?err.status:validation?400:typeof statusCode==='number'&&Number.isInteger(statusCode)&&statusCode>=400&&statusCode<500?statusCode:503;
  const code=err instanceof CoreError?err.code:err instanceof AppError?err.code:validation?'VALIDATION_FAILED':status===413?'BODY_TOO_LARGE':status===415?'JSON_REQUIRED':'SERVICE_UNAVAILABLE';
  void reply.code(status).send({error:{code,requestId:req.id}});
 });
 app.setNotFoundHandler((req,reply)=>reply.code(404).send({error:{code:'NOT_FOUND',requestId:req.id}}));
 // Static harness is not an authentication fallback. It remains usable only with a legitimate session.
 app.get('/',{schema:{hide:true}},async(_r,reply)=>{try{return reply.type('text/html; charset=utf-8').send(await readFile(resolve('dist/miniapp/index.html')));}catch{throw new AppError('MINIAPP_BUILD_REQUIRED',503);}});
 app.get('/assets/:name',{schema:{hide:true}},async(r,reply)=>{
  const name=(r.params as {name:string}).name;requireThat(/^[A-Za-z0-9_-]+\.(js|css)$/.test(name),'NOT_FOUND',404);
  try{return reply.type(name.endsWith('.js')?'application/javascript':'text/css').send(await readFile(resolve('dist/miniapp/assets',name)));}catch{throw new AppError('NOT_FOUND',404);}
 });
 app.get('/health/live',{schema:{response:{200:z.strictObject({alive:z.literal(true)})}}},async()=>({alive:true as const}));
 if(c.mode==='demo')app.get('/demo/source/:id',{schema:{hide:true,params:z.strictObject({id:z.string().regex(/^[a-z0-9-]+$/)})}},async(r,reply)=>{
  const item=DEMO_ITEMS.find(x=>x.id===r.params.id);requireThat(item,'NOT_FOUND',404);
  reply.header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
  return reply.type('text/html; charset=utf-8').send(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Демонстрационный источник — Повод</title><body style="font:18px system-ui;max-width:42rem;margin:3rem auto;padding:1rem"><h1>${DEMO_NOTICE}</h1><p>${item.title}</p><p>Это подготовленная командой вымышленная запись для показа интерфейса. Место проведения, выступления, билеты и доступность не заявлены.</p><p>Дата в демонстрационном наборе: ${item.start.slice(0,10)} (Москва). Не используйте её для поездки.</p></body></html>`);
 });
 app.get('/health/ready',{schema:{response:{200:z.strictObject({database:z.literal('UP'),outboundHold:z.boolean()}),...S.errors}}},async()=>{
  const r=await pool.query<{hold:boolean}>('SELECT hold FROM outbound_control WHERE id=1');return {database:'UP' as const,outboundHold:r.rows[0]?.hold!==false};
 });
 // Every view read authenticates a session, not a synthetic one-person group.
 app.get('/api/ui/v1/session',{schema:{response:{200:z.strictObject({csrfToken:z.string(),externalOrigins:z.array(z.url())}),...S.errors}}},async r=>{
  const s=await auth(r);return {csrfToken:s.csrfToken,externalOrigins:[c.publicOrigin,'https://max.ru',...(c.externalOrigins??[])]};
 });
 app.get('/api/ui/v1/view',{schema:{querystring:z.strictObject({route:z.string().max(4096)}),response:{200:uiView,...S.errors},security:[{sessionCookie:[]}]}},async r=>{
  const s=await auth(r);let raw:unknown;try{raw=strictJson(r.query.route);}catch{throw new AppError('ROUTE_INVALID',400);}
  const route=uiRoute.safeParse(raw);requireThat(route.success,'ROUTE_INVALID',400);return ui.read({actor_id:s.actor.id,session_id:s.id},route.data);
 });
 app.post('/api/ui/v1/commands',{schema:{body:uiEnvelope,response:{200:z.strictObject({idempotencyKey:z.uuid(),outcome:z.enum(['APPLIED','REPLAYED','NO_CHANGE']),view:uiView}),...S.errors},security:[{sessionCookie:[]}]}},async r=>{
  const s=await auth(r,true);return ui.execute({actor_id:s.actor.id,session_id:s.id},r.body,r.id);
 });
 app.get('/api/v1/session/bootstrap',{schema:{response:{200:z.strictObject({bootstrapId:z.uuid(),csrfToken:z.string(),expiresAt:z.iso.datetime()}),...S.errors}}},async(r,reply)=>{
  readOrigin(r);const x=await sessions.bootstrap();reply.setCookie('__Host-max_bootstrap',x.binding,{...attrs,maxAge:120});return x.body;
 });
 app.post('/api/v1/session/max',{schema:{body:z.strictObject({initData:z.string().min(1).max(65536),exchangeKey:z.uuid()}),response:{200:S.sessionSchema,...S.errors}}},async(r,reply)=>{
  origin(r);json(r);const x=await sessions.exchange(r.cookies['__Host-max_bootstrap'],header(r,'x-bootstrap-csrf'),r.body.initData,r.body.exchangeKey,r.cookies['__Host-max_session']);
  reply.setCookie('__Host-max_session',x.token,{...attrs,maxAge:Math.max(0,Math.floor((Date.parse(x.body.absoluteExpiresAt)-Date.now())/1000))});return x.body;
 });
 app.get('/api/v1/session',{schema:{response:{200:S.sessionSchema,...S.errors},security:[{sessionCookie:[]}]}},async r=>{const x=await auth(r);return {actor:x.actor,csrfToken:x.csrfToken,absoluteExpiresAt:x.absoluteExpiresAt,idleTtlSeconds:x.idleTtlSeconds};});
 app.post('/api/v1/session/logout',{schema:{body:z.strictObject({}),response:{200:z.strictObject({loggedOut:z.literal(true)}),...S.errors},security:[{sessionCookie:[]}]}},async(r,reply)=>{
  const s=await auth(r,true);await sessions.logout(s.familyId);reply.clearCookie('__Host-max_session',attrs);reply.clearCookie('__Host-max_bootstrap',attrs);return {loggedOut:true as const};
 });
 const savedParams=z.strictObject({occurrenceId:z.uuid()});
 const savedResult=z.strictObject({saved:z.boolean()});
 app.get('/api/v1/me/saved',{schema:{response:{200:z.object({items:z.array(z.any())}),...S.errors},security:[{sessionCookie:[]}]}},async r=>{
  const s=await auth(r);return saved.list(s.actor.id);
 });
 app.get('/api/v1/me/saved/resolve',{schema:{querystring:z.strictObject({sourceId:z.string().min(1).max(256),externalEventId:z.string().min(1).max(256),occurrenceRef:z.string().min(1).max(256)}),response:{200:z.strictObject({occurrenceId:z.uuid().nullable(),saved:z.boolean()}),...S.errors},security:[{sessionCookie:[]}]}},async r=>{
  const s=await auth(r);return saved.resolve(s.actor.id,r.query.sourceId,r.query.externalEventId,r.query.occurrenceRef);
 });
 app.put('/api/v1/me/saved/:occurrenceId',{schema:{params:savedParams,body:z.strictObject({}),response:{200:savedResult,...S.errors},security:[{sessionCookie:[]}]}},async r=>{
  const s=await auth(r,true);return saved.put(s.actor.id,r.params.occurrenceId);
 });
 app.delete('/api/v1/me/saved/:occurrenceId',{schema:{params:savedParams,body:z.strictObject({}),response:{200:savedResult,...S.errors},security:[{sessionCookie:[]}]}},async r=>{
  const s=await auth(r,true);return saved.remove(s.actor.id,r.params.occurrenceId);
 });
 app.post('/api/v1/plans',{schema:{body:S.createSchema,headers:S.idHeaders,response:{200:S.receiptSchema,...S.errors},security:[{sessionCookie:[]}]}},async r=>{const s=await auth(r,true);return plans.create(s.actor.id,r.headers['idempotency-key'],r.body);});
 app.get('/api/v1/plans',{schema:{querystring:z.strictObject({cursor:z.uuid().optional(),limit:z.string().regex(/^[1-9][0-9]?$/).optional()}),response:{200:z.strictObject({items:z.array(z.strictObject({id:z.uuid(),title:z.string(),state_version:z.number().int()})),nextCursor:z.uuid().nullable()}),...S.errors},security:[{sessionCookie:[]}]}},async r=>{const s=await auth(r);return plans.list(s.actor.id,r.query.cursor,Math.min(50,Number(r.query.limit??20)));});
 app.get('/api/v1/plans/:planId',{schema:{params:S.planParams,response:{200:S.viewSchema,...S.errors},security:[{sessionCookie:[]}]}},async r=>{const s=await auth(r);return plans.read(s.actor.id,r.params.planId);});
 app.post('/api/v1/plans/:planId/commands',{schema:{params:S.planParams,headers:S.idHeaders,body:S.commandSchema,response:{200:S.receiptSchema,...S.errors},security:[{sessionCookie:[]}]}},async r=>{const s=await auth(r,true);return plans.command(s.actor.id,r.params.planId,r.headers['idempotency-key'],r.body,r.id);});
 app.post('/api/v1/plans/:planId/invites',{schema:{params:S.planParams,headers:S.idHeaders,body:z.strictObject({expectedStateVersion:z.number().int().positive()}),response:{200:z.strictObject({inviteRef:z.string(),expiresAt:z.string()}),...S.errors},security:[{sessionCookie:[]}]}},async r=>{const s=await auth(r,true);return plans.invite(s.actor.id,r.params.planId,r.headers['idempotency-key'],r.body.expectedStateVersion);});
 app.get('/api/v1/plans/:planId/joins',{schema:{params:S.planParams,response:{200:z.array(z.strictObject({planId:z.uuid(),actorId:z.uuid(),state:z.string()})),...S.errors},security:[{sessionCookie:[]}]}},async r=>{const s=await auth(r);return plans.pending(s.actor.id,r.params.planId);});
 const inviteParams=z.strictObject({ref:z.string().regex(/^[a-f0-9]{64}$/)});
 app.get('/api/v1/invites/:ref',{schema:{params:inviteParams,response:{200:z.strictObject({state:z.string()}),...S.errors},security:[{sessionCookie:[]}]}},async r=>{const s=await auth(r);return plans.ownJoin(s.actor.id,r.params.ref);});
 app.post('/api/v1/invites/:ref/join',{schema:{params:inviteParams,body:z.strictObject({}),response:{200:z.strictObject({state:z.string()}),...S.errors},security:[{sessionCookie:[]}]}},async r=>{const s=await auth(r,true);return plans.requestJoin(s.actor.id,r.params.ref);});
 await app.register(async sub=>{
  sub.removeContentTypeParser('application/json');sub.addContentTypeParser('application/json',{parseAs:'buffer'},(_req,body,done)=>done(null,body));
  sub.post('/api/v1/max/webhook',{bodyLimit:1048576,schema:{response:{200:z.object({accepted:z.boolean(),quarantined:z.boolean().optional(),duplicate:z.boolean().optional()}),...S.errors}}},async r=>{
   requireThat(c.ingressMode==='WEBHOOK','WEBHOOK_DISABLED',503);requireThat(equalSecret(header(r,'x-max-bot-api-secret')??'',c.webhookSecret),'WEBHOOK_FORBIDDEN',403);await ingress.assertOwner();return ingress.accept(header(r,'x-max-bot-api-secret'),r.body as Buffer);
  });
 });
 app.addHook('onClose',async()=>{await pool.end();});
 return {app,pool,plans,sessions,ui};
}
