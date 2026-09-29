import {connect} from '../packages/persistence/db.ts';import {config} from '../packages/platform/config.ts';
const {pool}=connect(config().databaseUrl);
try{await pool.query("UPDATE outbound_control SET hold=true,reason='RESTORE_RECONCILIATION_REQUIRED',epoch='RESTORE-HOLD' WHERE id=1");console.log('Outbound held. UNKNOWN and restored pending interval must be reviewed; this command does not retry anything.');}finally{await pool.end();}
