/** Domain/catalog evaluation only. Never use for sessions, credentials or delivery TTLs.
 * Injected by historical fixture tests, never configured from process environment. */
export type CatalogClock=()=>string;
