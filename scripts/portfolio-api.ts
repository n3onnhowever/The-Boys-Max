import {config} from '../packages/platform/config.ts';
import {assertOfflinePortfolio} from '../packages/demo/portfolio.ts';
import {buildApp} from '../apps/api/app.ts';
const c=config();assertOfflinePortfolio(c);
const {app}=await buildApp(c,null,{offlinePortfolio:true});
await app.listen({host:'127.0.0.1',port:Number(process.env.PORT)});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{void app.close();});
