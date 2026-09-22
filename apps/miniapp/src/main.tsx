import {initialize,assertSessionCsrf} from '../client.ts';
import {launchData,startParam,viewportSize} from '../bridge.ts';
import {decodeLaunch} from './core/launch.ts';
import {MapComparison} from '../../../modules/maps/component/MapComparison.tsx';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { App } from './App.tsx';
import { ViewController } from './core/controller.ts';
import { HttpVisualPort } from './port/http.ts';
import { codec, routeSchema } from './port/schema.ts';
import type { Route } from './port/contracts.ts';
import { resolveDesignPreview } from './view-model/design-preview.ts';
import './styles.css';
// Identity, CSRF and permissions come only from the authenticated server response.
const sessionSchema = z.object({csrfToken:z.string().min(1),externalOrigins:z.array(z.url())}).strict();
let session: z.infer<typeof sessionSchema> | null = null;
async function readSession() {
 const response=await fetch('/api/ui/v1/session',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('SESSION_REQUIRED');
 const next=sessionSchema.parse(await response.json());assertSessionCsrf(next.csrfToken);session=next;return session;
}
const port=new HttpVisualPort({origin:location.origin,fetcher:fetch.bind(window),codec,csrfToken:async()=>(await readSession()).csrfToken});
const controller=new ViewController(port,()=>navigator.onLine);
let initialRoute:Route={kind:'CATALOG',scope:{kind:'PERSONAL'}};
const params=new URLSearchParams(location.search);
try{const serialized=params.get('route');if(serialized&&params.getAll('route').length===1)initialRoute=routeSchema.parse(JSON.parse(serialized));}
catch{/* Malformed navigation never grants access. */}
const invite=params.get('invite');
if(invite&&params.getAll('invite').length===1&&/^[a-f0-9]{64}$/.test(invite))initialRoute={kind:'INVITE',inviteRef:invite};
let raw:string|null=null,launchError:unknown=null;
try{
 raw=launchData();
 const context=startParam(raw,location.search);
 if(!params.has('route')&&!params.has('invite')&&context)initialRoute=decodeLaunch(context);
}catch(error){launchError=error;}
finally{
 // Remove launch material before any private view or external navigation; keep it only in memory.
 if(location.hash.includes('=')){const clean=new URL(location.href);clean.hash='';history.replaceState(null,'',clean);}
}
let nativeHeight:number|null=null;
const updateViewport=()=>{
 const height=Math.min(nativeHeight??Infinity,window.visualViewport?.height??window.innerHeight);
 if(Number.isFinite(height)&&height>0)document.documentElement.style.setProperty('--max-viewport-height',height+'px');
};
updateViewport();window.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('resize',updateViewport);
void viewportSize().then(size=>{nativeHeight=size?.height??null;updateViewport();});
const element=document.getElementById('root');if(!element)throw new Error('Missing root element');
const root=createRoot(element);
function render(entry?:{message:string;retry:()=>void}){
 root.render(<StrictMode><App controller={controller} origins={session?.externalOrigins??[]} clipboard={navigator.clipboard??null}
  {...(entry?{entry}:{})}
  renderMap={place=>place.geoView?<MapComparison options={[{uiKey:'place',view:place.geoView}]} selectedKey="place" onHighlight={()=>{}} onBack={()=>{}} gate="ADMISSION_HOLD" />:<p>Для этого места есть только адрес. Точка не придумана.</p>}/></StrictMode>);
}
let starting=false;
async function start(){
 if(starting)return;starting=true;render();
 try{
  if(launchError)throw launchError;
  await initialize(raw);await readSession();render();await controller.load(initialRoute);
 }catch(error){
  session=null;
  const code=error instanceof Error?error.message:'';
  const message=code==='SESSION_STORAGE_UNSUPPORTED'
   ?'Клиент не сохраняет защищённую сессию. Откройте приложение из чата бота в MAX; если ошибка повторится, обновите клиент MAX.'
   :raw||launchError?'Не удалось подтвердить запуск. Повторите проверку или заново откройте приложение из чата бота в MAX.'
   :'Откройте приложение кнопкой в чате бота MAX. В обычном браузере доступна только уже подтверждённая сессия.';
  render({message,retry:()=>void start()});
 }finally{starting=false;}
}
const designPreview = resolveDesignPreview(params.get('design'));
if (designPreview) {
  document.title = 'Повод — дизайн-пример';
  void import('./DesignPreview.tsx').then(({ DesignPreview }) => {
    root.render(<StrictMode><DesignPreview route={designPreview} /></StrictMode>);
  });
} else {
  void start();
}
