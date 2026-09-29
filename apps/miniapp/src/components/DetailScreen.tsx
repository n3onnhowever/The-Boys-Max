import { useState, type ReactNode } from 'react';
import type { DetailViewModel } from '../view-model/detail.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { AvatarStack } from './AvatarStack.tsx';
import { BottomNav } from './BottomNav.tsx';
import { DetailActionBar } from './DetailActionBar.tsx';
import { EventDetailSurface } from './EventDetailSurface.tsx';
import { EventHero } from './EventHero.tsx';
import { BackHeader } from './PovodUI.tsx';
import { Icon } from './Icon.tsx';
import { OccurrenceTimeRow } from './OccurrenceTimeRow.tsx';
import { PriceRow } from './PriceRow.tsx';
import { SourceRow } from './SourceRow.tsx';
import { VenueRow } from './VenueRow.tsx';

interface DetailScreenProps {
  model: DetailViewModel;
  busy?: boolean;
  activeNav?: string;
  onBack?: () => void;
  onPlan?: () => void;
  onNavigate?: (target: string) => void;
  planPanel?: ReactNode;
  savedState?: boolean;
  onSave?: () => void;
  onShare?: () => void;
  saveBusy?: boolean;
  saveError?: string | null;
  unavailableMessage?: string;
}

export function DetailScreen({ model, busy = false, activeNav = 'home', onBack, onPlan, onNavigate, planPanel, savedState, onSave, onShare, saveBusy = false, saveError, unavailableMessage }: DetailScreenProps) {
  const [saved, setSaved] = useState(model.saved);
  const [announcement, setAnnouncement] = useState('');
  const designNotice = (message: string) => setAnnouncement(`Дизайн-пример: ${message}`);
  const currentSaved=savedState??saved;
  const saveAction = model.saveCapability === 'AVAILABLE' ? onSave??null : model.saveCapability === 'DESIGN_ONLY'
    ? () => { setSaved(value => !value); designNotice(saved ? 'событие убрано из сохранённых' : 'событие сохранено локально только для предпросмотра'); }
    : null;
  const shareAction = onShare ?? (model.shareCapability === 'DESIGN_ONLY'
    ? () => designNotice('отправка ссылки отключена')
    : null);
  const planAction = model.planCapability === 'DESIGN_ONLY'
    ? () => designNotice('добавление в план отключено')
    : model.planCapability === 'AVAILABLE' ? onPlan ?? null : null;
  const primaryAction = model.primaryAction.kind === 'DESIGN_ONLY'
    ? () => designNotice('переход к источнику отключён')
    : null;

  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className={`detail-screen${model.provenance === 'SERVER_ADAPTER' ? ' runtime-detail' : ''}`}>
      {onBack&&<BackHeader title="Событие" onBack={onBack} action={shareAction||saveAction?<span className="v2-detail-header-actions">{shareAction&&<button type="button" aria-label="Поделиться" onClick={shareAction} disabled={busy}><Icon name="share"/></button>}{saveAction&&<button type="button" aria-label={currentSaved?'Убрать из сохранённых':'Сохранить'} aria-pressed={currentSaved} onClick={saveAction} disabled={busy||saveBusy}><Icon name="heart" filled={currentSaved}/></button>}</span>:undefined}/>}
      {unavailableMessage&&<div className="v2-detail-unavailable" role="status"><strong>Событие сейчас недоступно</strong><p>{unavailableMessage}</p></div>}
      <EventHero
        title={model.title}
        dateTimeLabel={model.heroDateTimeLabel}
        venueLabel={model.heroVenueLabel}
        artwork={model.heroArtwork}
        artworkAlt={model.heroArtworkAlt}
        saved={currentSaved}
        onBack={null}
        onShare={onBack?null:busy ? null : shareAction}
        onSave={onBack?null:busy || saveBusy ? null : saveAction}
        categoryLabel={model.tags[0]}
      />
      <EventDetailSurface tags={model.tags} description={model.description}>
        <OccurrenceTimeRow occurrence={model.occurrence} />
        <VenueRow venue={model.venue} />
        <PriceRow price={model.price} />
        <SourceRow source={model.source} />
        <DetailActionBar primary={model.primaryAction} saved={currentSaved} busy={busy || saveBusy} onPrimary={primaryAction} onSave={saveAction} onPlan={planAction} />
        {model.attendance && <AvatarStack attendance={model.attendance} />}
        {planPanel}
        <output className="sr-only" aria-live="polite">{announcement}</output>
        {saveError && <p role="alert">{saveError}</p>}
      </EventDetailSurface>
    </Screen>
    {!onBack&&(onNavigate ? <BottomNav active={activeNav} onSelect={onNavigate} /> : <BottomNav active={activeNav} />)}
  </AppViewport>;
}
