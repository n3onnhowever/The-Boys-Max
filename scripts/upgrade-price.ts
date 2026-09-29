import {randomUUID} from 'node:crypto';
import {connect} from '../packages/persistence/db.ts';import {config} from '../packages/platform/config.ts';
import {transaction} from '../packages/persistence/sessions.ts';import {upgradePricePlan} from '../packages/domain/price-upgrade.ts';
const {pool}=connect(config().databaseUrl);
try{await transaction(pool,async c=>{
 await c.query("SELECT pg_advisory_xact_lock(hashtextextended('price-upgrade-26',0))");
 const rows=await c.query<{state:unknown}>("SELECT state FROM plans WHERE state->>'version'='max.backend.23.v1-candidate' FOR UPDATE");
 for(const row of rows.rows){const result=upgradePricePlan(row.state);if(!result)continue;const p=result.plan;
  await c.query('UPDATE plans SET state=$2,state_version=$3 WHERE id=$1',[p.planId,p,p.stateVersion]);
  for(const s of result.newSnapshots){const option=p.options.find(o=>o.snapshots.some(x=>x.snapshotId===s.snapshotId))!;
   await c.query('INSERT INTO snapshots(id,plan_id,option_id,body) VALUES($1,$2,$3,$4)',[s.snapshotId,p.planId,option.optionId,s]);}
  await c.query("INSERT INTO command_audit(id,plan_id,actor_id,kind,state_version,request_id,accepted_at) VALUES($1,$2,$3,'MIGRATE_PRICE26',$4,'price-upgrade-26',clock_timestamp())",[randomUUID(),p.planId,p.organizerId,p.stateVersion]);
  console.log(JSON.stringify({event:'price_upgrade',planId:p.planId,newVersion:p.stateVersion}));
 }
});}finally{await pool.end();}
