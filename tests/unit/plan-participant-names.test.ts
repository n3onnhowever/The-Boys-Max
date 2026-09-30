import test from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {socialService} from '../../packages/persistence/social.ts';

test('authorized plan presentation includes names of participants who are not friends',async()=>{
 const db={query:async(sql:string)=>{
  if(sql.includes('SELECT 1 FROM plans p'))return {rowCount:1,rows:[{}]};
  if(sql.includes("SELECT p.state->>'title'"))return {rowCount:1,rows:[{title:'В музей',slots:[{},{}],phase:'ACTIVE',organizer_id:'owner',organizer_name:'Организатор'}]};
  if(sql.includes('FROM plan_presentation p'))return {rowCount:0,rows:[]};
  if(sql.includes('FROM plan_slots s JOIN actors a'))return {rowCount:1,rows:[{actor_id:'member',display_name:'Анна'}]};
  throw new Error(`Unexpected SQL: ${sql}`);
 }} as unknown as Pool;
 const result=await socialService(db).planPresentation('owner','plan');
 assert.equal(result.participantNames.member,'Анна');
});
