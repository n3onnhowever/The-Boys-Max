# Conflict resolution

All source commits are retained as merge parents. No source branch was rewritten.

| Actual overlap file | Resolution |
|---|---|
| main.tsx | One allowlisted dynamic DesignPreview entry; all accepted routes preserved; unknown parameters enter runtime. |
| App.tsx | States cold-start/error/offline handling plus Detail early return; removed obsolete App designPreview bypass. |
| styles.css | Inserted only Profile-scoped rules beside the existing Detail block; kept all screen scopes; adapted Offline inner/outer row grid for Saved's shared button; one reduced-motion block; no duplicated selectors. |
| assets.ts | Retained Profile asset and both stable branded state PNG paths. |
| components/Icon.tsx | Union of glyphs; identical chevronRight deduplicated; Profile plus geometry 5..19 chosen for all contexts; monochrome OK added. |
| components/BottomNav.tsx | Capability provider plus Saved/Profile filled active user; five destinations; unavailable Friends disabled. |
| components/EventCardList.tsx | Readonly shared list, optional open callback and optional Save; Offline Save remains disabled. |
| package.json | Unique script keys, existing captures retained through shared CDP helper; no dependency/lockfile changes. |

Text conflicts by merge: Saved: main.tsx. Profile: BottomNav.tsx, Icon.tsx, main.tsx, styles.css, package.json. Plans: Icon.tsx, main.tsx. States: App.tsx, assets.ts, EventCardList.tsx, Icon.tsx, main.tsx. Additional semantic CSS overlap was fixed in Offline.

Saved remains a Profile subsection. A bookmark in the pre-existing left Profile header slot opens Saved in explicit preview; active Profile is retained on Saved and when opening Detail from Saved. Direct Detail activates Home; originating Search/Plans keeps the corresponding active item. No other screen geometry was redesigned.
