export type WritablePreferences={city:string;interests:string[];budgetRub:number|null;radiusKm:number;notificationsEnabled:boolean;preferredTime:'ANY'|'MORNING'|'DAY'|'EVENING'|'NIGHT'};
export type VersionedPreferences=WritablePreferences&{version:number};

export function preferenceWritePayload(value:VersionedPreferences):WritablePreferences&{expectedVersion:number}{
 return {city:value.city,interests:value.interests,budgetRub:value.budgetRub,radiusKm:value.radiusKm,notificationsEnabled:value.notificationsEnabled,preferredTime:value.preferredTime,expectedVersion:value.version};
}

export const preferenceConflictMessage='Настройки изменены в другой сессии. Ваш черновик сохранён. Загрузите актуальные настройки, затем при желании примените свой выбор снова.';
/** One editor owns its draft and base version, independent of background reads. */
export function createPreferenceEditor(field:keyof WritablePreferences,read:()=>Promise<VersionedPreferences>,write:(payload:ReturnType<typeof preferenceWritePayload>)=>Promise<VersionedPreferences>){
 let state:{draft:VersionedPreferences|null;current:VersionedPreferences|null;preserved:VersionedPreferences|null;pending:boolean;conflict:boolean;error:string;notice:string}={draft:null,current:null,preserved:null,pending:false,conflict:false,error:'',notice:''};
 const listeners=new Set<()=>void>();
 const update=(patch:Partial<typeof state>)=>{state={...state,...patch};for(const listener of listeners)listener()};
 const load=async(replace:boolean)=>{
  if(state.pending)return;update({pending:true});
  try{
   const current=await read();
   update({current,draft:replace?current:state.draft??current,...(replace?{preserved:state.preserved??state.draft,conflict:false,notice:'Сохранённые настройки загружены. Можно повторно применить свой выбор или изменить настройки вручную.'}:{}),error:!replace&&state.conflict?preferenceConflictMessage:''});
  }catch{update({error:'Не удалось загрузить предпочтения. Попробуйте ещё раз.'})}finally{update({pending:false})}
 };
 return {
  getSnapshot:()=>state,
  subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}},
  load:()=>load(false),reloadSaved:()=>load(true),
  edit:(draft:VersionedPreferences)=>{if(!state.pending)update({draft})},
  reapply:()=>{
   if(state.pending||!state.preserved||!state.draft)return;
   // Only the choice edited by this screen is reapplied, after an explicit click.
   update({draft:{...state.draft,[field]:state.preserved[field]},preserved:null,notice:'Ваш выбор восстановлен в черновике. Проверьте его и нажмите «Сохранить».'});
  },
  save:async()=>{
   if(state.pending||state.conflict||!state.draft)return false;
   const draft=state.draft;update({pending:true,error:''});
   try{const current=await write(preferenceWritePayload(draft));update({current,draft:current,preserved:null,notice:''});return true}
   catch(error){const conflict=error instanceof Error&&error.message==='PREFERENCES_VERSION_CONFLICT';update({conflict,error:conflict?preferenceConflictMessage:'Не удалось сохранить. Проверьте соединение и попробуйте ещё раз.'});return false}
   finally{update({pending:false})}
  }
 };
}

export function calendarEventUrl(event:{title:string;startsAt:string;endsAt:string|null;place:string|null;note:string|null}):string{
 const start=new Date(event.startsAt);
 if(!Number.isFinite(start.getTime()))throw new Error('CALENDAR_DATE_INVALID');
 const parsedEnd=event.endsAt?new Date(event.endsAt):null;
 const end=parsedEnd&&Number.isFinite(parsedEnd.getTime())&&parsedEnd>start?parsedEnd:new Date(start.getTime()+3600000);
 const stamp=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const url=new URL('https://calendar.google.com/calendar/r/eventedit');
 url.searchParams.set('action','TEMPLATE');
 url.searchParams.set('dates',`${stamp(start)}/${stamp(end)}`);
 url.searchParams.set('text',event.title);
 if(event.place)url.searchParams.set('location',event.place);
 if(event.note)url.searchParams.set('details',event.note);
 return url.href;
}
