import type { CatalogView, SearchDraft } from '../port/contracts.ts';
import { catalogToSearchViewModel } from '../view-model/search.ts';
import { SearchScreen } from './SearchScreen.tsx';

/** The runtime supplies actions and server data to the approved Search screen. */
export function RuntimeSearchScreen({ view, busy, error, onRetry, onApply, onOpen, onBack, onNavigate }: {
  view: CatalogView; busy: boolean; onApply: (draft: SearchDraft) => void;
  error: string | null; onRetry: () => void;
  onOpen: (id: string) => void; onBack: () => void; onNavigate: (id: string) => void;
}) {
  return <SearchScreen model={catalogToSearchViewModel(view)} onBack={onBack} onNavigate={onNavigate} onEventOpen={onOpen}
    runtime={{ query: view.query, busy, error, onRetry, onApply }} />;
}
