import { useState } from 'react';
import { STATE_ASSETS } from '../assets.ts';
import type { HomeSystemAction, HomeSystemChrome, HomeSystemState } from '../view-model/system-state.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { BrandHeader } from './BrandHeader.tsx';
import { CategoryChip } from './CategoryChip.tsx';
import { EventCardList } from './EventCardList.tsx';
import { Icon } from './Icon.tsx';
import { SearchBar } from './SearchBar.tsx';
import { SectionHeader } from './SectionHeader.tsx';
import { HomeSkeleton } from './Skeleton.tsx';

interface HomeSystemScreenProps {
  state: HomeSystemState;
  chrome: HomeSystemChrome;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onCategorySelect?: (id: string) => void;
  onAction?: (action: HomeSystemAction) => void;
  onNavigate?: (id: string) => void;
}

function OfflineAlert({ state }: { state: Extract<HomeSystemState, { kind: 'offline' }> }) {
  return <div className="offline-alert" role="status">
    <span className="offline-alert-icon"><Icon name="wifi" /></span>
    <span><strong>{state.alertTitle}</strong><small>{state.alertDescription}</small></span>
    <span className="offline-alert-chevron" aria-hidden="true">›</span>
  </div>;
}

function StateActions({ state, onAction }: { state: Extract<HomeSystemState, { kind: 'empty' | 'error' }>; onAction?: (action: HomeSystemAction) => void }) {
  const primaryAction = state.kind === 'empty' ? 'change-filters' : 'retry';
  const secondaryAction = state.kind === 'empty' ? 'reset-filters' : 'return-home';
  return <div className="system-state-actions">
    <button type="button" className="system-state-primary" data-state-action={primaryAction} onClick={() => onAction?.(primaryAction)}>
      {state.kind === 'empty' ? 'Изменить фильтры' : 'Повторить'}
    </button>
    <button type="button" className="system-state-secondary" data-state-action={secondaryAction} onClick={() => onAction?.(secondaryAction)}>
      {state.kind === 'empty' ? 'Сбросить фильтры' : 'Вернуться на главную'}
    </button>
  </div>;
}

export function HomeSystemScreen({
  state,
  chrome,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onCategorySelect,
  onAction,
  onNavigate,
}: HomeSystemScreenProps) {
  const [localSearch, setLocalSearch] = useState('');
  const query = searchValue ?? localSearch;
  const changeSearch = onSearchChange ?? setLocalSearch;
  const loading = state.kind === 'loading';
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className={`system-state-screen system-state-${state.kind}`}>
      <BrandHeader />
      {state.kind === 'offline' ? <OfflineAlert state={state} /> : null}
      <form className="home-search" role="search" onSubmit={event => { event.preventDefault(); onSearchSubmit?.(); }}>
        <SearchBar value={query} onChange={changeSearch} disabled={loading} placeholder={chrome.searchPlaceholder} />
      </form>
      <div className="category-rail" aria-label="Категории">
        {chrome.categories.map(category => <CategoryChip
          key={category.id}
          label={category.label}
          selected={category.id === chrome.activeCategoryId}
          onSelect={!loading && onCategorySelect ? () => onCategorySelect(category.id) : undefined}
        />)}
      </div>
      {state.kind === 'loading' ? <HomeSkeleton statusLabel={state.statusLabel} /> : null}
      {state.kind === 'empty' || state.kind === 'error' ? <section className="system-state-center" role={state.kind === 'error' ? 'alert' : undefined}>
        <img
          className={`system-state-art system-state-art-${state.kind}`}
          src={state.kind === 'empty' ? STATE_ASSETS.empty : STATE_ASSETS.error}
          alt=""
          aria-hidden="true"
        />
        <div className="system-state-copy">
          <h1 tabIndex={-1}>{state.title}</h1>
          <p>{state.description}</p>
        </div>
        <StateActions state={state} onAction={onAction} />
      </section> : null}
      {state.kind === 'offline' ? <div className="offline-content">
        <section aria-labelledby="offline-events-heading">
          <SectionHeader title={state.sectionTitle} />
          <span id="offline-events-heading" className="sr-only">{state.sectionTitle}</span>
          {state.cachedEvents.length > 0
            ? <EventCardList events={state.cachedEvents} savedEventIds={[]} />
            : <p className="offline-no-cache">Сохранённых событий на этом устройстве пока нет.</p>}
        </section>
        <section className="offline-explanation" aria-labelledby="offline-explanation-heading">
          <span className="offline-explanation-icon"><Icon name="wifi" /></span>
          <div>
            <h1 id="offline-explanation-heading">{state.explanationTitle}</h1>
            <p>{state.explanation}</p>
          </div>
          <button type="button" data-state-action="retry" onClick={() => onAction?.('retry')}>Повторить</button>
        </section>
      </div> : null}
    </Screen>
    <BottomNav active="home" onSelect={onNavigate} />
  </AppViewport>;
}
