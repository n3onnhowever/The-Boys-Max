import {pgTable,uuid,text,integer,jsonb,timestamp,primaryKey,uniqueIndex,bigint,boolean} from 'drizzle-orm/pg-core';
import {sql} from 'drizzle-orm';
import type {Plan,Snapshot} from '../contracts/domain.ts';
export const actors=pgTable('actors',{id:uuid('id').primaryKey(),externalId:text('external_id').notNull().unique(),displayName:text('display_name').notNull()});
export const plans=pgTable('plans',{id:uuid('id').primaryKey(),organizerId:uuid('organizer_id').notNull().references(()=>actors.id),stateVersion:integer('state_version').notNull(),state:jsonb('state').$type<Plan>().notNull()});
export const slots=pgTable('plan_slots',{planId:uuid('plan_id').notNull().references(()=>plans.id),slotId:uuid('slot_id').notNull(),actorId:uuid('actor_id').references(()=>actors.id),state:text('state').notNull()},t=>[
 primaryKey({columns:[t.planId,t.slotId]}),uniqueIndex('one_active_slot_per_actor').on(t.planId,t.actorId).where(sql`${t.state} = 'ACTIVE'`)]);
export const snapshots=pgTable('snapshots',{id:uuid('id').primaryKey(),planId:uuid('plan_id').notNull().references(()=>plans.id),optionId:uuid('option_id').notNull(),body:jsonb('body').$type<Snapshot>().notNull()});
export const receipts=pgTable('command_receipts',{scope:text('scope').notNull(),actorId:uuid('actor_id').notNull().references(()=>actors.id),key:uuid('key').notNull(),payloadHash:text('payload_hash').notNull(),body:jsonb('body').$type<{planId:string;stateVersion:number;status:'APPLIED';commandId:string}>().notNull()},t=>[primaryKey({columns:[t.scope,t.actorId,t.key]})]);
export const joins=pgTable('join_requests',{planId:uuid('plan_id').notNull().references(()=>plans.id),actorId:uuid('actor_id').notNull().references(()=>actors.id),state:text('state').notNull()},t=>[primaryKey({columns:[t.planId,t.actorId]})]);
export const outbox=pgTable('outbox',{id:uuid('id').primaryKey(),commandId:uuid('command_id'),planId:uuid('plan_id').references(()=>plans.id),actorId:uuid('actor_id').notNull().references(()=>actors.id),state:text('state').notNull(),kind:text('kind').notNull(),purpose:text('purpose').notNull(),expectedSelectionRevision:integer('expected_selection_revision'),expectedConfigRevision:integer('expected_config_revision'),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull()});


/** T105 canonical catalog. Legacy catalog_occurrences remains byte-preserved and separate. */
export const catalogSources=pgTable('catalog_sources',{
 id:text('id').primaryKey(),providerId:text('provider_id').notNull(),dataMode:text('data_mode').notNull(),
 admissionState:text('admission_state').notNull(),rightsRevision:text('rights_revision').notNull(),
 nextRequestSeq:bigint('next_request_seq',{mode:'bigint'}).notNull(),fence:bigint('fence',{mode:'bigint'}).notNull(),
 lastSuccessAt:timestamp('last_success_at',{withTimezone:true}),
});
export const catalogSyncRuns=pgTable('catalog_sync_runs',{
 id:uuid('id').primaryKey(),sourceId:text('source_id').notNull().references(()=>catalogSources.id),
 scopeHash:text('scope_hash').notNull(),epoch:uuid('epoch').notNull(),sourceFence:bigint('source_fence',{mode:'bigint'}).notNull(),
 status:text('status').notNull(),nextPage:integer('next_page').notNull(),queryExhausted:boolean('query_exhausted').notNull(),
 snapshotConsistent:boolean('snapshot_consistent').notNull(),truncated:boolean('truncated').notNull(),
 partialCount:integer('partial_count').notNull(),failedPages:integer('failed_pages').notNull(),
 createdAt:timestamp('created_at',{withTimezone:true}).notNull(),finishedAt:timestamp('finished_at',{withTimezone:true}),
});
export const catalogSyncPages=pgTable('catalog_sync_pages',{
 id:uuid('id').primaryKey(),runId:uuid('run_id').notNull().references(()=>catalogSyncRuns.id),pageNumber:integer('page_number').notNull(),
 requestSeq:bigint('request_seq',{mode:'bigint'}).notNull(),status:text('status').notNull(),responseSha256:text('response_sha256'),
 recordCount:integer('record_count'),acceptedCount:integer('accepted_count').notNull(),quarantinedCount:integer('quarantined_count').notNull(),
 dispatchedAt:timestamp('dispatched_at',{withTimezone:true}).notNull(),committedAt:timestamp('committed_at',{withTimezone:true}),
});
export const sourceObservations=pgTable('source_observations',{
 id:uuid('id').primaryKey(),sourceId:text('source_id').notNull().references(()=>catalogSources.id),
 providerEventId:text('provider_event_id').notNull(),requestId:text('request_id').notNull(),recordOrdinal:integer('record_ordinal').notNull(),
 requestSeq:bigint('request_seq',{mode:'bigint'}).notNull(),fetchedAt:timestamp('fetched_at',{withTimezone:true}).notNull(),
 sourceUrl:text('source_url'),responseSha256:text('response_sha256').notNull(),projectionSha256:text('projection_sha256').notNull(),
 transformVersion:text('transform_version').notNull(),rightsRevision:text('rights_revision').notNull(),disposition:text('disposition').notNull(),
});
export const canonicalEvents=pgTable('canonical_events',{
 id:uuid('id').primaryKey(),sourceId:text('source_id').notNull().references(()=>catalogSources.id),
 providerEventId:text('provider_event_id').notNull(),title:text('title').notNull(),
 categories:jsonb('categories').$type<string[]>().notNull(),categoriesComplete:boolean('categories_complete').notNull(),categoryMappingVerified:boolean('category_mapping_verified').notNull(),sourceUrl:text('source_url'),
 semanticHash:text('semantic_hash').notNull(),lastRequestSeq:bigint('last_request_seq',{mode:'bigint'}).notNull(),
 acceptedObservationId:uuid('accepted_observation_id').notNull().references(()=>sourceObservations.id),
 fetchedAt:timestamp('fetched_at',{withTimezone:true}).notNull(),
});
export const canonicalVenues=pgTable('canonical_venues',{
 id:uuid('id').primaryKey(),sourceId:text('source_id').notNull().references(()=>catalogSources.id),
 providerVenueId:text('provider_venue_id').notNull(),
});
export const canonicalOccurrences=pgTable('canonical_occurrences',{
 id:uuid('id').primaryKey(),eventId:uuid('event_id').notNull().references(()=>canonicalEvents.id),
 nativeSessionId:text('native_session_id'),fragmentPath:text('fragment_path').notNull(),startsAt:timestamp('starts_at',{withTimezone:true}).notNull(),
 endsAt:timestamp('ends_at',{withTimezone:true}),timeZone:text('time_zone').notNull(),
 venueId:uuid('venue_id').references(()=>canonicalVenues.id),
 place:jsonb('place').$type<import('../domain/event.ts').Place>().notNull(),
 price:jsonb('price').$type<import('../domain/event.ts').Price>().notNull(),
 lifecycle:text('lifecycle').notNull(),confirmation:text('confirmation').notNull(),listing:text('listing').notNull(),
 revision:integer('revision').notNull(),semanticHash:text('semantic_hash').notNull(),
 acceptedObservationId:uuid('accepted_observation_id').notNull().references(()=>sourceObservations.id),
 fetchedAt:timestamp('fetched_at',{withTimezone:true}).notNull(),sourceUrl:text('source_url'),
 transformVersion:text('transform_version').notNull(),timePaths:jsonb('time_paths').$type<string[]>().notNull(),
 timeEvidence:jsonb('time_evidence').$type<Record<string,string|null>>().notNull(),
 placePaths:jsonb('place_paths').$type<string[]>().notNull(),
});
export const occurrenceAliases=pgTable('occurrence_aliases',{
 eventId:uuid('event_id').notNull().references(()=>canonicalEvents.id),aliasType:text('alias_type').notNull(),
 aliasValue:text('alias_value').notNull(),occurrenceId:uuid('occurrence_id').notNull().references(()=>canonicalOccurrences.id),
},t=>[primaryKey({columns:[t.eventId,t.aliasType,t.aliasValue]})]);
export const catalogNormalizationQuarantine=pgTable('catalog_normalization_quarantine',{
 id:uuid('id').primaryKey(),sourceId:text('source_id').notNull().references(()=>catalogSources.id),
 runId:uuid('run_id').notNull().references(()=>catalogSyncRuns.id),pageNumber:integer('page_number').notNull(),
 recordOrdinal:integer('record_ordinal'),providerEventId:text('provider_event_id'),path:text('path').notNull(),
 code:text('code').notNull(),fieldHash:text('field_hash'),createdAt:timestamp('created_at',{withTimezone:true}).notNull(),
});
