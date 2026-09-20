import { useState } from 'react';
import type { HomeViewModel } from '../view-model/home.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { BrandHeader } from './BrandHeader.tsx';
import { CategoryChip } from './CategoryChip.tsx';
import { EventCardCompact } from './EventCardCompact.tsx';
import { HeroEventCard } from './HeroEventCard.tsx';
import { SearchBar } from './SearchBar.tsx';
import { SectionHeader } from './SectionHeader.tsx';

interface HomeScreenProps {
  model: HomeViewModel;
  searchValue?: string;
  busy?: boolean;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onCategorySelect?: (id: string) => void;
  onEventOpen?: (id: string) => void;
  onSave?: (id: string) => void;
  onNavigate?: (id: string) => void;
}

export function HomeScreen({ model, searchValue, busy = false, onSearchChange, onSearchSubmit, onCategorySelect, onEventOpen, onSave, onNavigate }: HomeScreenProps) {
  const [localSearch, setLocalSearch] = useState('');
  const query = searchValue ?? localSearch;
  const changeSearch = onSearchChange ?? setLocalSearch;
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="home-screen">
      <BrandHeader />
      <form className="home-search" role="search" onSubmit={event => { event.preventDefault(); onSearchSubmit?.(); }}>
        <SearchBar value={query} onChange={changeSearch} disabled={busy} placeholder={model.searchPlaceholder} />
      </form>
      <div className="category-rail" aria-label="Категории">
        {model.categories.map(category => <CategoryChip
          key={category.id}
          label={category.label}
          selected={category.id === model.activeCategoryId}
          onSelect={!busy && onCategorySelect ? () => onCategorySelect(category.id) : undefined}
        />)}
      </div>
      {model.hero ? <HeroEventCard event={model.hero} onOpen={!busy && onEventOpen ? () => onEventOpen(model.hero!.id) : undefined} /> : <section className="home-empty-inline"><h1 tabIndex={-1}>Подборка готовится</h1><p>Новые варианты появятся после обновления источников.</p></section>}
      <section className="home-section" aria-labelledby="for-you-heading">
        <SectionHeader title="Для тебя" />
        <span id="for-you-heading" className="sr-only">Для тебя</span>
        <div className="event-card-rail">
          {model.forYou.map(event => <EventCardCompact key={event.id} event={event} onOpen={!busy && onEventOpen ? () => onEventOpen(event.id) : undefined} onSave={onSave ? () => onSave(event.id) : undefined} />)}
        </div>
      </section>
      <section className="home-section nearby-section" aria-labelledby="nearby-heading">
        <SectionHeader title="Рядом с тобой" />
        <span id="nearby-heading" className="sr-only">Рядом с тобой</span>
        <div className="event-card-rail nearby-rail">
          {model.nearby.map(event => <EventCardCompact key={event.id} event={event} variant="nearby" onOpen={!busy && onEventOpen ? () => onEventOpen(event.id) : undefined} onSave={onSave ? () => onSave(event.id) : undefined} />)}
        </div>
      </section>
    </Screen>
    <BottomNav active="home" onSelect={onNavigate} />
  </AppViewport>;
}
