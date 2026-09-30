import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createGigaChatSmartProvider,type GigaChatRequest} from '../../modules/ai/gigachat-smart.ts';
import {config} from '../../packages/platform/config.ts';

const draft={
 query_text:'',date_from:null,date_to:null,daypart:null,categories:[],interests:[],
 budget_max:null,free_only:false,city:null,radius_preference:null,social_context:null,
 party_size:null,mood_tags:[],hard_constraints:[],soft_preferences:[],
 clarification_required:false,clarification_question:null
};

test('GigaChat exchanges authorization key, reuses short-lived access token and returns a bounded JSON proposal',async()=>{
 let now=1_800_000_000_000;
 const calls:GigaChatRequest[]=[];
 const request=async(input:GigaChatRequest)=>{
  calls.push(input);
  if(input.url.endsWith('/api/v2/oauth'))return {status:200,body:{access_token:'access-1',expires_at:Math.floor(now/1000)+1800}};
  return {status:200,body:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(draft)}}]}};
 };
 const provider=createGigaChatSmartProvider({authorizationKey:'cHJpdmF0ZS1rZXktZm9yLXRlc3Q=',request,now:()=>now});
 const signal=new AbortController().signal;
 assert.deepEqual(await provider.interpretSmartOccasion('Куда сходить?',signal,{maxOutputTokens:500}),draft);
 assert.deepEqual(await provider.interpretSmartOccasion('Ещё вариант',signal,{maxOutputTokens:500}),draft);
 assert.equal(calls.length,3);
 assert.equal(calls[0]?.headers.Authorization,'Basic cHJpdmF0ZS1rZXktZm9yLXRlc3Q=');
 assert.equal(calls[1]?.headers.Authorization,'Bearer access-1');
 assert.equal(calls[2]?.headers.Authorization,'Bearer access-1');
 assert.equal(calls[0]?.url,'https://ngw.devices.sberbank.ru:9443/api/v2/oauth');
 assert.equal(calls[1]?.url,'https://api.giga.chat/v1/chat/completions');
 assert.equal(calls[1]?.body?.includes('cHJpdmF0ZS1rZXktZm9yLXRlc3Q='),false);
 assert.equal(JSON.parse(calls[1]!.body!).model,'GigaChat-3-Ultra');
 now+=1_800_000;
 await provider.interpretSmartOccasion('Снова',signal,{maxOutputTokens:500});
 assert.equal(calls.length,5);
});

test('GigaChat rejects malformed or failed responses without returning provider text',async()=>{
 const signal=new AbortController().signal;
 const provider=createGigaChatSmartProvider({authorizationKey:'cHJpdmF0ZS1rZXktZm9yLXRlc3Q=',request:async(input)=>
  input.url.endsWith('/api/v2/oauth')?{status:200,body:{access_token:'access-1',expires_at:1_999_999_999}}:
   {status:200,body:{choices:[{finish_reason:'stop',message:{content:'not json'}}]}}});
 await assert.rejects(provider.interpretSmartOccasion('Текст',signal,{maxOutputTokens:500}),/AI_PROVIDER_RESPONSE/);
});

test('GigaChat reports an OAuth HTTP code without exposing the authorization key',async()=>{
 const key='cHJpdmF0ZS1rZXktZm9yLXRlc3Q=';
 const provider=createGigaChatSmartProvider({authorizationKey:key,request:async()=>({status:401,body:{message:'invalid'}})});
 await assert.rejects(provider.interpretSmartOccasion('Текст',new AbortController().signal,{maxOutputTokens:500}),error=>
  error instanceof Error&&error.message==='AI_OAUTH_HTTP_401'&&!error.message.includes(key));
});

test('external AI requires an explicit authorization key and remains off by default',()=>{
 const env={APP_MODE:'hybrid',DEMO_CATALOG_VERSION:'v3',COOKIE_PROFILE:'LAX_FIRST_PARTY',PUBLIC_ORIGIN:'https://example.test',
  SESSION_KEY:'a'.repeat(64),ESCROW_KEY:'b'.repeat(64),BOT_TOKEN:'TEST_BOT',MAX_WEBHOOK_SECRET:'c'.repeat(64),
  CREDENTIAL_SCOPE:'TEST',DATABASE_URL:'postgres://test@localhost/test',REDIS_URL:'redis://localhost:6379',
  MAX_BOT_USERNAME:'test_bot',LIVE_GATE:'REVIEWED_MAX26_LIVE'} as NodeJS.ProcessEnv;
 assert.equal(config(env).aiExternalEnabled,false);
 assert.throws(()=>config({...env,AI_EXTERNAL_ENABLED:'true'}),/GIGACHAT_AUTH_KEY_REQUIRED/);
 const enabled=config({...env,AI_EXTERNAL_ENABLED:'true',GIGACHAT_AUTH_KEY:'cHJpdmF0ZS1rZXktZm9yLXRlc3Q='});
 assert.equal(enabled.aiExternalEnabled,true);
 assert.equal(enabled.gigaChatAuthKey,'cHJpdmF0ZS1rZXktZm9yLXRlc3Q=');
});
