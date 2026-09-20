import type { CatalogView, SearchDraft } from '../port/contracts.ts';
import type { UiState, ViewController } from '../core/controller.ts';
import { catalogToHomeViewModel, keyForEvent } from '../view-model/home.ts';
import { HomeScreen } from './HomeScreen.tsx';

export function EventsList({ view, controller, state, busy }: { view: CatalogView; controller: ViewController; state: UiState; busy: boolean }) {
  if (view.route.kind !== 'CATALOG') return null;
  const scope = view.route.scope;
  const text = state.draft.search ?? view.query.text;
  const executeSearch = (includedCategories = view.query.includedCategories) => {
    const draft: SearchDraft = { ...view.query, text, includedCategories };
    void controller.execute({ type: 'SEARCH', scope, draft });
  };
  const open = (id: string) => {
    const event = view.events.find(candidate => keyForEvent(candidate) === id);
    if (!event) return;
    void controller.load({kind:'EVENT',sourceId:event.ref.sourceId,externalEventId:event.ref.externalEventId,occurrenceId:event.ref.occurrenceId,scope});
  };
  return <HomeScreen
    model={catalogToHomeViewModel(view)}
    searchValue={text}
    busy={busy}
    onSearchChange={value => controller.setDraft('search', value)}
    onSearchSubmit={() => executeSearch()}
    onCategorySelect={id => executeSearch(id === 'all' ? [] : [id])}
    onEventOpen={open}
  />;
}
