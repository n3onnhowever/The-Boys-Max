import type { CatalogView, SearchDraft } from '../port/contracts.ts';
import { catalogToSearchViewModel } from '../view-model/search.ts';
import { SearchScreen } from './SearchScreen.tsx';
import {useEffect,useState} from 'react';
import {api} from '../../client.ts';
import {useCatalogSaved} from './useCatalogSaved.ts';
import type {SmartProposal} from '../../../../modules/ai/smart-occasion.ts';

/** The runtime supplies actions and server data to the approved Search screen. */
export function RuntimeSearchScreen({ view, busy, error, onRetry, onApply, onOpen, onBack, onNavigate, onNotifications, onCity, searchText, onSearchText }: {
  view: CatalogView; busy: boolean; onApply: (draft: SearchDraft) => void;
  error: string | null; onRetry: () => void;
  onOpen: (id: string) => void; onBack: () => void; onNavigate: (id: string) => void;
  onNotifications?:()=>void; onCity?:()=>void;
  searchText?:string;onSearchText?:(value:string)=>void;
}) {
  const [city,setCity]=useState<string|null>(null);
  const [smart,setSmart]=useState<(SmartProposal&{proposalId:string;review:{dateFrom:string|null;dateTo:string|null}})|null>(null);
  const [smartError,setSmartError]=useState<string|null>(null);
  const [smartBusy,setSmartBusy]=useState(false);
  const cardSave=useCatalogSaved(view.events);
  useEffect(()=>{let active=true;void api<{city:string}>('/api/v1/me/preferences').then(x=>{if(active)setCity(x.city)}).catch(()=>{});return()=>{active=false}},[]);
  const supported=city==='Москва';
  const model=catalogToSearchViewModel(view);
  const propose=async()=>{if(!searchText?.trim())return;setSmartBusy(true);setSmartError(null);setSmart(null);
    try{const result=await api<{state:'REVIEW'|'DISABLED'|'ERROR';code?:string;proposalId?:string;schema_version?:SmartProposal['schema_version'];draft?:SmartProposal['draft'];clarification?:SmartProposal['clarification'];review?:{dateFrom:string|null;dateTo:string|null}}>('/api/v1/ai/smart-occasion/propose',{text:searchText.trim()});
      if(result.state==='REVIEW'&&result.proposalId&&result.schema_version&&result.draft&&result.review)setSmart({proposalId:result.proposalId,schema_version:result.schema_version,draft:result.draft,clarification:result.clarification??null,review:result.review});
      else setSmartError(result.code==='AI_DISABLED'?'ИИ-подбор пока недоступен. Используйте обычные фильтры.':result.code==='AI_RATE_LIMIT'?'Лимит запросов исчерпан. Используйте обычный поиск.':'Не удалось разобрать запрос. Используйте обычные фильтры.');
    }catch{setSmartError('Не удалось разобрать запрос. Используйте обычные фильтры.')}finally{setSmartBusy(false)};
  };
  const accept=async(basis:'PER_PERSON'|'GROUP_TOTAL'|null)=>{if(!smart)return;setSmartBusy(true);setSmartError(null);
    try{const result=await api<{searchDraft:SearchDraft}>('/api/v1/ai/smart-occasion/accept',{proposalId:smart.proposalId,budgetBasis:basis});
      onSearchText?.('');setSmart(null);onApply(result.searchDraft);
    }catch{setSmartError('Предложение устарело или требует уточнения. Повторите запрос.')}finally{setSmartBusy(false)};
  };
  return <SearchScreen model={supported?model:{...model,events:[],resultCountLabel:'Подтверждённых событий нет'}} onBack={onBack} onNavigate={onNavigate} onEventOpen={supported?onOpen:undefined} city={city??'Город'} onNotifications={onNotifications} onCity={onCity} searchText={searchText} onSearchText={onSearchText} savedIds={cardSave.savedIds} canSave={cardSave.canSave} onSave={id=>void cardSave.toggle(id)} saveError={cardSave.error}
    smart={{proposal:smart,error:smartError,busy:smartBusy,onPropose:propose,onAccept:accept,onDismiss:()=>{setSmart(null);setSmartError(null)}}}
    cityLoading={city===null} unsupportedCity={city&&!supported?city:undefined}
    runtime={{ query: view.query, busy, error, onRetry, onApply }} />;
}
