import {initialize} from '../client.ts';
import {bridge} from '../bridge.ts';
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
import { HOME_DESIGN_DATA } from './design-data/home.ts';
import './styles.css';
/** Owner 23 must implement session/CSRF issuance after verified MAX authentication.
 * No token or actor is read from URL/localStorage/initDataUnsafe. This is not an auth implementation. */
const sessionSchema = z.object({csrfToken:z.string().min(1),externalOrigins:z.array(z.url())}).strict();
let session: z.infer<typeof sessionSchema> | null = null;
async function readSession() {
  const response = await fetch('/api/ui/v1/session',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error('Session unavailable');
  session = sessionSchema.parse(await response.json()); return session;
}
const port = new HttpVisualPort({ origin:location.origin,fetcher:fetch.bind(window),codec,
  csrfToken:async () => (await readSession()).csrfToken,
});
const controller = new ViewController(port,()=>navigator.onLine);
let initialRoute: Route = {kind:'CATALOG',scope:{kind:'PERSONAL'}};
const params = new URLSearchParams(location.search);
try { const serialized = params.get('route'); if (serialized) initialRoute = routeSchema.parse(JSON.parse(serialized)); }
catch { /* Invalid locators do not grant access; use the neutral personal entry. */ }
const invite = params.get('invite');
if (invite && invite.length <= 512) initialRoute = {kind:'INVITE',inviteRef:invite};
const element = document.getElementById('root');
if (!element) throw new Error('Missing root element');
const root = createRoot(element);
async function start() {
  root.render(<App controller={controller} origins={[]} clipboard={navigator.clipboard ?? null} />);
  try {
    await initialize();await readSession();
    // Raw data is only forwarded to server auth. start_param here is an UNTRUSTED locator,
    // not identity, membership or permission; every view route rechecks the authenticated ACL.
    const launch=params.get('launch')??new URLSearchParams(bridge()?.initData??'').get('start_param');
    if(!params.has('route')&&!params.has('invite')&&launch)initialRoute=decodeLaunch(launch);
    const clean=new URL(location.href);clean.hash='';history.replaceState(null,'',clean);
  } catch { session = null; }
  root.render(<StrictMode><App controller={controller} origins={session?.externalOrigins ?? []}
    clipboard={navigator.clipboard ?? null} renderMap={place=>place.geoView?<MapComparison options={[{uiKey:'place',view:place.geoView}]} selectedKey={'place'} onHighlight={()=>{}} onBack={()=>{}} gate="ADMISSION_HOLD" />:<p>Для этого места есть только адрес. Точка не придумана.</p>} /></StrictMode>);
  await controller.load(initialRoute);
}
if (params.get('design') === 'home') {
  root.render(<StrictMode><App controller={controller} origins={[]} clipboard={null} designPreview={HOME_DESIGN_DATA} /></StrictMode>);
} else {
  void start();
}
