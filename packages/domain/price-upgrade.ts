import {randomUUID} from 'node:crypto';
import {importCanonicalV1,parsePrice} from '../../modules/search/core/price.ts';
import {CONTRACT_VERSION} from '../contracts/domain.ts';
import type {Plan,Snapshot} from '../contracts/domain.ts';
import {requireThat} from './errors.ts';
export function requireCanonicalPlan(p:Plan):void {requireThat(p.version===CONTRACT_VERSION,'PLAN_MIGRATION_REQUIRED',409);}
export function upgradePricePlan(raw:unknown):{plan:Plan;newSnapshots:Snapshot[]}|null {
 requireThat(raw!==null&&typeof raw==='object'&&!Array.isArray(raw),'PLAN_INVALID');
 const p=structuredClone(raw) as Plan;
 if(p.version===CONTRACT_VERSION)return null;
 requireThat((p as {version:string}).version==='max.backend.23.v1-candidate','PLAN_VERSION');
 const created:Snapshot[]=[];
 for(const option of p.options){
  // Legacy immutable SQL rows remain byte-for-byte unchanged. State is a canonical read projection.
  for(const s of option.snapshots){
   const wire=s.terms.price as unknown;
   s.terms.price=wire&&typeof wire==='object'&&'schema_version' in wire?parsePrice(wire):importCanonicalV1(wire,'legacy:'+s.snapshotId);
  }
  const old=option.snapshots.at(-1);requireThat(old,'SNAPSHOT_MISSING');
  const next={...structuredClone(old),snapshotId:randomUUID(),termsRevision:old.termsRevision+1,presentationRevision:old.presentationRevision+1};
  next.terms.warnings=[...new Set([...next.terms.warnings,'LEGACY_FEE_COVERAGE_UNPROVEN'])];
  option.snapshots.push(next);created.push(next);
 }
 p.version=CONTRACT_VERSION;p.configRevision++;p.stateVersion++;
 if(p.selectedOptionId!==null)p.selectionRevision++; // every prior positive confirmation is stale.
 return {plan:p,newSnapshots:created};
}
