/** Direction 19 -> 21 port, structural subset of the supplied EVENT_PROVIDER v2.
 * Policy metadata must be assembled by authenticated server code, not the LLM/feed.
 * This is a read projection. No snapshots, prices, eligibility or membership writes.
 */
import {record,point,parseSource,parseView,type GeoMapView,type GeoSource,type Precision,type Disclosure} from './geo.ts';
export type GeoProjectionPolicy=Readonly<{
  text_source:GeoSource;position_source:GeoSource|null;
  precision:Precision;axis_order:GeoMapView['axis_order'];
  address_status:GeoMapView['address_status'];
  disclosure:Readonly<{basemap:Disclosure;navigation:Disclosure}>;
}>;
export function occurrenceGeoView(input:unknown,policy:GeoProjectionPolicy):GeoMapView {
  const occurrence=record(input),venue=record(occurrence.venue);
  const meaning=venue.coordinate_meaning;
  if(typeof meaning!=='string'||!['VENUE','MEETING_POINT','CITY_CENTROID','UNKNOWN'].includes(meaning))throw new TypeError('coordinate_meaning');
  const source=parseSource(policy.text_source);
  const position=venue.coordinates===null?null:{...point(venue.coordinates),crs:'EPSG:4326' as const};
  const name=venue.name,city=venue.city,address=venue.address,id=venue.id;
  const state=(name!==null||address!==null||position!==null)?'KNOWN':'UNKNOWN';
  const precision=meaning==='CITY_CENTROID'?'CITY':meaning==='UNKNOWN'?'UNKNOWN':policy.precision;
  return parseView({schema_version:'maps.geo-view/2-proposed',geo:{state,
    venue:name===null?null:{name,provider:source.provider,external_id:id},city,address,meeting_point:null,
    position,source,precision,confidence:'UNASSESSED',organizer_verified:false,route_url:null},
    position_source:position?policy.position_source:null,axis_order:policy.axis_order,
    address_status:policy.address_status,disclosure:policy.disclosure});
}
