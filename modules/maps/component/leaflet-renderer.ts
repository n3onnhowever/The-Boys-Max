/** Actual Leaflet renderer. No substitute/fake tiles; load only on explicit map request. */
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {completedTiles,type MapState} from './core/state.ts';
import {point,type Point} from './core/geo.ts';
export type MapMarker=Readonly<{key:string;ordinal:number;position:Point}>;
export type MapHandle={destroy:()=>void;resize:()=>void;gestures:(enabled:boolean)=>void};
export const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export function mountMap(element:HTMLElement,markers:readonly MapMarker[],onState:(s:MapState)=>void,onPick:(key:string)=>void):MapHandle {
  if(markers.length<1||markers.length>3)throw new RangeError('Map needs 1–3 points');
  for(const m of markers){point(m.position);if(!Number.isInteger(m.ordinal)||m.ordinal<1||m.ordinal>3||Math.abs(m.position.lat)>85.0511287798066)throw new TypeError('Marker');}
  let destroyed=false,ok=0,failed=0,timer:ReturnType<typeof setTimeout>|undefined;
  const send=(s:MapState)=>{if(!destroyed)onState(s);};
  const stopTimer=()=>{if(timer!==undefined)clearTimeout(timer);};
  const start=()=>{stopTimer();ok=0;failed=0;send('LOADING');timer=setTimeout(()=>send('TIMEOUT'),8000);};
  const map=L.map(element,{scrollWheelZoom:false,dragging:false,touchZoom:false,doubleClickZoom:false,
    boxZoom:false,keyboard:false,zoomControl:true,attributionControl:true,minZoom:2,maxZoom:17});
  map.attributionControl.setPrefix('Leaflet');
  const tiles=L.tileLayer(TILE_URL,{
    attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    maxZoom:17,minZoom:2,noWrap:true,detectRetina:false,keepBuffer:0,
    updateWhenIdle:true,updateWhenZooming:false,crossOrigin:'anonymous',referrerPolicy:'origin'
  });
  tiles.on('loading',start);
  tiles.on('tileload',()=>{ok++;});
  tiles.on('tileerror',()=>{failed++;}); // IMG events do not expose HTTP status: never guess 429/quota.
  tiles.on('load',()=>{stopTimer();send(completedTiles(ok,failed));});
  const coords=markers.map(m=>L.latLng(m.position.lat,m.position.lon));
  if(coords.length===1)map.setView(coords[0],15,{animate:false});
  else map.fitBounds(L.latLngBounds(coords),{padding:[32,32],maxZoom:16,animate:false});
  for(const m of markers){
    const text=document.createElement('span');text.textContent=String(m.ordinal); // Never inject provider HTML.
    const marker=L.circleMarker([m.position.lat,m.position.lon],{radius:13,weight:2,fillOpacity:0.9});
    marker.bindTooltip(text,{permanent:true,direction:'center',className:'map-ordinal'});
    marker.on('click',()=>onPick(m.key));marker.addTo(map);
  }
  start();tiles.addTo(map);
  const resize=()=>{if(!destroyed)map.invalidateSize({pan:false,animate:false,debounceMoveend:true});};
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(element);
  return {resize,
    gestures(enabled){for(const h of [map.dragging,map.touchZoom,map.doubleClickZoom,map.keyboard])enabled?h.enable():h.disable();},
    destroy(){if(destroyed)return;destroyed=true;stopTimer();observer?.disconnect();tiles.off();map.remove();}
  };
}
