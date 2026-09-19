import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {Redis} from 'ioredis';
import {eq} from 'drizzle-orm';
import {buildApp} from '../../apps/api/app.ts';
import {actors} from '../../packages/persistence/schema.ts';
import {connect} from '../../packages/persistence/db.ts';
import {AppError} from '../../packages/domain/errors.ts';

test('ioredis named export is constructable in native Node ESM without opening a connection',()=>{
 const redis=new Redis({lazyConnect:true});
 assert.equal(redis.status,'wait');redis.disconnect();
});
test('Drizzle PostgreSQL query types preserve parameterized SQL after declaration correction',async()=>{
 const {pool,db}=connect('postgresql://localhost:1/synthetic_unused');
 try {
  const q=db.select({id:actors.id}).from(actors).where(eq(actors.externalId,'synthetic-id')).toSQL();
  assert.match(q.sql,/\$1/);assert.deepEqual(q.params,['synthetic-id']);
  const relational=db.query.actors.findMany({limit:1}).getSQL();
  assert.equal(typeof relational.getSQL,'function');
 }finally{await pool.end();}
});
test('Fastify unknown error boundary preserves validation/domain/status behavior without leaking messages',async()=>{
 const {app}=await buildApp({mode:'test',databaseUrl:'postgresql://localhost:1/synthetic_unused',redisUrl:'redis://localhost:1',publicOrigin:'http://localhost',sessionKey:randomBytes(32).toString('hex'),escrowKey:randomBytes(32).toString('hex'),botToken:randomBytes(32).toString('hex'),webhookSecret:randomBytes(32).toString('hex'),credentialScope:'synthetic-t102',cookieProfile:'LAX_FIRST_PARTY',ingressMode:'WEBHOOK',liveGate:''});
 const cases:[unknown,number,string][]=[
  [new AppError('SYNTHETIC_FORBIDDEN',403),403,'SYNTHETIC_FORBIDDEN'],
  [Object.assign(new Error('private detail'),{statusCode:413}),413,'BODY_TOO_LARGE'],
  [Object.assign(new Error('private detail'),{statusCode:415}),415,'JSON_REQUIRED'],
  [Object.assign(new Error('private detail'),{statusCode:'400'}),503,'SERVICE_UNAVAILABLE'],
  [new Error('private detail'),503,'SERVICE_UNAVAILABLE'],
  ['private detail',503,'SERVICE_UNAVAILABLE'],
 ];
 for(const [i,[error]] of cases.entries())app.get('/synthetic-error-'+i,async()=>{throw error;});
 try {
  for(const [i,[,status,code]] of cases.entries()){
   const response=await app.inject('/synthetic-error-'+i);
   assert.equal(response.statusCode,status);assert.equal(response.json().error.code,code);
   assert.equal(response.body.includes('private detail'),false);
  }
  const invalid=await app.inject({method:'POST',url:'/api/v1/plans',payload:{}});
  assert.equal(invalid.statusCode,400);assert.equal(invalid.json().error.code,'VALIDATION_FAILED');
 }finally{await app.close();}
});
