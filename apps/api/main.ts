import {buildApp} from './app.ts';
import {config} from '../../packages/platform/config.ts';
import {createGigaChatSmartProvider} from '../../modules/ai/gigachat-smart.ts';
const settings=config();
const provider=settings.aiExternalEnabled?createGigaChatSmartProvider({authorizationKey:settings.gigaChatAuthKey!}):null;
console.info(JSON.stringify({event:'AI_PROVIDER_STATE',enabled:Boolean(provider),provider:provider?'gigachat':null}));
const {app}=await buildApp(settings,provider);
await app.listen({host:'0.0.0.0',port:Number(process.env.PORT??3000)});
process.on('SIGTERM',()=>{void app.close();});process.on('SIGINT',()=>{void app.close();});
