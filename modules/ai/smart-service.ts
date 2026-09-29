import {randomUUID} from 'node:crypto';
import type {SmartOccasionProvider} from './port.ts';
import {SMART_INTENT_VERSION,reviewDates,smartToSearch,validateSmartProposal,type BudgetBasis,type SmartProposal} from './smart-occasion.ts';

type Stored={actor:string;session:string;proposal:SmartProposal;proposedAt:number;expires:number};
export function smartOccasionService(provider:SmartOccasionProvider|null,now:()=>number=Date.now,timeoutMs=18000){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>20000)throw new Error('AI_TIMEOUT_CONFIG');
 const proposals=new Map<string,Stored>(),quota=new Map<string,{window:number;count:number}>();
 return {
  async propose(actor:string,session:string,text:string){
   if(!provider)return {state:'DISABLED' as const,code:'AI_DISABLED'};
   if(provider.contractVersion!==SMART_INTENT_VERSION)return {state:'ERROR' as const,code:'AI_PROVIDER_VERSION'};
   if(text.length<1||text.length>240)throw new Error('AI_INPUT_LENGTH');
   const key=actor+':'+session,t=now(),q=quota.get(key);
   for(const [id,entry] of proposals)if(entry.expires<=t)proposals.delete(id);
   if(q&&t-q.window<3600000&&q.count>=10)return {state:'ERROR' as const,code:'AI_RATE_LIMIT'};
   quota.set(key,!q||t-q.window>=3600000?{window:t,count:1}:{window:q.window,count:q.count+1});
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
   let raw:unknown;
   try{raw=await Promise.race([provider.interpretSmartOccasion(text,controller.signal,{maxOutputTokens:500}),new Promise<never>((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('AI_TIMEOUT')),{once:true}))]);}
   catch(error){const code=error instanceof Error&&/^AI_[A-Z0-9_]{1,64}$/.test(error.message)?error.message:'AI_PROVIDER_FAILURE';console.warn(JSON.stringify({event:'AI_PROVIDER_FAILURE',code}));return {state:'ERROR' as const,code:code==='AI_TIMEOUT'?'AI_TIMEOUT':'AI_PROVIDER_FAILURE'};}
   finally{clearTimeout(timer);}
   let proposal:SmartProposal;
   try{if(JSON.stringify(raw).length>8192)throw new Error('AI_OUTPUT_LENGTH');proposal=validateSmartProposal(raw,text,new Date(t).toISOString());}
   catch{return {state:'ERROR' as const,code:'AI_INVALID_RESPONSE'};}
   const id=randomUUID();proposals.set(id,{actor,session,proposal,proposedAt:t,expires:t+300000});
   return {state:'REVIEW' as const,proposalId:id,...proposal,review:reviewDates(proposal,new Date(t).toISOString())};
  },
  accept(actor:string,session:string,id:string,basis:BudgetBasis|null){
   const stored=proposals.get(id);if(!stored||stored.actor!==actor||stored.session!==session||stored.expires<=now())throw new Error('AI_PROPOSAL_EXPIRED');
   const result=smartToSearch(stored.proposal,basis,new Date(stored.proposedAt).toISOString());
   proposals.delete(id);return {state:'ACCEPTED' as const,schema_version:stored.proposal.schema_version,searchDraft:result.draft};
  }
 };
}
