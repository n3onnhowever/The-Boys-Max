import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {BOT_COMMANDS,BOT_UPDATE_TYPES,botPurpose,botMessage,configuredBotUrl,parseBotUpdate} from '../../packages/platform/bot.ts';
import {obj,strictJson} from '../../packages/platform/wire.ts';
import {config} from '../../packages/platform/config.ts';
import {buildApp} from '../../apps/api/app.ts';
const settings={miniappUrl:'https://povod.example/app',botUsername:'synthetic_bot',privacyUrl:'https://povod.example/privacy',aboutUrl:'https://povod.example/about'};
const decode=(value:unknown)=>parseBotUpdate(obj(strictJson(JSON.stringify(value),true)));
const started={update_type:'bot_started',timestamp:1800000000000,chat_id:123,user:{user_id:456,first_name:'SYNTHETIC',is_bot:false}};
const created={update_type:'message_created',timestamp:1800000000000,message:{timestamp:1800000000000,sender:started.user,recipient:{chat_id:123,chat_type:'dialog'},body:{mid:'synthetic-mid',text:'/start'}}};
function env():NodeJS.ProcessEnv{return {APP_MODE:'test',PUBLIC_ORIGIN:'http://localhost',COOKIE_PROFILE:'LAX_FIRST_PARTY',DATABASE_URL:'postgresql://localhost:1/synthetic_unused',REDIS_URL:'redis://localhost:1',SESSION_KEY:randomBytes(32).toString('hex'),ESCROW_KEY:randomBytes(32).toString('hex'),BOT_TOKEN:randomBytes(32).toString('hex'),MAX_WEBHOOK_SECRET:randomBytes(32).toString('hex'),CREDENTIAL_SCOPE:'synthetic-max-bot'};}

test('desired commands and subscription have only the entry flow',()=>{
 assert.deepEqual(BOT_COMMANDS.commands.map(c=>c.name),['start','app','help']);
 assert.deepEqual(BOT_UPDATE_TYPES,['bot_started','message_created']);
});
for(const [text,purpose] of [['/start','WELCOME'],[' /HELP ','HELP'],['/app','APP'],['/start locator','WELCOME'],['/startle','FALLBACK'],['Привет','FALLBACK'],['','FALLBACK']] as const)
 test('command '+JSON.stringify(text),()=>assert.equal(botPurpose(text),purpose));
test('welcome uses native open_app with bot identity and safe catalog payload',()=>{
 const message=botMessage('WELCOME',settings);
 assert.match(message.text,/Повод.*Москве/);
 assert.deepEqual(message.attachments[0]!.payload.buttons,[
  [{type:'open_app',text:'Открыть Повод',web_app:'synthetic_bot',payload:'catalog'}],
  [{type:'message',text:'/help'}],
 ]);
 assert.equal(JSON.stringify(message).includes('callback'),false);
});
test('help has recovery, configured URL, published policy/about links',()=>{
 const message=botMessage('HELP',settings);
 assert.match(message.text,/MAX Web/);assert.match(message.text,/Для входа в Повод вернитесь в MAX/);
 const links=message.attachments[0]!.payload.buttons.flat().filter(b=>b.type==='link');
 assert.deepEqual(links.map(b=>b.url),[settings.miniappUrl,settings.privacyUrl,settings.aboutUrl]);
});
test('missing Mini App URL suppresses launch and never invents an address',()=>{
 for(const purpose of ['WELCOME','APP','HELP','FALLBACK']){
  const message=botMessage(purpose,{botUsername:settings.botUsername});
  assert.match(message.text,/недоступен/);
  assert.equal(JSON.stringify(message).includes('open_app'),false);
  assert.equal(JSON.stringify(message).includes('http'),false);
 }
 assert.equal(JSON.stringify(botMessage('WELCOME',{miniappUrl:settings.miniappUrl})).includes('open_app'),false);
});
test('optional policy links are absent until published',()=>assert.equal(botMessage('HELP',{}).attachments.length,0));
test('URLs are optional but production HTTPS is mandatory',()=>{
 assert.equal(configuredBotUrl('','live','POVOD_MINIAPP_URL'),undefined);
 assert.equal(configuredBotUrl(settings.miniappUrl,'live','POVOD_MINIAPP_URL'),settings.miniappUrl);
 assert.equal(configuredBotUrl('http://localhost:3000','test','POVOD_MINIAPP_URL'),'http://localhost:3000/');
 for(const value of ['invalid','javascript:alert(1)','http://povod.example','https://user:password@povod.example','https://localhost','https://127.0.0.1','https://povod.example/#fragment',' https://povod.example'])
  assert.throws(()=>configuredBotUrl(value,'live','POVOD_MINIAPP_URL'),/POVOD_MINIAPP_URL_/);
 assert.throws(()=>configuredBotUrl('http://povod.example','test','POVOD_MINIAPP_URL'),/HTTPS_REQUIRED/);
});
test('canonical secret config is separate; legacy test config remains compatible',()=>{
 const e=env();assert.equal(config(e).webhookSecret,e.MAX_WEBHOOK_SECRET);
 const legacy:NodeJS.ProcessEnv={...e,WEBHOOK_SECRET:e.MAX_WEBHOOK_SECRET};delete legacy.MAX_WEBHOOK_SECRET;
 assert.equal(config(legacy).webhookSecret,e.MAX_WEBHOOK_SECRET);
 assert.throws(()=>config({...e,WEBHOOK_SECRET:randomBytes(32).toString('hex')}),/WEBHOOK_SECRET_CONFLICT/);
 assert.throws(()=>config({...e,MAX_WEBHOOK_SECRET:e.BOT_TOKEN}),/WEBHOOK_SECRET_MUST_BE_SEPARATE/);
 assert.throws(()=>config({...e,MAX_WEBHOOK_SECRET:''}),/MISSING_MAX_WEBHOOK_SECRET/);
 assert.throws(()=>config({...e,MAX_WEBHOOK_SECRET:'bad secret'}),/KEY_STRENGTH|WEBHOOK_SECRET_FORMAT/);
});
test('runtime config validates every configured product URL',()=>{
 const e=env();assert.equal(config({...e,POVOD_MINIAPP_URL:settings.miniappUrl}).miniappUrl,settings.miniappUrl);
 for(const key of ['POVOD_MINIAPP_URL','POVOD_PRIVACY_URL','POVOD_ABOUT_URL'])
  assert.throws(()=>config({...e,[key]:'javascript:alert(1)'}),/HTTPS_REQUIRED/);
 const live={...e,APP_MODE:'live',PUBLIC_ORIGIN:'https://povod.example',MAX_BOT_USERNAME:'synthetic_bot',LIVE_GATE:'REVIEWED_MAX26_LIVE'};
 assert.throws(()=>config({...live,POVOD_MINIAPP_URL:'http://localhost:3000'}),/HTTPS_REQUIRED/);
 assert.equal(config(live).miniappUrl,undefined);
});
test('bot_started accepts current first_name and legacy name without inferring app rights',()=>{
 assert.deepEqual(decode(started)?.reply,{actorId:'456',chatId:'123',name:'SYNTHETIC',purpose:'WELCOME'});
 assert.equal(decode({...started,user:{user_id:456,name:'LEGACY'}})?.reply?.name,'LEGACY');
 assert.equal(decode({...started,payload:'https://untrusted.invalid'} )?.reply?.purpose,'WELCOME');
});
test('lossless bot_started IDs and message_created commands retain exact recipient',()=>{
 const raw='{"update_type":"bot_started","timestamp":1800000000000,"chat_id":9223372036854775701,"user":{"user_id":9223372036854775702,"first_name":"SYNTHETIC"}}';
 assert.equal(parseBotUpdate(obj(strictJson(raw,true)))?.reply?.chatId,'9223372036854775701');
 for(const [text,purpose] of [['/start','WELCOME'],['/app','APP'],['/help','HELP']] as const)
  assert.equal(decode({...created,message:{...created.message,body:{...created.message.body,text}}})?.reply?.purpose,purpose);
});
test('event identity deduplicates message_created across webhook timestamps',()=>{
 assert.equal(decode(created)?.key,decode({...created,timestamp:1800000000999})?.key);
 assert.notEqual(decode(created)?.key,decode({...created,message:{...created.message,body:{mid:'next-mid',text:'/start'}}})?.key);
});
test('groups, channels and bot echoes do not become personal destinations',()=>{
 for(const chat_type of ['chat','channel'])
  assert.equal(decode({...created,message:{...created.message,sender:undefined,recipient:{chat_id:123,chat_type}}})?.reply,null);
 assert.equal(decode({...created,message:{...created.message,sender:{...started.user,is_bot:true}}})?.reply,null);
});
test('malformed supported payloads fail closed; callbacks are unsupported',()=>{
 assert.throws(()=>decode({...started,chat_id:'123'}),/INT64/);
 assert.throws(()=>decode({...created,message:{...created.message,sender:{user_id:456,first_name:'SYNTHETIC'}}}),/BOT_FLAG_INVALID/);
 assert.throws(()=>decode({...created,message:{...created.message,body:{text:'/app'}}}),/STRING_REQUIRED/);
 assert.equal(decode({update_type:'message_callback',timestamp:1800000000000}),undefined);
});
test('invalid or missing webhook secret returns 403 without a database connection',async()=>{
 const c=config(env()),{app}=await buildApp(c);
 try{for(const secret of [undefined,'invalid']){
  const response=await app.inject({method:'POST',url:'/api/v1/max/webhook',headers:{'content-type':'application/json',...(secret?{'x-max-bot-api-secret':secret}:{})},payload:started});
  assert.equal(response.statusCode,403);assert.equal(response.json().error.code,'WEBHOOK_FORBIDDEN');
 }}finally{await app.close();}
});

test('Mini App URL permits 1024 and rejects 1025 without narrowing unrelated URLs',()=>{
 const url=(n:number)=>'https://povod.example/'+ 'a'.repeat(n-'https://povod.example/'.length);
 assert.equal(configuredBotUrl(url(1024),'live','POVOD_MINIAPP_URL'),url(1024));
 assert.throws(()=>configuredBotUrl(url(1025),'live','POVOD_MINIAPP_URL'),/POVOD_MINIAPP_URL_INVALID/);
 assert.equal(config({...env(),POVOD_MINIAPP_URL:url(1024)}).miniappUrl,url(1024));
 assert.throws(()=>config({...env(),POVOD_MINIAPP_URL:url(1025)}),/POVOD_MINIAPP_URL_INVALID/);
 for(const field of ['POVOD_PRIVACY_URL','POVOD_ABOUT_URL'])assert.equal(configuredBotUrl(url(1025),'live',field),url(1025));
 assert.throws(()=>configuredBotUrl('https://povod.example/'+ 'я'.repeat(180),'live','POVOD_MINIAPP_URL'),/POVOD_MINIAPP_URL_INVALID/);
});
