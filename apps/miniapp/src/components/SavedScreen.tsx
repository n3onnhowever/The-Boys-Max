import { useReducer } from 'react';
import type { SavedSegment, SavedViewModel } from '../view-model/saved.ts';
import { createSavedUiState, savedEventById, savedEventsForSegment, savedUiReducer } from '../view-model/saved.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { EventCardList } from './EventCardList.tsx';
import { Icon } from './Icon.tsx';

interface SavedScreenProps {
  model: SavedViewModel;
  initialSegment?: SavedSegment;
  onEventOpen?: (eventId: string) => void;
  onNavigate?: (id: string) => void;
  onNotifications?: () => void;
}

export function SavedScreen({ model, initialSegment = 'upcoming', onEventOpen, onNavigate, onNotifications }: SavedScreenProps) {
  const [state, dispatch] = useReducer(savedUiReducer, undefined, () => createSavedUiState(model, initialSegment));
  const events = savedEventsForSegment(model, state);
  const removedEvent = savedEventById(model, state.lastRemovedEventId);
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="saved-screen">
      <header className="saved-page-header">
        <span aria-hidden="true" />
        <h1>{model.title}</h1>
        <button className="notification-action" type="button" aria-label="Уведомления" onClick={onNotifications} disabled={!onNotifications}>
          <Icon name="bell" />
          <span className="notification-dot" aria-hidden="true" />
        </button>
      </header>
      <div className="saved-segmented" role="group" aria-label="Период сохранённых событий">
        {model.segments.map(segment => <button
          key={segment.id}
          id={`saved-tab-${segment.id}`}
          type="button"
          aria-controls="saved-events-panel"
          aria-pressed={state.activeSegment === segment.id}
          className={state.activeSegment === segment.id ? 'is-active' : ''}
          onClick={() => dispatch({ type: 'SELECT_SEGMENT', segment: segment.id })}
        >{segment.label}</button>)}
      </div>
      <section
        id="saved-events-panel"
        className="saved-events-panel"
        aria-labelledby={`saved-tab-${state.activeSegment}`}
      >
        {events.length > 0 ? <EventCardList
          events={events}
          savedEventIds={state.savedEventIds}
          ariaLabel="Сохранённые события"
          onOpen={onEventOpen}
          onSave={eventId => dispatch({ type: 'TOGGLE_SAVED', eventId })}
        /> : <div className="saved-empty" role="status">
          <Icon name="heart" />
          <h2>Пока ничего нет</h2>
          <p>Сохраняйте события, чтобы вернуться к ним позже.</p>
        </div>}
      </section>
      {removedEvent ? <div className="saved-undo" role="status" aria-live="polite">
        <span>«{removedEvent.title}» убрано</span>
        <button type="button" onClick={() => dispatch({ type: 'TOGGLE_SAVED', eventId: removedEvent.id })}>Вернуть</button>
      </div> : null}
    </Screen>
    <BottomNav active="profile" onSelect={onNavigate} />
  </AppViewport>;
}
