import type { SearchEventViewModel } from './search.ts';

export type SavedSegment = 'upcoming' | 'later';

export interface SavedSegmentViewModel {
  id: SavedSegment;
  label: string;
}

export interface SavedViewModel {
  provenance: 'DESIGN_FIXTURE' | 'SERVER_ADAPTER';
  title: string;
  segments: readonly SavedSegmentViewModel[];
  events: Readonly<Record<SavedSegment, readonly SearchEventViewModel[]>>;
}

export interface SavedUiState {
  activeSegment: SavedSegment;
  savedEventIds: string[];
  lastRemovedEventId: string | null;
}

export type SavedUiAction =
  | { type: 'SELECT_SEGMENT'; segment: SavedSegment }
  | { type: 'TOGGLE_SAVED'; eventId: string };

function allEvents(model: SavedViewModel): readonly SearchEventViewModel[] {
  return [...model.events.upcoming, ...model.events.later];
}

export function createSavedUiState(model: SavedViewModel, activeSegment: SavedSegment = 'upcoming'): SavedUiState {
  return {
    activeSegment,
    savedEventIds: allEvents(model).filter(event => event.saved).map(event => event.id),
    lastRemovedEventId: null,
  };
}

export function savedUiReducer(state: SavedUiState, action: SavedUiAction): SavedUiState {
  if (action.type === 'SELECT_SEGMENT') {
    return { ...state, activeSegment: action.segment, lastRemovedEventId: null };
  }
  const isSaved = state.savedEventIds.includes(action.eventId);
  return {
    ...state,
    savedEventIds: isSaved
      ? state.savedEventIds.filter(eventId => eventId !== action.eventId)
      : [...state.savedEventIds, action.eventId],
    lastRemovedEventId: isSaved ? action.eventId : null,
  };
}

export function savedEventsForSegment(model: SavedViewModel, state: SavedUiState): SearchEventViewModel[] {
  return model.events[state.activeSegment].filter(event => state.savedEventIds.includes(event.id));
}

export function savedEventById(model: SavedViewModel, eventId: string | null): SearchEventViewModel | null {
  if (!eventId) return null;
  return allEvents(model).find(event => event.id === eventId) ?? null;
}
