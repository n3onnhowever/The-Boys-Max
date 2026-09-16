import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';
export function connect(databaseUrl:string) {
 const pool=new pg.Pool({connectionString:databaseUrl,max:10,connectionTimeoutMillis:3000,idleTimeoutMillis:30000,
  statement_timeout:10000,application_name:'max23-foundation'});
 pool.on('error',()=>{console.error(JSON.stringify({event:'PG_IDLE_CONNECTION_ERROR'}));});
 return {pool,db:drizzle(pool,{schema})};
}
export type Database=ReturnType<typeof connect>['db'];
