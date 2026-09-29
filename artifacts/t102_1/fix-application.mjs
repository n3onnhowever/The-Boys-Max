import fs from 'node:fs';
const edit=(p,from,to)=>{let s=fs.readFileSync(p,'utf8');if(!s.includes(from))throw Error(p+': expected text missing');fs.writeFileSync(p,s.replace(from,to));};
for(const p of ['apps/worker/main.ts','scripts/arm-test-outbound.ts','tests/helpers/kill-worker.ts','tests/integration/foundation.test.ts'])edit(p,"import Redis from 'ioredis'","import {Redis} from 'ioredis'");
edit('packages/platform/governor.ts',"import type Redis from 'ioredis'","import type {Redis} from 'ioredis'");
edit('packages/contracts/http.ts',"export const amountSchema=z.strictObject({kind:z.enum(['FREE','EXACT','RANGE']),exact_minor:minor,min_minor:minor,max_minor:minor});",`export const amountSchema=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('FREE'),exact_minor:z.null(),min_minor:z.null(),max_minor:z.null()}),
 z.strictObject({kind:z.literal('EXACT'),exact_minor:minor.unwrap(),min_minor:z.null(),max_minor:z.null()}),
 z.strictObject({kind:z.literal('RANGE'),exact_minor:z.null(),min_minor:minor.unwrap(),max_minor:minor.unwrap()})]);`);
edit('modules/maps/component/leaflet-renderer.ts','if(coords.length===1)map.setView(coords[0],15,{animate:false});','const first=coords[0];\n  if(coords.length===1&&first!==undefined)map.setView(first,15,{animate:false});');
edit('apps/api/app.ts',"  const status=err instanceof CoreError?422:err instanceof AppError?err.status:err.validation?400:err.statusCode&&err.statusCode>=400&&err.statusCode<500?err.statusCode:503;",`  // Fastify 5 passes unknown: thrown values need not be Error instances.
  const validation=typeof err==='object'&&err!==null&&'validation' in err&&Array.isArray(err.validation);
  const statusCode=typeof err==='object'&&err!==null&&'statusCode' in err?err.statusCode:undefined;
  const status=err instanceof CoreError?422:err instanceof AppError?err.status:validation?400:typeof statusCode==='number'&&Number.isInteger(statusCode)&&statusCode>=400&&statusCode<500?statusCode:503;`);
edit('apps/api/app.ts',":err.validation?'VALIDATION_FAILED'",":validation?'VALIDATION_FAILED'");
