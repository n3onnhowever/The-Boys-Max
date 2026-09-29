/** This allowlist is the only gate into synthetic UI data; unknown values use normal runtime. */
export const DESIGN_PREVIEW_ROUTES = [
  'home', 'search', 'filters', 'detail', 'detail-price-unknown', 'detail-venue-unknown',
  'detail-source-unavailable', 'saved', 'profile', 'my-plans', 'plan-detail',
  'plan-detail-solo', 'plan-detail-empty-discussion', 'loading', 'empty', 'error', 'offline',
] as const;
export type DesignPreviewRoute = typeof DESIGN_PREVIEW_ROUTES[number];
export function resolveDesignPreview(value: string | null): DesignPreviewRoute | null {
  return DESIGN_PREVIEW_ROUTES.find(route => route === value) ?? null;
}
export const DESIGN_NAVIGATION_IDS = ['home', 'search', 'plan', 'profile'] as const;
export function designNavigationRoute(id: string): DesignPreviewRoute | null {
  if (id === 'plan') return 'my-plans';
  return id === 'home' || id === 'search' || id === 'profile' ? id : null;
}
export function detailNavigationSection(from: string | null): string {
  return from === 'saved' ? 'profile' : from === 'search' ? 'search' : from === 'plan-detail' ? 'plan' : 'home';
}
