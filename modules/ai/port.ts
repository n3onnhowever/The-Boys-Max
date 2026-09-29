import type {ApprovedFiltersV1} from '../search/port.ts';
export interface AiProvider {readonly contractVersion:string;parseIntent(text:string,signal:AbortSignal):Promise<{kind:'PROPOSAL';filters:ApprovedFiltersV1}|{kind:'CLARIFY';question:string}|{kind:'UNAVAILABLE';reason:string}>;}
/** Optional bounded interpretation method. No event facts or credentials are inputs. */
export interface SmartOccasionProvider extends AiProvider {interpretSmartOccasion(text:string,signal:AbortSignal,limits:{maxOutputTokens:number}):Promise<unknown>}
// Explicit approval of a proposal is required elsewhere. This port never changes plan roster or permission.
