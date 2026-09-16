import type {Plan} from '../contracts/domain.ts';
import {current} from './plan.ts';
import {requireThat} from './errors.ts';
export type NoticePurpose='SELECTION'|'TERMS_CHANGED'|'COMMITMENT_CHANGED'|'CANCELLATION'|'REMINDER'|'WELCOME';
const lifetimeMs=3600000;
function start(p:Plan):number|null {
 const o=p.options.find(o=>o.optionId===p.selectedOptionId);
 const t=o?current(o).terms.startsAt:null;
 return t!==null&&Number.isFinite(Date.parse(t))?Date.parse(t):null;
}
/** No purpose can renew an expired ask. Cancellation is information, not a new consent request. */
export function noticeExpiry(p:Plan,purpose:NoticePurpose,now:string):string|null {
 const n=Date.parse(now);requireThat(Number.isFinite(n),'UTC_INSTANT');
 let end=n+lifetimeMs;
 if(purpose==='SELECTION'||purpose==='REMINDER')end=Math.min(end,Date.parse(p.commitmentDeadline));
 const event=start(p);
 if(event!==null)end=Math.min(end,event);
 return end>n?new Date(end).toISOString():null;
}
export function noticeStillCurrent(p:Plan,purpose:string,selection:number|null,configuration:number|null):boolean {
 if(purpose==='CANCELLATION')return p.phase==='CANCELLED';
 if(p.phase==='CANCELLED'||p.phase==='CLOSED')return false;
 if(purpose==='SELECTION'||purpose==='REMINDER')return p.phase==='SELECTED'&&p.selectionRevision===selection;
 if(purpose==='TERMS_CHANGED')return p.configRevision===configuration&&p.selectionRevision===selection;
 if(purpose==='COMMITMENT_CHANGED')return p.phase==='SELECTED'&&p.selectionRevision===selection;
 return false; // legacy/unknown purposes cannot silently become a fresh invitation.
}
export function purposeForCommand(kind:string):NoticePurpose|null {
 switch(kind){case 'SELECT':return 'SELECTION';case 'EDIT_OPTION':return 'TERMS_CHANGED';case 'COMMIT':return 'COMMITMENT_CHANGED';case 'CANCEL':return 'CANCELLATION';default:return null;}
}
