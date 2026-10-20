import {config} from '../packages/platform/config.ts';
import {connect} from '../packages/persistence/db.ts';
import {seedPortfolio} from '../packages/demo/portfolio.ts';
const c=config(),{pool}=connect(c.databaseUrl);
try{console.log(JSON.stringify(await seedPortfolio(pool,c)));}finally{await pool.end();}
