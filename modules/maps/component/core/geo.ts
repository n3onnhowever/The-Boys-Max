/** MAPS-GEO-VIEW-v2 candidate. Shape checks are NOT ACL, licensing or geocoding. */
export type Point = Readonly<{lat: number; lon: number}>;
export type Position = Point & Readonly<{crs: 'EPSG:4326'}>;
export type Precision = 'ENTRANCE'|'BUILDING'|'VENUE'|'STREET'|'CITY'|'UNKNOWN';
export type GeoSource = Readonly<{
  kind: 'USER_ENTERED'|'PROVIDER'|'OPEN_DATA'|'UNKNOWN';
  provider: string|null; record_id: string|null; source_url: string|null;
  observed_at: string|null; rights_profile_id: string;
}>;
export type GeoPlaceV1 = Readonly<{
  state: 'KNOWN'|'UNKNOWN';
  venue: Readonly<{name: string; provider: string|null; external_id: string|null}>|null;
  city: string|null; address: string|null; meeting_point: string|null;
  position: Position|null; source: GeoSource; precision: Precision;
  confidence: 'UNASSESSED'|'PROVIDER_ASSERTED'|'ORGANIZER_CHECKED';
  organizer_verified: boolean; route_url: null;
}>;
/** Computed by the existing server rights policy, NEVER from untrusted provider JSON. */
export type Disclosure = 'ALLOW'|'BLOCK'|'UNKNOWN';
export type GeoMapView = Readonly<{
  schema_version: 'maps.geo-view/2-proposed';
  geo: GeoPlaceV1;
  position_source: GeoSource|null;
  axis_order: 'NAMED_LAT_LON'|'UNVERIFIED';
  address_status: 'UNVERIFIED'|'VERIFIED'|'INVALID'|'CONFLICT';
  disclosure: Readonly<{basemap: Disclosure; navigation: Disclosure}>;
}>;
export type PreparedPlace = Readonly<{
  geo: GeoPlaceV1; marker: Point|null; destination: Point|null;
  search: Readonly<{city: string; address: string}>|null;
  warnings: readonly string[];
}>;
export function record(x: unknown): Record<string, unknown> {
  if (x === null || typeof x !== 'object' || Array.isArray(x)) throw new TypeError('Object required');
  const proto=Object.getPrototypeOf(x);
  if (proto!==Object.prototype && proto!==null) throw new TypeError('Plain object required');
  return x as Record<string, unknown>;
}
function keys(x: Record<string, unknown>, names: readonly string[]): void {
  const actual=Object.keys(x);
  if (actual.length!==names.length || actual.some(k=>!names.includes(k))) throw new TypeError('Unexpected/missing field');
}
export function cleanText(x: unknown, max=300): string {
  if (typeof x!=='string' || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(x)) throw new TypeError('Invalid text');
  const v=x.trim(); if(!v || v.length>max) throw new TypeError('Invalid text length'); return v;
}
function maybeText(x: unknown, max: number): string|null {return x===null?null:cleanText(x,max);}
function oneOf<T extends string>(x:unknown, allowed:readonly T[]):T {
  if(typeof x!=='string'||!allowed.includes(x as T))throw new TypeError('Invalid enum');return x as T;
}
export function point(x:unknown):Point {
  const p=record(x);
  if(typeof p.lat!=='number'||!Number.isFinite(p.lat)||Math.abs(p.lat)>90)throw new TypeError('Latitude');
  if(typeof p.lon!=='number'||!Number.isFinite(p.lon)||Math.abs(p.lon)>180)throw new TypeError('Longitude');
  return Object.freeze({lat:p.lat,lon:p.lon});
}
function httpsReference(x:unknown):string|null {
  if(x===null)return null;
  const s=cleanText(x,2048),u=new URL(s);
  if(/\s/u.test(s)||u.protocol!=='https:'||u.username||u.password)throw new TypeError('Source reference');
  // Metadata only: never fetched, embedded or rendered as an arbitrary link by this module.
  return s;
}
export function parseSource(x:unknown):GeoSource {
  const v=record(x);keys(v,['kind','provider','record_id','source_url','observed_at','rights_profile_id']);
  const kind=oneOf(v.kind,['USER_ENTERED','PROVIDER','OPEN_DATA','UNKNOWN'] as const);
  const provider=maybeText(v.provider,80),record_id=maybeText(v.record_id,160),source_url=httpsReference(v.source_url);
  const observed_at=maybeText(v.observed_at,40),rights_profile_id=cleanText(v.rights_profile_id,100);
  if(!/^[A-Za-z0-9_.:-]+$/.test(rights_profile_id))throw new TypeError('Rights profile');
  if(observed_at && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(observed_at)||!Number.isFinite(Date.parse(observed_at))))throw new TypeError('Observed date');
  if(observed_at){
    const year=Number(observed_at.slice(0,4)),month=Number(observed_at.slice(5,7)),day=Number(observed_at.slice(8,10));
    const days=new Date(Date.UTC(year,month,0)).getUTCDate();
    if(month<1||month>12||day<1||day>days||Number(observed_at.slice(11,13))>23)throw new TypeError('Calendar date');
  }
  if((kind==='PROVIDER'||kind==='OPEN_DATA')&&!provider)throw new TypeError('Missing provider');
  if(kind==='USER_ENTERED'&&(provider!==null||record_id!==null||source_url!==null))throw new TypeError('Mixed source must be explicit');
  return Object.freeze({kind,provider,record_id,source_url,observed_at,rights_profile_id});
}
export function parseGeo(x:unknown):GeoPlaceV1 {
  const v=record(x);keys(v,['state','venue','city','address','meeting_point','position','source','precision','confidence','organizer_verified','route_url']);
  const state=oneOf(v.state,['KNOWN','UNKNOWN'] as const);
  let venue:GeoPlaceV1['venue']=null,position:Position|null=null;
  if(v.venue!==null){const n=record(v.venue);keys(n,['name','provider','external_id']);
    venue=Object.freeze({name:cleanText(n.name,200),provider:maybeText(n.provider,80),external_id:maybeText(n.external_id,160)});
    if(venue.external_id!==null&&venue.provider===null)throw new TypeError('Venue namespace');}
  if(v.position!==null){const p=record(v.position);keys(p,['lat','lon','crs']);if(p.crs!=='EPSG:4326')throw new TypeError('CRS');position=Object.freeze({...point(p),crs:'EPSG:4326'});}
  const city=maybeText(v.city,100),address=maybeText(v.address,300),meeting_point=maybeText(v.meeting_point,500);
  const precision=oneOf(v.precision,['ENTRANCE','BUILDING','VENUE','STREET','CITY','UNKNOWN'] as const);
  const confidence=oneOf(v.confidence,['UNASSESSED','PROVIDER_ASSERTED','ORGANIZER_CHECKED'] as const);
  if(typeof v.organizer_verified!=='boolean'||v.route_url!==null)throw new TypeError('Verification/derived route');
  if(v.organizer_verified!==(confidence==='ORGANIZER_CHECKED'))throw new TypeError('Verification mismatch');
  if(state==='UNKNOWN'&&(venue!==null||position!==null))throw new TypeError('Unknown place has no fabricated point');
  if(state==='KNOWN'&&!venue&&!address&&!meeting_point&&!position)throw new TypeError('Empty known place');
  return Object.freeze({state,venue,city,address,meeting_point,position,source:parseSource(v.source),precision,confidence,organizer_verified:v.organizer_verified,route_url:null});
}
export function parseView(x:unknown):GeoMapView {
  const v=record(x);keys(v,['schema_version','geo','position_source','axis_order','address_status','disclosure']);
  if(v.schema_version!=='maps.geo-view/2-proposed')throw new TypeError('Geo view version');
  const geo=parseGeo(v.geo),position_source=v.position_source===null?null:parseSource(v.position_source);
  const axis_order=oneOf(v.axis_order,['NAMED_LAT_LON','UNVERIFIED'] as const);
  const address_status=oneOf(v.address_status,['UNVERIFIED','VERIFIED','INVALID','CONFLICT'] as const);
  const d=record(v.disclosure);keys(d,['basemap','navigation']);
  const disclosure=Object.freeze({basemap:oneOf(d.basemap,['ALLOW','BLOCK','UNKNOWN'] as const),navigation:oneOf(d.navigation,['ALLOW','BLOCK','UNKNOWN'] as const)});
  if(geo.position===null&&position_source!==null)throw new TypeError('Provenance without position');
  return Object.freeze({schema_version:'maps.geo-view/2-proposed',geo,position_source,axis_order,address_status,disclosure});
}
/** Safe migration: old records acquire NO new provider disclosure permission. */
export function fromV1(input:unknown):GeoMapView {
  const geo=parseGeo(input);
  return Object.freeze({schema_version:'maps.geo-view/2-proposed',geo,
    position_source:geo.position?geo.source:null,axis_order:'UNVERIFIED',address_status:'UNVERIFIED',
    disclosure:Object.freeze({basemap:'UNKNOWN',navigation:'UNKNOWN'})});
}
export function preparePlace(input:unknown):PreparedPlace {
  const v=parseView(input),g=v.geo,warnings:string[]=[];
  const detailed=['ENTRANCE','BUILDING','VENUE'].includes(g.precision);
  const valid=g.state==='KNOWN'&&v.address_status!=='INVALID'&&v.address_status!=='CONFLICT';
  const source=v.position_source;
  const usable=valid && g.position!==null && detailed && v.axis_order==='NAMED_LAT_LON' && source!==null && source.kind!=='UNKNOWN';
  if(v.address_status==='INVALID'||v.address_status==='CONFLICT')warnings.push('Адрес или точка требуют исправления. Автоматический выбор отключён.');
  if(v.address_status==='UNVERIFIED')warnings.push('Адрес не проверен на местности.');
  if(g.position===null)warnings.push('Координат нет: доступен только адрес.');
  else if(!detailed)warnings.push('Точность недостаточна: не показываем центр города как место встречи.');
  if(g.position!==null&&v.axis_order==='UNVERIFIED')warnings.push('Порядок координат источника не подтверждён.');
  if(g.position!==null&&(!source||source.kind==='UNKNOWN'))warnings.push('Нет подтверждённого происхождения координат.');
  if(v.disclosure.basemap!=='ALLOW')warnings.push('Передача области карты поставщику пока не разрешена.');
  if(v.disclosure.navigation!=='ALLOW')warnings.push('Передача места внешней навигации пока не разрешена.');
  // Standard raster basemap is EPSG:3857, not the full WGS84 latitude range.
  const mercator=usable&&Math.abs(g.position!.lat)<=85.0511287798066;
  if(usable&&!mercator)warnings.push('Точка вне покрытия выбранной проекции карты.');
  if(usable&&g.precision!=='ENTRANCE')warnings.push('Точка площадки; точный вход может отличаться.');
  const marker=mercator&&v.disclosure.basemap==='ALLOW'?point(g.position):null;
  const destination=usable&&v.disclosure.navigation==='ALLOW'?point(g.position):null;
  const search=valid&&g.city&&g.address&&v.disclosure.navigation==='ALLOW'?Object.freeze({city:g.city,address:g.address}):null;
  return Object.freeze({geo:g,marker,destination,search,warnings:Object.freeze(warnings)});
}
/** Only an expanded PLACE may be passed. Never pass location.coords (city centroid). */
export function kudagoPlacePoint(input:unknown):Point|null {
  const p=record(input);if(p.coords==null)return null;return point(p.coords);
}
export function timepadPoint(input:unknown,verifiedOrder:'LAT_LON'|'LON_LAT'|'UNVERIFIED'):Point|null {
  if(input===null)return null;
  if(verifiedOrder==='UNVERIFIED')throw new TypeError('Timepad fixture/order approval required');
  if(!['LAT_LON','LON_LAT'].includes(verifiedOrder))throw new TypeError('Order');
  if(!Array.isArray(input)||input.length!==2)throw new TypeError('Pair');
  return point(verifiedOrder==='LAT_LON'?{lat:input[0],lon:input[1]}:{lat:input[1],lon:input[0]});
}
