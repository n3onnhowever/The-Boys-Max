import {requireThat} from '../domain/errors.ts';
import {digest} from './auth.ts';
import {obj,int64,boundedText} from './wire.ts';

export const BOT_COMMANDS={commands:[
 {name:'start',description:'Знакомство с Поводом'},
 {name:'app',description:'Открыть Повод'},
 {name:'help',description:'Помощь и ссылки'},
]};
export const BOT_UPDATE_TYPES=['bot_started','message_created'] as const;
export type BotPurpose='WELCOME'|'APP'|'HELP'|'FALLBACK';
export interface BotConfig {miniappUrl?:string;botUsername?:string;privacyUrl?:string;aboutUrl?:string;}
export type BotButton={type:'open_app';text:string;web_app:string;payload:string}|{type:'message';text:string}|{type:'link';text:string;url:string};
export interface BotAttachment {type:'inline_keyboard';payload:{buttons:BotButton[][]};}
export interface BotMessage {text:string;attachments:BotAttachment[];}

export function configuredBotUrl(value:string,mode:'test'|'demo'|'live'|'hybrid',field:string):string|undefined {
 if(!value)return undefined;
 let url:URL;try{url=new URL(value);}catch{requireThat(false,field+'_INVALID');}
 const maxLength=field==='POVOD_MINIAPP_URL'?1024:2048;
 const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.hostname.endsWith('.localhost');
 requireThat(value===value.trim()&&!/\s/.test(value)&&value.length<=maxLength&&!url.username&&!url.password&&!url.hash,field+'_INVALID');
 requireThat(url.protocol==='https:'||!['live','hybrid'].includes(mode)&&loopback&&url.protocol==='http:',field+'_HTTPS_REQUIRED');
 requireThat(!['live','hybrid'].includes(mode)||!loopback,field+'_PUBLIC_REQUIRED');
 const normalized=url.toString();
 requireThat(field!=='POVOD_MINIAPP_URL'||normalized.length<=maxLength,field+'_INVALID');
 return normalized;
}
export function botPurpose(text:string|null|undefined):BotPurpose {
 const command=text?.trim().split(/\s+/,1)[0]?.toLowerCase();
 return command==='/start'?'WELCOME':command==='/app'?'APP':command==='/help'?'HELP':'FALLBACK';
}
const copy:Record<BotPurpose,string>={
 WELCOME:'Повод помогает быстро найти, куда сходить сегодня в Москве.\nВыбирайте события и сохраняйте понравившееся в «Мой Повод».',
 APP:'Ваш следующий Повод — в мини-приложении.',
 HELP:'Повод — события в Москве под ваши планы. Выбор и сохранённое — в мини-приложении.\n\n/start — знакомство\n/app — открыть Повод\n/help — помощь\n\nНе открывается? Закройте окно и попробуйте /app ещё раз. Если не помогло, обновите MAX или откройте бота в MAX Web.',
 FALLBACK:'Я помогу открыть Повод. События и сохранённое — в мини-приложении.\nЕсли нужна помощь, отправьте /help.',
};
export function botMessage(purpose:string,config:BotConfig):BotMessage {
 requireThat(purpose in copy&&Object.hasOwn(copy,purpose),'BOT_PURPOSE_INVALID');
 const ready=Boolean(config.miniappUrl&&config.botUsername);
 const buttons:BotButton[][]=[];
 if(ready)buttons.push([{type:'open_app',text:'Открыть Повод',web_app:config.botUsername!,payload:'catalog'}]);
 if(purpose!=='HELP')buttons.push([{type:'message',text:'/help'}]);
 if(purpose==='HELP'){
  if(ready)buttons.push([{type:'link',text:'Открыть ссылку',url:config.miniappUrl!}]);
  if(config.privacyUrl)buttons.push([{type:'link',text:'Конфиденциальность',url:config.privacyUrl}]);
  if(config.aboutUrl)buttons.push([{type:'link',text:'О Поводе и условиях',url:config.aboutUrl}]);
 }
 const text=copy[purpose as BotPurpose]+(!ready?'\n\nСейчас Повод недоступен. Попробуйте /app чуть позже.':purpose==='HELP'?'\nПо кнопке «Открыть ссылку» можно проверить загрузку. Для входа в Повод вернитесь в MAX.':'');
 return {text,attachments:buttons.length?[{type:'inline_keyboard',payload:{buttons}}]:[]};
}

export interface BotReply {actorId:string;name:string;chatId:string;purpose:BotPurpose;}
export interface BotUpdate {kind:string;key:string;sourceTimestampMs:string;reply:BotReply|null;}
function userName(user:Record<string,unknown>):string {
 // Current schema uses first_name; older official start examples still contain deprecated name.
 return boundedText(user.first_name??user.name);
}
export function parseBotUpdate(wire:Record<string,unknown>):BotUpdate|undefined {
 const kind=boundedText(wire.update_type,80);
 if(kind!=='bot_started'&&kind!=='message_created')return undefined;
 const timestamp=int64(wire.timestamp,true);
 if(kind==='bot_started'){
  const user=obj(wire.user),actorId=int64(user.user_id,true),chatId=int64(wire.chat_id);
  requireThat(user.is_bot===undefined||typeof user.is_bot==='boolean','BOT_FLAG_INVALID');
  if(wire.payload!==undefined&&wire.payload!==null)requireThat(typeof wire.payload==='string'&&wire.payload.length<=512,'START_PAYLOAD_INVALID');
  return {kind,key:digest(`${kind}:${actorId}:${chatId}:${timestamp}`),sourceTimestampMs:timestamp,reply:user.is_bot===true?null:{actorId,name:userName(user),chatId,purpose:'WELCOME'}};
 }
 const message=obj(wire.message),recipient=obj(message.recipient),body=obj(message.body);
 const chatId=int64(recipient.chat_id),mid=boundedText(body.mid,256);
 int64(message.timestamp,true);
 requireThat(['dialog','chat','channel'].includes(String(recipient.chat_type)),'CHAT_TYPE_INVALID');
 const key=digest(`${kind}:${chatId}:${mid}`);
 // A group/channel is never a verified personal destination. Bot echoes never trigger another reply.
 if(recipient.chat_type!=='dialog')return {kind,key,sourceTimestampMs:timestamp,reply:null};
 const sender=obj(message.sender),actorId=int64(sender.user_id,true);
 requireThat(typeof sender.is_bot==='boolean','BOT_FLAG_INVALID');
 if(sender.is_bot)return {kind,key,sourceTimestampMs:timestamp,reply:null};
 requireThat(body.text===null||body.text===undefined||typeof body.text==='string'&&body.text.length<=4000,'MESSAGE_TEXT_INVALID');
 return {kind,key,sourceTimestampMs:timestamp,reply:{actorId,name:userName(sender),chatId,purpose:botPurpose(body.text as string|null|undefined)}};
}
