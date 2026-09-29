// Dependency probe for the worker container. This does not claim external delivery readiness.
const {readFileSync}=require('node:fs');
const {Client}=require('pg');
const Redis=require('ioredis');

async function main(){
 const runtime=JSON.parse(readFileSync(process.env.RUNTIME_FILE,'utf8'));
 const pg=new Client({connectionString:runtime.DATABASE_URL,connectionTimeoutMillis:2000});
 const redis=new Redis(runtime.REDIS_URL,{lazyConnect:true,connectTimeout:2000,maxRetriesPerRequest:0});
 try{
  await Promise.all([pg.connect(),redis.connect()]);
  await Promise.all([pg.query('SELECT 1'),redis.ping()]);
 }finally{
  redis.disconnect();
  await pg.end().catch(()=>{});
 }
}
main().catch(()=>{process.exitCode=1;});
