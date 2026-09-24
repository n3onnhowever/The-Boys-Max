import {connect} from '../packages/persistence/db.ts';
import {config} from '../packages/platform/config.ts';
import {seedDemoCatalog} from '../packages/demo/seed.ts';

const cfg=config();
if(cfg.mode!=='demo'||cfg.demoCatalogVersion!=='v1')throw Error('EXPLICIT_DEMO_MODE_REQUIRED');
const {pool}=connect(cfg.databaseUrl);
try{
 console.log(JSON.stringify({...await seedDemoCatalog(pool,cfg.publicOrigin),mode:cfg.mode}));
}finally{await pool.end();}
