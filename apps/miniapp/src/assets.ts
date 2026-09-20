export const BRAND_ASSETS = {
  wordmark: '/assets/brand/povod-wordmark-home.png',
  squareIcon: '/assets/brand/povod-icon-square.png',
  appIcon: '/assets/brand/povod-icon-app.png',
  circleIcon: '/assets/brand/povod-icon-circle.png',
} as const;

export const HOME_ARTWORK = {
  hero: '/assets/events/home-hero.jpg',
  concert: '/assets/events/for-you-concert.jpg',
  gallery: '/assets/events/for-you-gallery.jpg',
  club: '/assets/events/for-you-club.jpg',
  dance: '/assets/events/nearby-dance.jpg',
} as const;

export const PROFILE_ASSETS = {
  designAvatar: '/assets/profile/design-avatar.jpg',
} as const;

/** Replaceable raster placeholders derived from approved internal POVOD Master UI Reference v1. */
export const STATE_ASSETS = {
  empty: '/assets/states/povod-empty-magnifier.png',
  offline: null,
  error: '/assets/states/povod-error-cable.png',
} as const;
