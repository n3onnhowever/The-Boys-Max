import { useState, type ReactNode } from 'react';
import { HomeScreen } from './components/HomeScreen.tsx';
import { SearchScreen } from './components/SearchScreen.tsx';
import { DetailScreen } from './components/DetailScreen.tsx';
import { SavedScreen } from './components/SavedScreen.tsx';
import { ProfileScreen } from './components/ProfileScreen.tsx';
import { MyPlansScreen } from './components/MyPlansScreen.tsx';
import { PlanDetailScreen } from './components/PlanDetailScreen.tsx';
import { HomeSystemScreen } from './components/HomeSystemScreen.tsx';
import { NavigationProvider } from './components/BottomNav.tsx';
import { HOME_DESIGN_DATA } from './design-data/home.ts';
import { SEARCH_DESIGN_DATA } from './design-data/search.ts';
import { DETAIL_DESIGN_DATA } from './design-data/detail.ts';
import { SAVED_DESIGN_DATA } from './design-data/saved.ts';
import { PROFILE_DESIGN_DATA } from './design-data/profile.ts';
import { MY_PLANS_DESIGN_DATA, SOLO_PLAN_DETAIL_DESIGN_DATA, EMPTY_DISCUSSION_PLAN_DETAIL_DESIGN_DATA } from './design-data/plans.ts';
import { SYSTEM_STATE_DESIGN_DATA } from './design-data/states.ts';
import { previewEventDetail, previewPlanDetail } from './design-data/navigation.ts';
import { HOME_SYSTEM_CHROME, previewDestination } from './view-model/system-state.ts';
import { DESIGN_NAVIGATION_IDS, designNavigationRoute, detailNavigationSection, resolveDesignPreview, type DesignPreviewRoute } from './view-model/design-preview.ts';

function navigateDesign(route: DesignPreviewRoute, parameters: Record<string, string> = {}) {
  const url = new URL(location.href);
  url.search = ''; url.hash = '';
  url.searchParams.set('design', route);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  location.assign(url);
}
const navigateFromNav = (id: string) => {
  const route = designNavigationRoute(id);
  if (route) navigateDesign(route);
};

/** Loaded only after the explicit route allowlist succeeds. No session, provider or persistence call. */
export function DesignPreview({ route }: { route: DesignPreviewRoute }) {
  const params = new URLSearchParams(location.search);
  const [home, setHome] = useState(HOME_DESIGN_DATA);
  const openEvent = (from: string) => (id: string) => navigateDesign('detail', { event: id, from });
  let screen: ReactNode;
  switch (route) {
    case 'home':
      screen = <HomeScreen model={home} onSearchSubmit={() => navigateDesign('search')} onCategorySelect={id => setHome(current => ({ ...current, activeCategoryId: id }))}
        onEventOpen={openEvent('home')} onSave={id => setHome(current => ({ ...current, forYou: current.forYou.map(event => event.id === id ? { ...event, saved: !event.saved } : event), nearby: current.nearby.map(event => event.id === id ? { ...event, saved: !event.saved } : event) }))} />;
      break;
    case 'search': case 'filters':
      screen = <SearchScreen model={SEARCH_DESIGN_DATA} initialFilterSheetOpen={route === 'filters'} onBack={() => navigateDesign('home')} onEventOpen={openEvent('search')} />;
      break;
    case 'detail': case 'detail-price-unknown': case 'detail-venue-unknown': case 'detail-source-unavailable': {
      const from = resolveDesignPreview(params.get('from')) ?? 'home';
      screen = <DetailScreen model={route === 'detail' ? previewEventDetail(params.get('event')) : DETAIL_DESIGN_DATA[route]} activeNav={detailNavigationSection(from)} onBack={() => navigateDesign(from)} />;
      break;
    }
    case 'saved':
      screen = <SavedScreen model={SAVED_DESIGN_DATA} onEventOpen={openEvent('saved')} />;
      break;
    case 'profile':
      screen = <ProfileScreen model={PROFILE_DESIGN_DATA} onSavedOpen={() => navigateDesign('saved')} />;
      break;
    case 'my-plans':
      screen = <MyPlansScreen model={MY_PLANS_DESIGN_DATA} onAddPlan={() => navigateDesign('search')} onPlanOpen={id => navigateDesign('plan-detail', { plan: id })} />;
      break;
    case 'plan-detail': case 'plan-detail-solo': case 'plan-detail-empty-discussion': {
      const model = route === 'plan-detail-solo' ? SOLO_PLAN_DETAIL_DESIGN_DATA : route === 'plan-detail-empty-discussion' ? EMPTY_DISCUSSION_PLAN_DETAIL_DESIGN_DATA : previewPlanDetail(params.get('plan'));
      screen = <PlanDetailScreen model={model} onBack={() => navigateDesign('my-plans')} onEventOpen={() => openEvent('plan-detail')(model.event.id)} />;
      break;
    }
    case 'loading': case 'empty': case 'error': case 'offline':
      screen = <HomeSystemScreen state={SYSTEM_STATE_DESIGN_DATA[route]} chrome={HOME_SYSTEM_CHROME} onAction={action => navigateDesign(previewDestination(action))} onSearchSubmit={() => navigateDesign('search')} />;
      break;
  }
  return <NavigationProvider value={{ onSelect: navigateFromNav, availableIds: DESIGN_NAVIGATION_IDS }}>
    <div data-provenance="DESIGN_FIXTURE"><span className="sr-only">Дизайн-пример. Все события, люди и локальные действия в этом предпросмотре синтетические.</span>{screen}</div>
  </NavigationProvider>;
}
