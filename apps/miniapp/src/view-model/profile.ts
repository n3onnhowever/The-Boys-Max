export type ProfilePreferenceSectionId = 'interests' | 'categories';

export interface ProfilePreferenceChipViewModel {
  id: string;
  label: string;
}

export interface ProfilePreferenceSectionViewModel {
  id: ProfilePreferenceSectionId;
  title: string;
  chips: ProfilePreferenceChipViewModel[];
}

export interface ProfilePreferenceRowViewModel {
  id: 'budget' | 'time' | 'notifications';
  label: string;
  value: string;
  icon: 'wallet' | 'clock' | 'bell';
}

export interface ProfileContactViewModel {
  id: 'vk' | 'telegram';
  label: string;
  presentation: 'DISPLAY_ONLY';
}

export interface ProfileViewModel {
  provenance: 'DESIGN_FIXTURE';
  persistence: 'LOCAL_PREVIEW_ONLY';
  capabilities: {
    identityEditing: 'UNAVAILABLE';
    preferencePersistence: 'UNAVAILABLE';
    externalAccountLinking: 'UNAVAILABLE';
  };
  title: string;
  name: string;
  city: string;
  avatar: string;
  avatarAlt: string;
  preferenceSections: ProfilePreferenceSectionViewModel[];
  preferenceRows: ProfilePreferenceRowViewModel[];
  contacts: ProfileContactViewModel[];
}

export interface ProfileUiState {
  editingSection: ProfilePreferenceSectionId | null;
  selectedChipIds: Record<ProfilePreferenceSectionId, string[]>;
  notificationsEnabled: boolean;
}

export type ProfileUiAction =
  | { type: 'TOGGLE_EDIT'; sectionId: ProfilePreferenceSectionId }
  | { type: 'TOGGLE_CHIP'; sectionId: ProfilePreferenceSectionId; chipId: string }
  | { type: 'TOGGLE_NOTIFICATIONS' };

export function createProfileUiState(model: ProfileViewModel): ProfileUiState {
  return {
    editingSection: null,
    selectedChipIds: {
      interests: model.preferenceSections.find(section => section.id === 'interests')?.chips.map(chip => chip.id) ?? [],
      categories: model.preferenceSections.find(section => section.id === 'categories')?.chips.map(chip => chip.id) ?? [],
    },
    notificationsEnabled: true,
  };
}

export function profileUiReducer(state: ProfileUiState, action: ProfileUiAction): ProfileUiState {
  switch (action.type) {
    case 'TOGGLE_EDIT':
      return { ...state, editingSection: state.editingSection === action.sectionId ? null : action.sectionId };
    case 'TOGGLE_CHIP': {
      if (state.editingSection !== action.sectionId) return state;
      const selected = state.selectedChipIds[action.sectionId];
      return {
        ...state,
        selectedChipIds: {
          ...state.selectedChipIds,
          [action.sectionId]: selected.includes(action.chipId)
            ? selected.filter(id => id !== action.chipId)
            : [...selected, action.chipId],
        },
      };
    }
    case 'TOGGLE_NOTIFICATIONS':
      return { ...state, notificationsEnabled: !state.notificationsEnabled };
  }
}
