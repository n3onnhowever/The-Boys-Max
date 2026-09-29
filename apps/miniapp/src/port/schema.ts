import { z } from 'zod';
import {geoViewSchema} from '../../../../packages/contracts/geo-http.ts';
import { CONTRACT } from './contracts.ts';
import type { Codec, Receipt, Route, View } from './contracts.ts';
const text = z.string().max(20000);
const id = z.string().min(1).max(512);
const count = z.number().int().min(0).max(1000000);
const scope = z.discriminatedUnion('kind', [z.object({ kind: z.literal('PERSONAL') }).strict(), z.object({ kind: z.literal('PLAN'), planId: z.uuid() }).strict()]);
export const routeSchema: z.ZodType<Route> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('CATALOG'), scope }).strict(),
  z.object({ kind: z.literal('EVENT'), sourceId: id, externalEventId: id, occurrenceId: id.nullable(), scope }).strict(),
  z.object({ kind: z.literal('PLAN'), planId: z.uuid() }).strict(),
  z.object({ kind: z.literal('INVITE'), inviteRef: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
]);
export const revision = z.object({ state_version: count,search_context_revision:count.nullable(), config_revision: count, electorate_version: count, selection_revision: count, snapshot_id: id.nullable(), terms_revision: count.nullable() }).strict();
const action = z.enum(['SEARCH', 'ADD_TO_PLAN', 'CREATE_OWNED_OPTION', 'CREATE_INVITE', 'REQUEST_JOIN', 'APPROVE_JOIN', 'SAVE_ANSWER', 'SELECT_OPTION', 'CONFIRM_SELECTED', 'EDIT_OPTION', 'START_COLLECTION']);
const base = { contract: z.literal(CONTRACT), actorId: id, route: routeSchema, actions: z.array(action), revision: revision.nullable(), notice: text.nullable() };
const price = z.object({ baseLabel: text, totalLabel: text.nullable(), basisLabel: text, fees_known: z.boolean(), warnings: z.array(text) }).strict();
const place = z.object({ address: text, coordinates: z.object({lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180)}).strict().nullable(), navigationUrl: text.nullable(), attribution: text.nullable(), geoView: geoViewSchema.optional() }).strict();
export const eventRef = z.object({ offerId:z.uuid(),contextRevision:count, sourceId: id, externalEventId: id, occurrenceId: id.nullable(), observationId: id }).strict();
const event = z.object({ ref: eventRef, title: text, startLabel: text, categoryLabel: text, place, price, sourceLabel: text, sourceUrl: text.nullable(), freshnessLabel: text, eligibilityLabel: text, description: text, recommendation:z.object({score:count,reasons:z.array(z.enum(['INTEREST','BUDGET','TIME'])),interest:text.nullable()}).strict().optional(),evidenceReasons:z.array(z.object({code:z.enum(['CATEGORY_MATCH','TIME_MATCH','BUDGET_FIT','INTEREST_MATCH']),text,observation_id:id,check:text,source:z.enum(['request','saved_preference'])}).strict()).optional() }).strict();
const answer = z.enum(['CAN', 'CANNOT', 'UNKNOWN', 'MISSING', 'STALE']);
const option = z.object({ optionId: id, snapshotId: id, termsRevision: count, presentationRevision: count, title: text, startLabel: text, startLocal: text, timeZone: text, price, place, description: text, eligibility: z.enum(['READY','PROVISIONAL','BLOCKED']), eligibilityMessage: text, aggregate: z.object({CAN:count,CANNOT:count,UNKNOWN:count,MISSING:count,STALE:count}).strict(), selfAnswer: answer }).strict();
const organizer = z.object({
  slots: z.array(z.object({slotId:id,label:text,required:z.boolean(),boundActorId:id.nullable()}).strict()),
  joinRequests: z.array(z.object({requestId:id,actorId:id,displayName:text,state:z.enum(['PENDING','ACTIVE'])}).strict()),
  responseRows: z.array(z.object({displayName:text,optionId:id,value:answer}).strict()),
}).strict();
export const querySchema = z.object({ text, city:text, date:text, dateThrough:text.optional(),freeOnly:z.boolean().optional(),smartInterests:z.array(z.string().max(40)).max(8).optional(),startLocal:text, endLocal:text, timeZone:text, excludeCategories:z.array(text),includedCategories:z.array(text), participants:text, budgetText:text, budgetCurrency:z.literal('RUB'), priceBasis:z.enum(['PER_PERSON','GROUP_TOTAL','UNKNOWN']) }).strict();
export const viewSchema: z.ZodType<View> = z.discriminatedUnion('kind', [
  z.object({...base,kind:z.literal('CATALOG'),query:querySchema,approvedFilterLabels:z.array(text),events:z.array(event),aiState:z.enum(['AVAILABLE','UNAVAILABLE']),aiMessage:text}).strict(),
  z.object({...base,kind:z.literal('EVENT'),event,targetPlanId:id.nullable(),unknownReasons:z.array(text)}).strict(),
  z.object({...base,kind:z.literal('INVITE'),state:z.enum(['REQUESTABLE','PENDING','ACTIVE','EXPIRED','REJECTED']),inviteRef:id,activePlanId:id.nullable(),context:z.object({organizerName:text,planTitle:text,eventTitle:text.nullable(),startsAt:text.nullable(),venue:text.nullable()}).strict().nullable().optional()}).strict(),
  z.object({...base,kind:z.literal('PLAN'),planId:id,title:text,phase:z.enum(['DRAFT','COLLECTING','SELECTED','CLOSED','CANCELLED']),role:z.enum(['ORGANIZER','PARTICIPANT']),organizerParticipates:z.boolean(),organizer:organizer.nullable(),options:z.array(option),selectedOptionId:id.nullable(),ruleLabel:text,resultLabel:text,decisionMessage:text,expectedCount:count,unboundCount:count,selfCommitment:z.enum(['CONFIRMED','DECLINED','MISSING','STALE','NOT_PARTICIPATING']),inviteUrl:text.nullable()}).strict(),
]).superRefine((view, context) => {
  if (view.kind === 'PLAN' && view.route.kind === 'PLAN' && view.planId !== view.route.planId) context.addIssue({code:'custom',message:'Plan id mismatch'});
  if (view.kind === 'PLAN' && view.selectedOptionId !== null && !view.options.some(option => option.optionId === view.selectedOptionId)) context.addIssue({code:'custom',message:'Selected option missing'});
  if (view.route.kind !== view.kind) context.addIssue({code:'custom',message:'Route/view kind mismatch'});
  if (view.kind === 'PLAN' && view.role !== 'ORGANIZER' && view.organizer !== null) context.addIssue({code:'custom',message:'Organizer-only fields in participant view'});
  if (view.kind === 'INVITE' && ((view.state !== 'ACTIVE' && view.activePlanId !== null) || (view.state === 'ACTIVE' && view.activePlanId === null))) context.addIssue({code:'custom',message:'Private plan locator leaked to outsider'});
});
const receiptSchema: z.ZodType<Receipt> = z.object({idempotencyKey:id,outcome:z.enum(['APPLIED','REPLAYED','NO_CHANGE']),view:viewSchema}).strict();
export const codec: Codec = { view: input => viewSchema.parse(input), receipt: input => receiptSchema.parse(input) };

export const commandSchema=z.discriminatedUnion('type',[
 z.strictObject({type:z.literal('SEARCH'),scope,draft:querySchema}),
 z.strictObject({type:z.literal('ADD_TO_PLAN'),eventRef,targetPlanId:z.uuid().nullable(),newPlan:z.strictObject({title:z.string().min(1).max(160),participantSlots:z.number().int().min(1).max(50),organizerParticipates:z.boolean(),decisionLocal:z.string().max(32),commitmentLocal:z.string().max(32),timeZone:z.string().max(80)}).nullable(),ackUnknownReasons:z.array(z.string()).max(30)}),
 z.strictObject({type:z.literal('CREATE_INVITE'),planId:z.uuid()}),
 z.strictObject({type:z.literal('REQUEST_JOIN'),inviteRef:z.string().regex(/^[a-f0-9]{64}$/)}),
 z.strictObject({type:z.literal('APPROVE_JOIN'),planId:z.uuid(),requestId:z.uuid(),actorId:z.uuid(),slotId:z.uuid()}),
 z.strictObject({type:z.literal('SAVE_ANSWER'),planId:z.uuid(),optionId:z.uuid(),value:z.enum(['CAN','CANNOT','UNKNOWN'])}),
 z.strictObject({type:z.literal('SELECT_OPTION'),planId:z.uuid(),optionId:z.uuid(),provisionalReason:z.string().max(400).nullable()}),
 z.strictObject({type:z.literal('CONFIRM_SELECTED'),planId:z.uuid(),value:z.enum(['CONFIRMED','DECLINED'])}),
 z.strictObject({type:z.literal('EDIT_OPTION'),planId:z.uuid(),optionId:z.uuid(),patch:z.strictObject({title:z.string().min(1).max(160),startLocal:z.string().max(32),timeZone:z.string().max(80)})}),
 z.strictObject({type:z.literal('START_COLLECTION'),planId:z.uuid()}),
 // Kept explicit, rejected with a typed 422 until the owned-option UI is integrated.
 z.strictObject({type:z.literal('CREATE_OWNED_OPTION'),scope,title:text,startLocal:text,timeZone:text,address:text,priceNote:text})
]);
export const envelopeSchema=z.strictObject({contract:z.literal(CONTRACT),idempotencyKey:z.uuid(),expected:revision.nullable(),command:commandSchema});
