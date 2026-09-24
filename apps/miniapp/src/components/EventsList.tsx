import type { CatalogView, SearchDraft } from '../port/contracts.ts';
import type { UiState, ViewController } from '../core/controller.ts';
import { catalogToHomeViewModel, keyForEvent } from '../view-model/home.ts';
import { catalogToSearchViewModel } from '../view-model/search.ts';
import { emptySystemState, errorSystemState, offlineSystemState, resetCatalogSearchDraft, type HomeSystemAction } from '../view-model/system-state.ts';
import { HomeScreen } from './HomeScreen.tsx';
import { HomeSystemScreen } from './HomeSystemScreen.tsx';

export function EventsList({ view, controller, state, busy }: { view: CatalogView; controller: ViewController; state: UiState; busy: boolean }) {
  if (view.route.kind !== 'CATALOG') return null;
  const scope = view.route.scope;
  const text = state.draft.search ?? view.query.text;
  const model = catalogToHomeViewModel(view);
  const chrome = {
    searchPlaceholder: model.searchPlaceholder,
    activeCategoryId: model.activeCategoryId,
    categories: model.categories,
  };
  const executeSearch = (includedCategories = view.query.includedCategories) => {
    const draft: SearchDraft = { ...view.query, text, includedCategories };
    void controller.execute({ type: 'SEARCH', scope, draft });
  };
  const resetFilters = () => {
    const draft = resetCatalogSearchDraft(view.query);
    void controller.execute({ type: 'SEARCH', scope, draft });
  };
  const open = (id: string) => {
    const event = view.events.find(candidate => keyForEvent(candidate) === id);
    if (!event) return;
    void controller.load({kind:'EVENT',sourceId:event.ref.sourceId,externalEventId:event.ref.externalEventId,occurrenceId:event.ref.occurrenceId,scope});
  };
  const handleStateAction = (action: HomeSystemAction) => {
    if (action === 'retry') void controller.retry();
    if (action === 'return-home') void controller.load({kind:'CATALOG',scope:{kind:'PERSONAL'}});
    if (action === 'reset-filters') resetFilters();
    if (action === 'change-filters') document.querySelector<HTMLInputElement>('.home-search input[type="search"]')?.focus();
  };
  const stateChromeProps = {
    chrome,
    searchValue: text,
    onSearchChange: (value: string) => controller.setDraft('search', value),
    onSearchSubmit: () => executeSearch(),
    onCategorySelect: (id: string) => executeSearch(id === 'all' ? [] : [id]),
    onAction: handleStateAction,
  };
  if (state.phase === 'offline') return <HomeSystemScreen
    {...stateChromeProps}
    state={offlineSystemState(catalogToSearchViewModel(view).events.slice(0, 2))}
  />;
  if (state.phase === 'error') return <HomeSystemScreen {...stateChromeProps} state={errorSystemState(state.error ?? undefined)} />;
  if (view.events.length === 0) return <HomeSystemScreen {...stateChromeProps} state={emptySystemState()} />;
  return <HomeScreen
    model={model}
    searchValue={text}
    busy={busy}
    onSearchChange={value => controller.setDraft('search', value)}
    onSearchSubmit={() => executeSearch()}
    onCategorySelect={id => executeSearch(id === 'all' ? [] : [id])}
    onEventOpen={open}
  />;
}
