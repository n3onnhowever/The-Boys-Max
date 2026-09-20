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
import { SEARCH_DESIGN_DATA } from './design-data/search.ts';
import { DETAIL_DESIGN_DATA, type DetailDesignVariant } from './design-data/detail.ts';
import { SAVED_DESIGN_DATA } from './design-data/saved.ts';
import { SavedScreen } from './components/SavedScreen.tsx';
import { PROFILE_DESIGN_DATA } from './design-data/profile.ts';
import { HomeScreen } from './components/HomeScreen.tsx';
import { ProfileScreen } from './components/ProfileScreen.tsx';
import { MY_PLANS_DESIGN_DATA, PLAN_DETAIL_DESIGN_DATA } from './design-data/plans.ts';
import { MyPlansScreen } from './components/MyPlansScreen.tsx';
import { PlanDetailScreen } from './components/PlanDetailScreen.tsx';
import { SearchScreen } from './components/SearchScreen.tsx';
import { DetailScreen } from './components/DetailScreen.tsx';
import { SYSTEM_STATE_DESIGN_DATA } from './design-data/states.ts';
import { HomeSystemScreen } from './components/HomeSystemScreen.tsx';
import { HOME_SYSTEM_CHROME, previewDestination, type HomeSystemStateKind } from './view-model/system-state.ts';
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
const designPreview = params.get('design');
const statePreviewKinds: readonly HomeSystemStateKind[] = ['loading', 'empty', 'error', 'offline'];
const statePreview = statePreviewKinds.find(kind => kind === designPreview);
const detailDesignPreview = designPreview && Object.hasOwn(DETAIL_DESIGN_DATA, designPreview)
  ? DETAIL_DESIGN_DATA[designPreview as DetailDesignVariant]
  : null;
const navigateDesign = (target: string) => {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('design', target);
  location.assign(url);
};
if (statePreview) {
  root.render(<StrictMode><HomeSystemScreen state={SYSTEM_STATE_DESIGN_DATA[statePreview]} chrome={HOME_SYSTEM_CHROME} onAction={action => navigateDesign(previewDestination(action))} /></StrictMode>);
} else if (detailDesignPreview) {
  root.render(<StrictMode><DetailScreen
    model={detailDesignPreview}
    onBack={() => navigateDesign('home')}
    onNavigate={target => { if (target === 'home' || target === 'search') navigateDesign(target); }}
  /></StrictMode>);
} else if (designPreview === 'home') {
  root.render(<StrictMode><HomeScreen model={HOME_DESIGN_DATA} onNavigate={target => { if (target === 'home' || target === 'search' || target === 'profile') navigateDesign(target); }} /></StrictMode>);
} else if (designPreview === 'search' || designPreview === 'filters') {
  root.render(<StrictMode><SearchScreen
    model={SEARCH_DESIGN_DATA}
    initialFilterSheetOpen={designPreview === 'filters'}
    onBack={() => navigateDesign('home')}
    onNavigate={target => { if (target === 'home' || target === 'search') navigateDesign(target); }}
  /></StrictMode>);
} else if (designPreview === 'saved') {
  root.render(<StrictMode><SavedScreen
    model={SAVED_DESIGN_DATA}
    onEventOpen={eventId => {
      const url = new URL(location.href);
      url.hash = `event=${encodeURIComponent(eventId)}`;
      history.pushState({ designEventId: eventId }, '', url);
    }}
    onNavigate={target => {
      if (target === 'home' || target === 'search') navigateDesign(target);
    }}
  /></StrictMode>);
} else if (designPreview === 'profile') {
  root.render(<StrictMode><ProfileScreen model={PROFILE_DESIGN_DATA} onNavigate={target => { if (target === 'home' || target === 'search' || target === 'profile') navigateDesign(target); }} /></StrictMode>);
} else if (designPreview === 'my-plans') {
  root.render(<StrictMode><MyPlansScreen
    model={MY_PLANS_DESIGN_DATA}
    onAddPlan={() => navigateDesign('search')}
    onPlanOpen={() => navigateDesign('plan-detail')}
    onNavigate={target => {
      if (target === 'home' || target === 'search') navigateDesign(target);
      if (target === 'plan') navigateDesign('my-plans');
    }}
  /></StrictMode>);
} else if (designPreview === 'plan-detail') {
  root.render(<StrictMode><PlanDetailScreen
    model={PLAN_DETAIL_DESIGN_DATA}
    onBack={() => navigateDesign('my-plans')}
    onEventOpen={() => navigateDesign('home')}
    onInvite={() => undefined}
    onNavigate={target => {
      if (target === 'home' || target === 'search') navigateDesign(target);
      if (target === 'plan') navigateDesign('my-plans');
    }}
  /></StrictMode>);
} else {
  void start();
}
