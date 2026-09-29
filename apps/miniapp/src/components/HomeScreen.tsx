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
import { Icon } from './Icon.tsx';

interface HomeScreenProps {
  model: HomeViewModel;
  searchValue?: string;
  busy?: boolean;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onCategorySelect?: (id: string) => void;
  onEventOpen?: (id: string) => void;
  onSave?: (id: string) => void;
  canSave?: (id: string) => boolean;
  onNavigate?: (id: string) => void;
  onNotifications?: () => void;
  onCity?: () => void;
  city?: string;
  nearbyStatus?: string;
  needsInterests?:boolean;onInterests?:()=>void;interests?:string[];matchedInterest?:string|null;
}

export function HomeScreen({ model, searchValue, busy = false, onSearchChange, onSearchSubmit, onCategorySelect, onEventOpen, onSave, canSave, onNavigate, onNotifications, onCity, city, nearbyStatus, needsInterests, onInterests, interests=[], matchedInterest }: HomeScreenProps) {
  const [localSearch, setLocalSearch] = useState('');
  const query = searchValue ?? localSearch;
  const changeSearch = onSearchChange ?? setLocalSearch;
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="home-screen">
      <BrandHeader onNotifications={onNotifications} onCity={onCity} city={city} />
      {needsInterests&&onInterests&&<section className="v2-home-welcome"><div><h2>Привет!</h2><p>Выберите, что вам интересно, чтобы подборка стала ближе к вашим вкусам.</p><button type="button" className="v2-button v2-button-primary" onClick={onInterests}>Выбрать интересы</button></div><span aria-hidden="true"><Icon name="heart"/></span></section>}
      {!needsInterests&&interests.length>0&&<section className="v2-home-personal"><span>ВАШ ПОВОД В МОСКВЕ</span><h2>Найдём, куда пойти</h2><p>{matchedInterest?`Сначала — события, связанные с интересом «${matchedInterest}». Остальное — из доступного каталога.`:`Ваши интересы: ${interests.slice(0,3).join(', ')}. Посмотрите доступные события Москвы.`}</p>{onInterests&&<button type="button" onClick={onInterests}>Изменить интересы</button>}</section>}
      <form className="home-search" role="search" onSubmit={event => { event.preventDefault(); onSearchSubmit?.(); }}>
        <SearchBar value={model.provenance === 'SERVER_ADAPTER' ? '' : query} onChange={changeSearch} disabled={busy} readOnly={model.provenance === 'SERVER_ADAPTER'} onFocus={model.provenance === 'SERVER_ADAPTER' ? onSearchSubmit : undefined} placeholder={model.provenance === 'SERVER_ADAPTER' ? 'Выбрать фильтры' : model.searchPlaceholder} />
      </form>
      <div className="category-rail" aria-label="Категории">
        {model.categories.map(category => <CategoryChip
          key={category.id}
          label={category.label}
          selected={category.id === model.activeCategoryId}
          onSelect={!busy && onCategorySelect ? () => onCategorySelect(category.id) : undefined}
        />)}
      </div>
      {model.hero ? <HeroEventCard event={model.hero} showDesignTagline={model.provenance === 'DESIGN_FIXTURE'} onOpen={!busy && onEventOpen ? () => onEventOpen(model.hero!.id) : undefined} /> : <section className="home-empty-inline"><h1 tabIndex={-1}>Подборка готовится</h1><p>Новые варианты появятся после обновления источников.</p></section>}
      <section className="home-section" aria-labelledby="for-you-heading">
        <SectionHeader title={model.provenance === 'DESIGN_FIXTURE' ? 'Для тебя' : matchedInterest?'По вашим интересам':'События Москвы'} />
        <span id="for-you-heading" className="sr-only">{model.provenance === 'DESIGN_FIXTURE' ? 'Для тебя' : 'События'}</span>
        <div className={`event-card-rail${model.forYou.length === 1 ? ' is-single' : ''}`}>
          {model.forYou.map(event => <EventCardCompact key={event.id} event={event} onOpen={!busy && onEventOpen ? () => onEventOpen(event.id) : undefined} onSave={onSave&&(!canSave||canSave(event.id)) ? () => onSave(event.id) : undefined} />)}
        </div>
      </section>
      <section className="home-section nearby-section" aria-labelledby="nearby-heading">
        <SectionHeader title="Рядом с тобой" />
        <span id="nearby-heading" className="sr-only">Рядом с тобой</span>
        <div className="event-card-rail nearby-rail">
          {model.nearby.map(event => <EventCardCompact key={event.id} event={event} variant="nearby" onOpen={!busy && onEventOpen ? () => onEventOpen(event.id) : undefined} onSave={onSave&&(!canSave||canSave(event.id)) ? () => onSave(event.id) : undefined} />)}
        </div>
        {!model.nearby.length && <div className="v2-card v2-nearby-state" role="status"><span className="v2-nearby-icon"><Icon name="pin"/></span><strong>События поблизости</strong><p>{nearbyStatus??'Поблизости нет событий с подтверждёнными координатами.'}</p>{onCity&&<button type="button" className="v2-button v2-button-secondary" onClick={onCity}>Выбрать город</button>}</div>}
      </section>
    </Screen>
    <BottomNav active="home" onSelect={onNavigate} />
  </AppViewport>;
}
