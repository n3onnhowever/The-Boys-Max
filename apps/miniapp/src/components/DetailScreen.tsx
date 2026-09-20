import { useState, type ReactNode } from 'react';
import type { DetailViewModel } from '../view-model/detail.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { AvatarStack } from './AvatarStack.tsx';
import { BottomNav } from './BottomNav.tsx';
import { DetailActionBar } from './DetailActionBar.tsx';
import { EventDetailSurface } from './EventDetailSurface.tsx';
import { EventHero } from './EventHero.tsx';
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
}

export function DetailScreen({ model, busy = false, activeNav = 'home', onBack, onPlan, onNavigate, planPanel }: DetailScreenProps) {
  const [saved, setSaved] = useState(model.saved);
  const [announcement, setAnnouncement] = useState('');
  const designNotice = (message: string) => setAnnouncement(`Дизайн-пример: ${message}`);
  const saveAction = model.saveCapability === 'DESIGN_ONLY'
    ? () => { setSaved(value => !value); designNotice(saved ? 'событие убрано из сохранённых' : 'событие сохранено локально только для предпросмотра'); }
    : null;
  const shareAction = model.shareCapability === 'DESIGN_ONLY'
    ? () => designNotice('отправка ссылки отключена')
    : null;
  const planAction = model.planCapability === 'DESIGN_ONLY'
    ? () => designNotice('добавление в план отключено')
    : model.planCapability === 'AVAILABLE' ? onPlan ?? null : null;
  const primaryAction = model.primaryAction.kind === 'DESIGN_ONLY'
    ? () => designNotice('переход к источнику отключён')
    : null;

  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="detail-screen">
      <EventHero
        title={model.title}
        dateTimeLabel={model.heroDateTimeLabel}
        venueLabel={model.heroVenueLabel}
        artwork={model.heroArtwork}
        artworkAlt={model.heroArtworkAlt}
        saved={saved}
        onBack={busy ? null : onBack ?? null}
        onShare={busy ? null : shareAction}
        onSave={busy ? null : saveAction}
      />
      <EventDetailSurface tags={model.tags} description={model.description}>
        <OccurrenceTimeRow occurrence={model.occurrence} />
        <VenueRow venue={model.venue} />
        <PriceRow price={model.price} />
        <SourceRow source={model.source} />
        <DetailActionBar primary={model.primaryAction} saved={saved} busy={busy} onPrimary={primaryAction} onSave={saveAction} onPlan={planAction} />
        {model.attendance && <AvatarStack attendance={model.attendance} />}
        {planPanel}
        <output className="sr-only" aria-live="polite">{announcement}</output>
      </EventDetailSurface>
    </Screen>
    {onNavigate ? <BottomNav active={activeNav} onSelect={onNavigate} /> : <BottomNav active={activeNav} />}
  </AppViewport>;
}
