import { SEARCH_DESIGN_DATA } from './search.ts';
import {
  emptySystemState,
  errorSystemState,
  loadingSystemState,
  offlineSystemState,
  type HomeSystemState,
  type HomeSystemStateKind,
} from '../view-model/system-state.ts';

/** Synthetic, deterministic previews. Offline entries represent previously cached fixture content, never live availability. */
export const SYSTEM_STATE_DESIGN_DATA: Record<HomeSystemStateKind, HomeSystemState> = {
  loading: loadingSystemState(),
  empty: emptySystemState(),
  error: errorSystemState(),
  offline: offlineSystemState(SEARCH_DESIGN_DATA.events.slice(0, 2)),
};
