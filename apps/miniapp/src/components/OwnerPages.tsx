import {useEffect,useState,type FormEvent,type ReactNode} from 'react';
import {api,apiWrite} from '../../client.ts';
import {AppViewport,Screen} from './AppShell.tsx';
import {BottomNav} from './BottomNav.tsx';
import {Icon} from './Icon.tsx';
import {ProfileScreen} from './ProfileScreen.tsx';
import {MyPlansScreen} from './MyPlansScreen.tsx';
import {PlanDetailScreen} from './PlanDetailScreen.tsx';
import type {ProfileViewModel} from '../view-model/profile.ts';
import type {DiscussionMessageViewModel,MyPlansViewModel,ParticipantViewModel,PlanDetailViewModel,PlanListItemViewModel} from '../view-model/plans.ts';

type Preferences={city:string;interests:string[];budgetRub:number|null;radiusKm:number;notificationsEnabled:boolean};
type Actor={id:string;displayName:string};
type Friend={id:string;name:string;state:string;direction:string};
type Notification={id:string;kind:string;title:string;planId:string|null;inviteRef:string|null;read:boolean;createdAt:string};
type Plan={planId:string;title:string;stateVersion:number;phase:string;capabilities:{canManage:boolean};rule:{kind:'ALL'|'MIN';n?:number};decisionDeadline:string;options:{optionId:string;terms:{title:string;startsAt:string|null;place:string|null}}[];slots:{slotId:string;label:string;required:boolean;actorId:string|null;state:string}[]};
type Message={id:string;senderId:string;sender:string;text:string;createdAt:string};

function Frame({title,active='profile',onNavigate,children}: {title:string;active?:string;onNavigate:(id:string)=>void;children:ReactNode}){
 return <AppViewport><Screen className="owner-page"><header className="profile-header"><button type="button" aria-label="Назад" onClick={()=>onNavigate('profile')}><Icon name="back" /></button><h1>{title}</h1><span /></header><div className="owner-content">{children}</div></Screen><BottomNav active={active} onSelect={onNavigate}/></AppViewport>;
}
function Loading({label='Загружаем…'}:{label?:string}){return <p role="status">{label}</p>}
function Failure({retry}:{retry:()=>void}){return <p role="alert">Не удалось загрузить данные. <button type="button" onClick={retry}>Повторить</button></p>}

export function ProfileRuntime({onNavigate,onSaved,onSettings,onNotifications}:{onNavigate:(id:string)=>void;onSaved:()=>void;onSettings:()=>void;onNotifications:()=>void}){
 const [data,setData]=useState<{actor:Actor;prefs:Preferences}|null>(null),[failed,setFailed]=useState(false),[tick,setTick]=useState(0);
 useEffect(()=>{let live=true;Promise.all([api<{actor:Actor}>('/api/v1/session'),api<Preferences>('/api/v1/me/preferences')]).then(([session,prefs])=>{if(live)setData({actor:session.actor,prefs})}).catch(()=>{if(live)setFailed(true)});return()=>{live=false}},[tick]);
 if(!data)return <Frame title="Профиль" onNavigate={onNavigate}>{failed?<Failure retry={()=>{setFailed(false);setTick(x=>x+1)}}/>:<Loading/>}</Frame>;
 const p=data.prefs;
 const model:ProfileViewModel={provenance:'SERVER_ADAPTER',persistence:'UNAVAILABLE',capabilities:{identityEditing:'UNAVAILABLE',preferencePersistence:'UNAVAILABLE',externalAccountLinking:'UNAVAILABLE'},title:'Профиль',name:data.actor.displayName,city:p.city,avatar:'',avatarAlt:'',
  preferenceSections:[{id:'interests',title:'Мои интересы',chips:p.interests.map(x=>({id:x,label:x}))},{id:'categories',title:'Любимые категории',chips:[]}],
  preferenceRows:[{id:'budget',label:'Бюджет на события',value:p.budgetRub===null?'Не задан':`До ${p.budgetRub} ₽`,icon:'wallet'},{id:'time',label:'Радиус поиска',value:`${p.radiusKm} км`,icon:'clock'},{id:'notifications',label:'Уведомления',value:p.notificationsEnabled?'Включены':'Выключены',icon:'bell'}],contacts:[]};
 return <ProfileScreen model={model} onNavigate={onNavigate} onSavedOpen={onSaved} onSettings={onSettings} onNotifications={onNotifications}/>;
}

export function SettingsRuntime({onNavigate}:{onNavigate:(id:string)=>void}){
 const [value,setValue]=useState<Preferences|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[tick,setTick]=useState(0);
 useEffect(()=>{let live=true;api<Preferences>('/api/v1/me/preferences').then(x=>{if(live)setValue(x)}).catch(()=>{if(live)setError('Не удалось загрузить настройки')});return()=>{live=false}},[tick]);
 const save=async(e:FormEvent)=>{e.preventDefault();if(!value)return;setBusy(true);setError('');try{setValue(await apiWrite<Preferences>('PUT','/api/v1/me/preferences',value));onNavigate('profile')}catch{setError('Не удалось сохранить настройки. Повторите попытку.')}finally{setBusy(false)}};
 return <Frame title="Настройки" onNavigate={onNavigate}>{!value?(error?<Failure retry={()=>{setError('');setTick(x=>x+1)}}/>:<Loading/>):<form className="owner-form" onSubmit={e=>void save(e)}>
  <label>Город<select value={value.city} onChange={e=>setValue({...value,city:e.target.value})}><option>Москва</option><option>Санкт-Петербург</option><option>Другой город</option></select></label>
  {value.city!=='Москва'&&<p role="status">Подтверждённый каталог сейчас доступен только для Москвы. Для этого города результаты не заявлены.</p>}
  <label>Интересы<input value={value.interests.join(', ')} onChange={e=>setValue({...value,interests:e.target.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,20)})} placeholder="Кино, музыка, выставки" /></label>
  <label>Бюджет, ₽<input type="number" min="0" max="1000000" value={value.budgetRub??''} onChange={e=>setValue({...value,budgetRub:e.target.value===''?null:Number(e.target.value)})}/></label>
  <label>Радиус поиска, км<input type="number" min="1" max="100" value={value.radiusKm} onChange={e=>setValue({...value,radiusKm:Number(e.target.value)})}/></label>
  <label className="owner-check"><input type="checkbox" checked={value.notificationsEnabled} onChange={e=>setValue({...value,notificationsEnabled:e.target.checked})}/>Уведомления о планах и сообщениях</label>
  {error&&<p role="alert">{error}</p>}<button className="detail-primary-action" disabled={busy} type="submit">Сохранить</button>
 </form>}</Frame>;
}

export function FriendsRuntime({onNavigate}:{onNavigate:(id:string)=>void}){
 const [friends,setFriends]=useState<Friend[]|null>(null),[actor,setActor]=useState<Actor|null>(null),[target,setTarget]=useState(''),[error,setError]=useState(''),[copied,setCopied]=useState(false),[tick,setTick]=useState(0);
 useEffect(()=>{Promise.all([api<{items:Friend[]}>('/api/v1/me/friends'),api<{actor:Actor}>('/api/v1/session')]).then(([a,b])=>{setFriends(a.items);setActor(b.actor)}).catch(()=>setError('Не удалось загрузить друзей'))},[tick]);
 const add=async(e:FormEvent)=>{e.preventDefault();setError('');try{await apiWrite('POST','/api/v1/me/friends',{actorId:target.trim()});setTarget('');setTick(x=>x+1)}catch{setError('Не удалось отправить запрос. Проверьте код пользователя.')}};
 return <Frame title="Друзья" active="friends" onNavigate={onNavigate}>
  <p>Ваш код для приглашения: <code>{actor?.id??'…'}</code></p>
  {actor&&<button type="button" onClick={()=>{if(!navigator.clipboard){setError('Буфер обмена недоступен. Скопируйте код вручную.');return}void navigator.clipboard.writeText(actor.id).then(()=>setCopied(true)).catch(()=>setError('Не удалось скопировать код.'))}}>Скопировать мой код</button>}{copied&&<p role="status">Код скопирован</p>}
  <form className="owner-form" onSubmit={e=>void add(e)}><label>Код друга<input value={target} onChange={e=>setTarget(e.target.value)} placeholder="UUID пользователя" required /></label><button type="submit">Добавить друга</button></form>
  {error&&<p role="alert">{error}</p>}{!friends&&!error?<Loading/>:friends?.length===0?<p role="status">Друзей пока нет. Отправьте приглашение по коду.</p>:<ul className="owner-list">{friends?.map(f=><li key={f.id}><strong>{f.name}</strong><span>{f.state==='ACCEPTED'?'Друг':f.direction==='INCOMING'?'Приглашает вас':'Ожидает ответа'}</span>{f.state==='PENDING'&&f.direction==='INCOMING'&&<button onClick={()=>void apiWrite('POST',`/api/v1/me/friends/${f.id}/accept`,{}).then(()=>setTick(x=>x+1)).catch(()=>setError('Не удалось принять приглашение'))}>Принять</button>}</li>)}</ul>}
 </Frame>;
}

export function NotificationsRuntime({onNavigate,onOpenPlan,onOpenInvite}:{onNavigate:(id:string)=>void;onOpenPlan:(id:string)=>void;onOpenInvite:(ref:string)=>void}){
 const [items,setItems]=useState<Notification[]|null>(null),[error,setError]=useState(''),[tick,setTick]=useState(0);
 useEffect(()=>{api<{items:Notification[]}>('/api/v1/me/notifications').then(x=>setItems(x.items)).catch(()=>setError('Не удалось загрузить уведомления'))},[tick]);
 const open=(n:Notification)=>{void apiWrite('POST',`/api/v1/me/notifications/${n.id}/read`,{}).then(()=>{if(n.inviteRef)onOpenInvite(n.inviteRef);else if(n.planId)onOpenPlan(n.planId);else onNavigate('friends')}).catch(()=>setError('Не удалось открыть уведомление'))};
 return <Frame title="Уведомления" onNavigate={onNavigate}><button type="button" onClick={()=>setTick(x=>x+1)}>Обновить</button>{error&&<p role="alert">{error}</p>}{!items&&!error?<Loading/>:items?.length===0?<p role="status">Уведомлений пока нет</p>:<ul className="owner-list">{items?.map(n=><li key={n.id}><button type="button" onClick={()=>open(n)}><strong>{n.title}</strong><span>{new Date(n.createdAt).toLocaleString('ru-RU')}</span>{!n.read&&<span>Новое</span>}</button></li>)}</ul>}</Frame>;
}

const currentParticipant=(actor:Actor,organizer:boolean):ParticipantViewModel=>({id:actor.id,name:actor.displayName,initials:actor.displayName.slice(0,1),tone:'ember',status:organizer?'HOST':'ACTIVE',isCurrentUser:true});
function planEvent(plan:Plan){const option=plan.options[0];return {id:plan.planId,title:option?.terms.title??plan.title,dateTimeLabel:option?.terms.startsAt?new Date(option.terms.startsAt).toLocaleString('ru-RU'):'Дата уточняется',venue:option?.terms.place??'Место уточняется',artwork:'',artworkAlt:''};}
export function PlansRuntime({onNavigate,selected,onSelect}:{onNavigate:(id:string)=>void;selected:string|null;onSelect:(id:string|null)=>void}){
 const [plans,setPlans]=useState<Plan[]|null>(null),[actor,setActor]=useState<Actor|null>(null),[messages,setMessages]=useState<Message[]>([]),[friends,setFriends]=useState<Friend[]>([]),[joins,setJoins]=useState<{actorId:string;state:string}[]>([]),[error,setError]=useState(''),[tick,setTick]=useState(0),[inviteOpen,setInviteOpen]=useState(false),[inviteUrl,setInviteUrl]=useState('');
 useEffect(()=>{Promise.all([api<{items:{id:string}[]}>('/api/v1/plans?limit=50'),api<{actor:Actor}>('/api/v1/session'),api<{items:Friend[]}>('/api/v1/me/friends')]).then(async([list,session,fs])=>{const detail=await Promise.all(list.items.map(p=>api<Plan>(`/api/v1/plans/${p.id}`)));setPlans(detail);setActor(session.actor);setFriends(fs.items.filter(f=>f.state==='ACCEPTED'))}).catch(()=>setError('Не удалось загрузить планы'))},[tick]);
 const refreshMessages=()=>{if(selected)void api<{items:Message[]}>(`/api/v1/plans/${selected}/messages`).then(x=>setMessages(x.items)).catch(()=>setError('Не удалось загрузить сообщения'))};
 useEffect(()=>{refreshMessages()},[selected]);
 useEffect(()=>{if(selected)void api<{actorId:string;state:string}[]>(`/api/v1/plans/${selected}/joins`).then(setJoins).catch(()=>setJoins([]))},[selected,tick]);
 const plan=plans?.find(p=>p.planId===selected);
 const share=async()=>{if(!plan)return;try{const invitation=await api<{inviteRef:string}>(`/api/v1/plans/${plan.planId}/invites`,{expectedStateVersion:plan.stateVersion},crypto.randomUUID());const url=new URL(location.origin);url.searchParams.set('invite',invitation.inviteRef);await navigator.clipboard.writeText(url.href);setInviteUrl(url.href)}catch{setError('Не удалось создать ссылку. Повторите попытку.')}};
 const invite=async(friend:Friend)=>{if(!plan)return;try{await apiWrite('POST',`/api/v1/plans/${plan.planId}/invite-friend`,{friendId:friend.id,expectedStateVersion:plan.stateVersion});setInviteOpen(false);setError('Приглашение отправлено')}catch{setError('Не удалось пригласить друга')}};
 const approve=async(friendId:string)=>{if(!plan)return;const slot=plan.slots.find(x=>x.state==='UNBOUND');if(!slot){setError('В плане нет свободного места');return;}
  try{await api(`/api/v1/plans/${plan.planId}/commands`,{kind:'ROSTER',expectedStateVersion:plan.stateVersion,
   slots:plan.slots.map(x=>x.slotId===slot.slotId?{...x,actorId:friendId,state:'ACTIVE'}:x),rule:plan.rule,decisionDeadline:plan.decisionDeadline,reason:'Принят запрос участника'},crypto.randomUUID());
   setInviteOpen(false);setTick(x=>x+1);setError('Участник добавлен в план');}catch{setError('Не удалось одобрить запрос. Обновите план и повторите попытку.')}};
 if(!plans||!actor)return <Frame title="Мои планы" active="plan" onNavigate={onNavigate}>{error?<Failure retry={()=>{setError('');setTick(x=>x+1)}}/>:<Loading/>}</Frame>;
 if(plan){const participant=currentParticipant(actor,plan.capabilities.canManage);const model:PlanDetailViewModel={provenance:'SERVER_ADAPTER',title:plan.title,event:planEvent(plan),statusLabel:({DRAFT:'Черновик',COLLECTING:'Собираем ответы',SELECTED:'Вариант выбран',CLOSED:'Завершён',CANCELLED:'Отменён'} as Record<string,string>)[plan.phase]??plan.phase,personalPlan:{title:plan.title,dateTimeLabel:planEvent(plan).dateTimeLabel,venue:planEvent(plan).venue,rsvp:'PENDING'},participants:[participant,...plan.slots.filter(x=>x.actorId&&x.actorId!==actor.id).map(x=>({id:x.actorId!,name:friends.find(f=>f.id===x.actorId)?.name??'Участник',initials:'У',tone:'sage' as const,status:'ACTIVE' as const}))],discussion:[]};
  const shown:DiscussionMessageViewModel[]=messages.map(m=>({id:m.id,author:m.senderId===actor.id?participant:{id:m.senderId,name:m.sender,initials:m.sender.slice(0,1),tone:'sage',status:'THINKING'},timeLabel:new Date(m.createdAt).toLocaleString('ru-RU'),text:m.text}));
  return <><PlanDetailScreen model={model} onBack={()=>onSelect(null)} onNavigate={onNavigate} onInvite={plan.capabilities.canManage?()=>setInviteOpen(true):undefined} onShare={plan.capabilities.canManage?()=>void share():undefined} runtimeMessages={shown} onRefreshMessages={refreshMessages} onSendMessage={async text=>{await apiWrite('POST',`/api/v1/plans/${plan.planId}/messages`,{text});refreshMessages()}}/>
   {inviteOpen&&<div className="owner-overlay" role="dialog" aria-modal="true"><h2>Участники и приглашения</h2><button onClick={()=>setInviteOpen(false)}>Закрыть</button>{joins.filter(x=>x.state==='PENDING').map(j=><button key={j.actorId} onClick={()=>void approve(j.actorId)}>Принять запрос: {friends.find(f=>f.id===j.actorId)?.name??'Пользователь'}</button>)}{friends.length?friends.map(f=><button key={f.id} onClick={()=>void invite(f)}>{f.name}</button>):<p>Добавьте друга, затем пригласите его в план.</p>}<button onClick={()=>void share()}>Скопировать ссылку</button></div>}
   {inviteUrl&&<p className="owner-toast" role="status">Ссылка на план скопирована</p>}{error&&<p className="owner-toast" role="alert">{error}</p>}</>;
 }
 const rows:PlanListItemViewModel[]=plans.map(p=>({id:p.planId,event:planEvent(p),participants:[currentParticipant(actor,p.capabilities.canManage)],additionalParticipantCount:p.slots.filter(x=>x.actorId&&x.actorId!==actor.id).length,rsvp:'PENDING'}));
 const model:MyPlansViewModel={provenance:'SERVER_ADAPTER',title:'Мои планы',nearestPlanId:rows[0]?.id??'',plans:rows};
 return <MyPlansScreen model={model} onAddPlan={()=>onNavigate('search')} onPlanOpen={id=>onSelect(id)} onNavigate={onNavigate}/>;
}
