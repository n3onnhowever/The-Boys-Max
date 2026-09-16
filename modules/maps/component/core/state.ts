export type MapState='IDLE'|'LOADING'|'READY'|'PARTIAL'|'OFFLINE'|'TIMEOUT'|'TILES_UNAVAILABLE'|'RENDERER_UNAVAILABLE'|'ADMISSION_HOLD'|'MISSING_KEY'|'QUOTA_EXHAUSTED'|'NO_POINTS';
export type MapGate='ALLOW'|'ADMISSION_HOLD'|'MISSING_KEY'|'QUOTA_EXHAUSTED';
export function initialMapState(gate:MapGate,online:boolean,points:number):MapState {
  if(!['ALLOW','ADMISSION_HOLD','MISSING_KEY','QUOTA_EXHAUSTED'].includes(gate))throw new TypeError('Gate');
  if(typeof online!=='boolean')throw new TypeError('Online flag');
  if(!Number.isInteger(points)||points<0||points>3)throw new RangeError('1–3 options');
  if(gate!=='ALLOW')return gate;
  if(points===0)return 'NO_POINTS';
  if(!online)return 'OFFLINE';
  return 'LOADING';
}
export function completedTiles(ok:number,failed:number):MapState {
  if(!Number.isInteger(ok)||!Number.isInteger(failed)||ok<0||failed<0)throw new TypeError('Tile counts');
  return failed>0?(ok>0?'PARTIAL':'TILES_UNAVAILABLE'):(ok>0?'READY':'TILES_UNAVAILABLE');
}
export const MAP_TEXT:Readonly<Record<MapState,string>>=Object.freeze({
  IDLE:'Карта загружается только по вашему запросу.',
  LOADING:'Загружаем карту…', READY:'Карта загружена. Сравните расположение вариантов.',
  PARTIAL:'Часть карты недоступна. Точки не подтверждают загрузку всей подложки.',
  OFFLINE:'Браузер сообщает, что сети нет. Адрес и варианты остаются доступны.',
  TIMEOUT:'Карта загружается слишком долго. Можно вернуться к выбору или открыть адрес.',
  TILES_UNAVAILABLE:'Подложка недоступна. Причина не определена: сеть, CSP или отказ сервиса.',
  RENDERER_UNAVAILABLE:'Не удалось загрузить компонент карты. Адрес доступен ниже.',
  ADMISSION_HOLD:'Встроенная карта пока не включена: допуск поставщика не подтверждён.',
  MISSING_KEY:'У настроенного поставщика не задан ключ. Для выбранного OSM ключ не требуется.',
  QUOTA_EXHAUSTED:'Поставщик отключён по подтверждённому сигналу о лимите. Платный переход не выполняется.',
  NO_POINTS:'Нет пригодных точек. Сохраняем адреса без выдуманных меток.'
});
