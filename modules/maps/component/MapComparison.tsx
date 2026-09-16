import {useEffect,useMemo,useRef,useState,type ReactElement} from 'react';
import {preparePlace,point,type GeoMapView,type Point,type PreparedPlace} from './core/geo.ts';
import {pointUrl,routeUrl,searchUrl,requestExternalOpen,type Bridge} from './core/links.ts';
import {initialMapState,MAP_TEXT,type MapState,type MapGate} from './core/state.ts';
import type {MapHandle} from './leaflet-renderer.ts';
import './map.css';
export type MapOption=Readonly<{uiKey:string;view:GeoMapView}>;
export interface MapComparisonProps {
  /** Authorized read projection only. Never pass outsider/pending plan data to the client. */
  options:readonly MapOption[];
  selectedKey:string|null;
  /** Local UI focus only; NOT choosing a domain READY option or committing consent. */
  onHighlight:(uiKey:string)=>void;
  onBack:()=>void;
  gate?:MapGate;
  bridge?:Bridge;
  /** Device/privacy gate. Defaults OFF, preserving inherited two-point route admission. */
  allowOriginRoute?:boolean;
  /** Owner 23 router owns a stack; this component must not hide another screen's BackButton. */
  registerBack?:(handler:()=>void)=>()=>void;
  /** Re-read current authorized snapshot after external return. Never recreate a snapshot here. */
  onResume?:()=>Promise<void>;
}
type Row={key:string;ordinal:number;place:PreparedPlace|null};
type GeoState='IDLE'|'PENDING'|'READY'|'DENIED'|'UNAVAILABLE'|'TIMEOUT';
const GEO_TEXT:Record<GeoState,string>={IDLE:'Геопозиция не нужна для просмотра места.',PENDING:'Запрашиваем начало маршрута…',READY:'Начало получено; передадим его только после нажатия на маршрут.',DENIED:'Геопозиция не разрешена. Укажите начало уже в Яндекс Картах.',UNAVAILABLE:'Геопозиция недоступна. Укажите начало в Яндекс Картах.',TIMEOUT:'Геопозиция не определена вовремя. Можно продолжить без неё.'};
export function MapComparison({options,selectedKey,onHighlight,onBack,gate='ADMISSION_HOLD',bridge,registerBack,onResume,allowOriginRoute=false}:MapComparisonProps):ReactElement {
  const [opened,setOpened]=useState(false),[expanded,setExpanded]=useState(false),[gestures,setGestures]=useState(false);
  const [state,setState]=useState<MapState>('IDLE'),[attempt,setAttempt]=useState(0);
  const [online,setOnline]=useState(()=>typeof navigator==='undefined'||navigator.onLine);
  const [origin,setOrigin]=useState<Point|null>(null),[geoState,setGeoState]=useState<GeoState>('IDLE');
  const [navState,setNavState]=useState(''),[copyState,setCopyState]=useState('');
  const [resumeState,setResumeState]=useState<'IDLE'|'PENDING'|'CURRENT'|'UNVERIFIED'>('IDLE');
  const canvas=useRef<HTMLDivElement>(null),map=useRef<MapHandle|null>(null),alive=useRef(true),geoGeneration=useRef(0);
  const resumeGeneration=useRef(0);
  const externalAttempt=useRef(false),wasHidden=useRef(false),opener=useRef<HTMLButtonElement>(null);
  const onHighlightRef=useRef(onHighlight);onHighlightRef.current=onHighlight;
  const rows=useMemo<readonly Row[]>(()=>{
    if(options.length<1||options.length>3||new Set(options.map(o=>o.uiKey)).size!==options.length)return [];
    return options.map((o,i)=>{try{return {key:o.uiKey,ordinal:i+1,place:preparePlace(o.view)};}catch{return {key:o.uiKey,ordinal:i+1,place:null};}});
  },[options]);
  const markers=useMemo(()=>rows.flatMap(r=>r.place?.marker?[{key:r.key,ordinal:r.ordinal,position:r.place.marker}]:[]),[rows]);
  const markerKey=JSON.stringify(markers); // Internal dependency key only; never logged or sent.
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;geoGeneration.current++;resumeGeneration.current++;};},[]);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  useEffect(()=>{
    if(!opened)return;
    let cancelled=false,handle:MapHandle|null=null;
    const first=initialMapState(gate,online,markers.length);setState(first);
    if(first!=='LOADING')return;
    void import('./leaflet-renderer.ts').then(({mountMap})=>{
      if(cancelled||!canvas.current)return;
      handle=mountMap(canvas.current,markers,s=>{if(!cancelled)setState(s);},key=>onHighlightRef.current(key));
      map.current=handle;
    }).catch(()=>{if(!cancelled)setState('RENDERER_UNAVAILABLE');});
    return()=>{cancelled=true;handle?.destroy();if(map.current===handle)map.current=null;};
    // JSON key prevents restart when only callbacks/local selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[opened,gate,online,attempt,markerKey]);
  useEffect(()=>{map.current?.gestures(gestures);},[gestures,state]);
  useEffect(()=>{map.current?.resize();},[expanded]);
  useEffect(()=>{if(!allowOriginRoute){geoGeneration.current++;setOrigin(null);setGeoState('IDLE');}},[allowOriginRoute]);
  useEffect(()=>{
    if(!opened||!registerBack)return;
    return registerBack(()=>{setOpened(false);setGestures(false);opener.current?.focus();});
  },[opened,registerBack]);
  useEffect(()=>{
    const resume=()=>{
      if(document.visibilityState==='hidden'){wasHidden.current=true;return;}
      if(!wasHidden.current||!externalAttempt.current)return;
      wasHidden.current=false;externalAttempt.current=false;setOrigin(null);setGeoState('IDLE');geoGeneration.current++;
      setNavState('Вы вернулись в приложение. Это не подтверждает открытие навигации или прибытие.');
      if(!onResume){setResumeState('UNVERIFIED');return;}
      setResumeState('PENDING');
      const generation=++resumeGeneration.current;
      // Promise.resolve().then also catches a synchronous exception in a host callback.
      void Promise.resolve().then(onResume).then(()=>{if(alive.current&&generation===resumeGeneration.current)setResumeState('CURRENT');},()=>{if(alive.current&&generation===resumeGeneration.current)setResumeState('UNVERIFIED');});
    };
    document.addEventListener('visibilitychange',resume);return()=>document.removeEventListener('visibilitychange',resume);
  },[onResume]);
  const selectOrigin=()=>{
    const generation=++geoGeneration.current;setOrigin(null);
    if(!navigator.geolocation){setGeoState('UNAVAILABLE');return;}
    setGeoState('PENDING');
    try { navigator.geolocation.getCurrentPosition(pos=>{
      if(!alive.current||generation!==geoGeneration.current)return;
      try{setOrigin(point({lat:pos.coords.latitude,lon:pos.coords.longitude}));setGeoState('READY');}catch{setGeoState('UNAVAILABLE');}
    },error=>{if(alive.current&&generation===geoGeneration.current)setGeoState(error.code===1?'DENIED':error.code===3?'TIMEOUT':'UNAVAILABLE');},
    {enableHighAccuracy:false,timeout:7000,maximumAge:0}); } catch { setGeoState('UNAVAILABLE'); }
  };
  const clearOrigin=()=>{geoGeneration.current++;setOrigin(null);setGeoState('IDLE');};
  const external=(url:string)=>{
    externalAttempt.current=true;
    const status=requestExternalOpen(url,bridge,()=>{if(alive.current)setNavState('Вызов MAX завершился ошибкой. Используйте обычную ссылку ниже.');});
    setNavState(status==='BRIDGE_REQUESTED'?'Передали запрос MAX. Открытие Яндекс Карт не подтверждено.':status==='REJECTED'?'Небезопасная ссылка отклонена.':'Используйте обычную ссылку ниже: Bridge недоступен.');
  };
  const copy=async(text:string)=>{try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text);if(alive.current)setCopyState('Адрес скопирован.');}catch{if(alive.current)setCopyState('Копирование не разрешено. Выделите адрес в поле вручную.');}};
  const stale=resumeState==='PENDING'||resumeState==='UNVERIFIED';
  return <section className="map-comparison" aria-label="Сравнение мест">
    <header><p className="map-eyebrow">МЕСТО ВСТРЕЧИ</p><h2>Где удобнее встретиться?</h2><p>До трёх вариантов на одной карте. Время в пути здесь не рассчитываем.</p></header>
    {rows.length===0?<p role="alert">Для сравнения нужны 1–3 разных варианта.</p>:null}
    <button ref={opener} type="button" aria-expanded={opened} onClick={()=>{setOpened(!opened);setGestures(false);setNavState('');}}>{opened?'Скрыть карту':'Показать карту'}</button>
    <p className="map-note">При открытии карты OSM получает IP, origin приложения и область тайлов — без названия плана, участников и личного текста встречи. Область тайлов позволяет примерно определить место. Адрес внешнему сервису передаётся только по отдельному переходу.</p>
    {opened?<div className="map-panel" data-expanded={expanded}>
      <p role="status" aria-live="polite" data-testid="map-state" data-state={state}>{MAP_TEXT[state]}</p>
      <div ref={canvas} className="map-canvas" aria-label="Карта мест" data-testid="map-canvas" />
      <div className="map-toolbar">
        <button type="button" aria-pressed={gestures} onClick={()=>setGestures(!gestures)} disabled={state!=='READY'&&state!=='PARTIAL'}>{gestures?'Выключить жесты карты':'Включить жесты карты'}</button>
        <button type="button" aria-pressed={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Обычная высота':'Развернуть по высоте'}</button>
        {['TIMEOUT','TILES_UNAVAILABLE','RENDERER_UNAVAILABLE','OFFLINE','PARTIAL'].includes(state)?<button type="button" onClick={()=>setAttempt(x=>x+1)}>Повторить по запросу</button>:null}
        <button type="button" onClick={()=>{setOpened(false);setGestures(false);opener.current?.focus();}}>Назад к вариантам</button>
      </div>
      <p className="map-note">По умолчанию карта не перехватывает прокрутку. Подпись картографического источника должна оставаться видимой.</p>
    </div>:null}
    <div className="map-options">
      {rows.map(row=>{
        const p=row.place;
        if(!p)return <article key={row.key}><h3>Вариант {row.ordinal}</h3><p role="alert">Данные места некорректны. Запросите исправление; точка не придумана.</p></article>;
        const address=[p.geo.city,p.geo.address].filter(Boolean).join(', ');
        const url=p.destination?(allowOriginRoute&&origin?routeUrl(origin,p.destination,'pd'):pointUrl(p.destination)):p.search?searchUrl(p.search.city,p.search.address):null;
        return <article key={row.key} data-selected={selectedKey===row.key}>
          <h3>{row.ordinal}. {p.geo.venue?.name??'Место уточняется'}</h3>
          <p>{address||'Адрес пока не указан'}</p>
          {p.geo.meeting_point?<p>Точка встречи: {p.geo.meeting_point}</p>:null}
          {p.warnings.map(w=><p className="map-warning" key={w}>{w}</p>)}
          <button type="button" aria-pressed={selectedKey===row.key} onClick={()=>onHighlight(row.key)}>Рассмотреть вариант {row.ordinal}</button>
          {url&&!stale?<div className="map-actions">
            <button type="button" onClick={()=>external(url)}>{p.destination?'Маршрут в Яндекс':'Найти адрес в Яндекс'}</button>
            <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={()=>{externalAttempt.current=true;setNavState('Запрошен обычный переход. Открытие не подтверждено.');}}>Обычная ссылка на Яндекс Карты</a>
            <p className="map-note">{p.destination?(origin?'Пеший маршрут по двум точкам; расчёт выполняет Яндекс.':'Откроется место. Выберите «Маршрут» и задайте начало в Яндекс Картах.'):'Это поиск по тексту, а не проверенный результат геокодирования.'}</p>
          </div>:null}
          {address?<><label>Адрес для ручного копирования<input readOnly value={address} onFocus={e=>e.currentTarget.select()}/></label><button type="button" onClick={()=>void copy(address)}>Скопировать адрес</button></>:null}
        </article>;
      })}
    </div>
    {allowOriginRoute&&rows.some(r=>r.place?.destination)&&!stale?<details><summary>Начало маршрута по геопозиции — необязательно</summary><p>Координаты будут только в памяти этой страницы. В Яндекс они попадут лишь после отдельного нажатия на маршрут, не в план и не боту.</p><button type="button" onClick={selectOrigin} disabled={geoState==='PENDING'}>Получить мою геопозицию</button><button type="button" onClick={clearOrigin}>Забыть начало маршрута</button><p role="status" data-testid="geo-state">{GEO_TEXT[geoState]}</p></details>:null}
    <p role="status" aria-live="polite">{navState}</p><p role="status">{copyState}</p>
    {resumeState==='PENDING'?<p role="status">Проверяем текущие условия после возвращения…</p>:null}
    {resumeState==='UNVERIFIED'?<p role="alert">Текущие условия не перепроверены. Вернитесь к выбору и обновите данные; переход по старому месту отключён.</p>:null}
    <button type="button" onClick={onBack}>Вернуться к выбору</button>
  </section>;
}
