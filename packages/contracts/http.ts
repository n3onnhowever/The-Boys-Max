import {parsePrice} from '../../modules/search/core/price.ts';
import {z} from 'zod';
const uuid=z.uuid(),str=z.string(),instant=z.iso.datetime({offset:false});
const minor=str.regex(/^(0|[1-9]\d{0,17})$/).nullable();
export const amountSchema=z.strictObject({kind:z.enum(['FREE','EXACT','RANGE']),exact_minor:minor,min_minor:minor,max_minor:minor});
const basis=z.enum(['PER_PERSON','GROUP_TOTAL','UNKNOWN']),currency=str.regex(/^[A-Z]{3}$/).nullable();
export const moneySchema=z.discriminatedUnion('knownness',[
 z.strictObject({knownness:z.literal('UNKNOWN'),basis,currency,amount:z.null()}),
 z.strictObject({knownness:z.literal('KNOWN'),basis,currency,amount:amountSchema})]);
const warningSchema=z.strictObject({code:str,field:str,message:str});
const extraSchema=z.strictObject({label:str,required:z.boolean(),price:moneySchema,source_field:str});
const feeMode=z.enum(['UNKNOWN','NONE','INCLUDED','ITEMIZED']);
const quoteSchema=z.strictObject({kind:z.enum(['UNKNOWN','FREE','EXACT','RANGE','FROM','TEXT']),basis,currency,
 exact_minor:minor.optional(),min_minor:minor.optional(),max_minor:minor.optional(),raw_label:str.nullable().optional(),source_field:str.nullable().optional(),
 fees_known:z.boolean(),fee_mode:feeMode,fee_evidence_ref:str.nullable().optional(),extras:z.array(extraSchema),warnings:z.array(warningSchema)});
export const priceSchema=z.strictObject({schema_version:z.literal('max.price/3-candidate'),source_quote:quoteSchema,
 quoted_amount_role:z.enum(['BASE','ALL_IN']),base_price:moneySchema,fees_known:z.boolean(),
 mandatory_fees:z.strictObject({mode:feeMode,items:z.array(extraSchema),evidence_ref:str.nullable()}),total_price:moneySchema,
 warnings:z.array(warningSchema),provenance:z.strictObject({observation_id:str,group_size_at_quote:z.number().int().positive().nullable()})})
 .superRefine((p,ctx)=>{try{parsePrice(p);}catch{ctx.addIssue({code:'custom',message:'PRICE_CANONICAL_MISMATCH'});}});
export const termsSchema=z.strictObject({title:str.min(1).max(160),activityIdentity:str.min(1).max(160),startsAt:instant.nullable(),endsAt:instant.nullable(),timeZone:str.min(1).max(80),place:str.max(2000).nullable(),participationUrl:z.url().max(2000).nullable(),obligations:str.max(2000),price:priceSchema,warnings:z.array(str.max(1600)).max(300)});
export const slotSchema=z.strictObject({slotId:uuid,label:str.min(1).max(100),required:z.boolean(),actorId:uuid.nullable(),state:z.enum(['UNBOUND','ACTIVE','LEFT'])});
const rule=z.discriminatedUnion('kind',[z.strictObject({kind:z.literal('ALL')}),z.strictObject({kind:z.literal('MIN'),n:z.number().int().min(1).max(50)})]);
const revision=z.number().int().min(1).max(2147483646),common={expectedStateVersion:revision},reason=str.min(1).max(400);
export const createSchema=z.strictObject({title:str.min(1).max(160),slots:z.array(slotSchema).min(1).max(50),rule,decisionDeadline:instant,commitmentDeadline:instant});
export const commandSchema=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('ADD_OPTION'),...common,optionId:uuid,snapshotId:uuid,terms:termsSchema}),
 z.strictObject({kind:z.literal('EDIT_OPTION'),...common,optionId:uuid,snapshotId:uuid,terms:termsSchema,cosmetic:z.boolean(),reason}),
 z.strictObject({kind:z.literal('START'),...common}),
 z.strictObject({kind:z.literal('RESPOND'),...common,optionId:uuid,termsRevision:revision,value:z.enum(['CAN','CANNOT','UNKNOWN'])}),
 z.strictObject({kind:z.literal('SELECT'),...common,optionId:uuid,allowProvisional:z.boolean(),reason:str.max(400)}),
 z.strictObject({kind:z.literal('COMMIT'),...common,selectionRevision:revision,value:z.enum(['CONFIRMED','DECLINED'])}),
 z.strictObject({kind:z.literal('ROSTER'),...common,slots:z.array(slotSchema).min(1).max(50),rule,decisionDeadline:instant,reason}),
 z.strictObject({kind:z.literal('EXTEND'),...common,decisionDeadline:instant,commitmentDeadline:instant,reason}),
 z.strictObject({kind:z.literal('CANCEL'),...common,reason})]);
// Preserve Origin/Content-Type/CSRF headers; stripping unknown headers would break authenticated writes.
export const idHeaders=z.looseObject({'idempotency-key':uuid});
export const planParams=z.strictObject({planId:uuid});
export const errorSchema=z.strictObject({error:z.strictObject({code:str,requestId:str})});
export const errors={400:errorSchema,401:errorSchema,403:errorSchema,404:errorSchema,409:errorSchema,413:errorSchema,415:errorSchema,422:errorSchema,429:errorSchema,500:errorSchema,503:errorSchema};
export const receiptSchema=z.strictObject({planId:uuid,stateVersion:revision,status:z.literal('APPLIED'),commandId:uuid});
export const sessionSchema=z.strictObject({actor:z.strictObject({id:uuid,displayName:str}),csrfToken:str,absoluteExpiresAt:instant,idleTtlSeconds:z.literal(900)});
export const responseSchema=z.strictObject({actorId:uuid,slotId:uuid,optionId:uuid,answeredSnapshotId:uuid,termsRevision:revision,value:z.enum(['CAN','CANNOT','UNKNOWN']),acceptedAt:str});
export const commitmentSchema=z.strictObject({actorId:uuid,slotId:uuid,selectionRevision:revision,selectedSnapshotId:uuid,value:z.enum(['CONFIRMED','DECLINED']),acceptedAt:str});
export const viewSchema=z.strictObject({planId:uuid,title:str,stateVersion:revision,configRevision:revision,electorateVersion:z.number().int().min(0),selectionRevision:z.number().int().min(0),phase:z.enum(['DRAFT','COLLECTING','SELECTED','CLOSED','CANCELLED']),selectedOptionId:uuid.nullable(),rule,decisionDeadline:instant,commitmentDeadline:instant,
 options:z.array(z.strictObject({optionId:uuid,snapshotId:uuid,termsRevision:revision,presentationRevision:revision,terms:termsSchema,source:z.record(z.string(),z.unknown()).optional(),feasibility:z.strictObject({status:z.enum(['READY','PROVISIONAL','BLOCKED']),can:z.number(),unresolved:z.number(),n:z.number()})})),
 confirmation:str,capabilities:z.strictObject({canRead:z.boolean(),canPropose:z.boolean(),canManage:z.boolean(),canRespond:z.boolean()}),slots:z.array(slotSchema),responses:z.array(responseSchema),commitments:z.array(commitmentSchema)});
