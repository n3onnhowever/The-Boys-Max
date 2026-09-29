import { PROFILE_ASSETS } from '../assets.ts';
import type { ProfileViewModel } from '../view-model/profile.ts';

/**
 * Synthetic, deterministic visual data. Values are not MAX identity fields and
 * are never persisted or submitted to a profile service.
 */
export const PROFILE_DESIGN_DATA: ProfileViewModel = {
  provenance: 'DESIGN_FIXTURE',
  persistence: 'LOCAL_PREVIEW_ONLY',
  capabilities: {
    identityEditing: 'UNAVAILABLE',
    preferencePersistence: 'UNAVAILABLE',
    externalAccountLinking: 'UNAVAILABLE',
  },
  title: 'Профиль',
  name: 'Аня',
  city: 'Москва',
  avatar: PROFILE_ASSETS.designAvatar,
  avatarAlt: 'Дизайн-аватар Ани',
  preferenceSections: [
    {
      id: 'interests',
      title: 'Мои интересы',
      chips: [
        { id: 'indie', label: 'Инди' },
        { id: 'rock', label: 'Рок' },
        { id: 'electronic', label: 'Электроника' },
        { id: 'alternative', label: 'Альтернатива' },
        { id: 'art', label: 'Искусство' },
      ],
    },
    {
      id: 'categories',
      title: 'Любимые категории',
      chips: [
        { id: 'concerts', label: 'Концерты' },
        { id: 'parties', label: 'Вечеринки' },
        { id: 'exhibitions', label: 'Выставки' },
        { id: 'festivals', label: 'Фестивали' },
        { id: 'theatre', label: 'Театр' },
        { id: 'cinema', label: 'Кино' },
      ],
    },
  ],
  preferenceRows: [
    { id: 'budget', label: 'Бюджет на события', value: 'До 3 000 ₽', icon: 'wallet' },
    { id: 'time', label: 'Предпочитаемое время', value: 'Вечер · После 18:00', icon: 'clock' },
    { id: 'notifications', label: 'Уведомления', value: 'События, подборки, обновления', icon: 'bell' },
  ],
  contacts: [
    { id: 'vk', label: 'VK', presentation: 'DISPLAY_ONLY' },
    { id: 'ok', label: 'Одноклассники / OK', presentation: 'DISPLAY_ONLY' },
  ],
};
