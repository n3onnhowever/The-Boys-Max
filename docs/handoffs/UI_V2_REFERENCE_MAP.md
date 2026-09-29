# POVOD V2 reference and component map

Input: `POVOD_best_visual_refs_2026-09-26.zip`, README and manifest, inspected once on 2026-09-26. Starting runtime SHA: `c0235a30195ced23b1cf9934dfe1bf09830e45b4`; existing runtime changes restored from the Codex archive snapshot and kept uncommitted.

## Screen inventory and selected references

| Runtime surface | Primary archive reference | Adaptation required by product truth |
| --- | --- | --- |
| Home, new user, denied location | `01_home_search_location/01_home_personalized`, `02_home_new_user`, `03_home_location_denied` | Real catalog and permission state; no invented events. |
| Search and results | `04_search_default`, `05_search_results_canonical` | Search remains the active tab; editable text and truthful server filters. |
| Filters, sort, city, radius | `06_filters_full_corrected`, `07_sort_format_sheet`, `08_city_picker_moscow_only_reference`, `09_city_unsupported_coverage`, `10_location_nearby_settings` | Moscow only; no duplicate city; map soon. |
| Event detail, Saved | `02_event_saved/01_event_detail_normal`, `02_event_detail_saved_plan_active`, `04_event_detail_unknown_source_issue`, `05_saved_list` | Source and unknown facts remain server controlled. |
| Event invite/share | `02_event_saved/03_event_share_invite_sheet` | Friends are POVOD relations; MAX share handoff is external. |
| My Plans, empty, organizer, participant | `03_plans/01_my_plans_list`, `11_my_plans_empty`, `02_plan_detail_organizer_final`, `03_plan_participant_confirmed` | Event facts are read only; plan fields and RSVP have distinct ownership. |
| Invite, join approval, edit, change, RSVP, cancel, share | `03_plans/04_invitation_receive`, `05_join_request_final`, `06_edit_plan_final`, `07_plan_changed_reconfirm`, `08_change_rsvp_sheet`, `09_cancel_plan_confirmation`, `10_plan_cancelled_participant`, `12_share_plan_to_MAX` | No internal chat or global interest count. Only actual changed plan fields appear as changed. |
| Friends, notifications, profile, interests | `04_social_profile/01_friends_list_reference`, `02_notifications_list_reference`, `03_profile_reference`, `04_interests_editor_reference` | No UUID UI, real unread state, one Interests preference. |

## Component plan

Keep the established `AppViewport`, `BottomNav`, brand assets, event cards, event detail, Saved and runtime adapters. Consolidate new pages around shared `AppHeader`/`BackHeader`, `PovodButton`, `Chip`/`SelectedChip`, `StatusChip`, `SettingsRow`, `PovodSheet`, `EmptyState`/`ErrorState`, `PlanCard`, `FriendRow`, `NotificationRow`, and preference controls. Reuse the existing `EventCard`, `EventCardCompact`, `SectionHeader`, `AvatarStack`, `SearchBar`, filter chips and system states. Replace generic owner page forms/overlays, decorative badge, disabled fake edit affordances, chat and raw UUID controls. Preserve API routes and runtime navigation while adding only narrow persistence where required for plan-owned fields.
