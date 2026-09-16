import {buildApp} from './app.ts';
import {config} from '../../packages/platform/config.ts';
const {app}=await buildApp(config());
await app.listen({host:'0.0.0.0',port:Number(process.env.PORT??3000)});
process.on('SIGTERM',()=>{void app.close();});process.on('SIGINT',()=>{void app.close();});
