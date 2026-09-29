export interface PlaceV1 {placeId:string|null;label:string;address:string|null;coordinates:{latitude:number;longitude:number}|null;source:string;observedAt:string;}
export interface MapsPort {show(place:PlaceV1):Promise<'SHOWN'|'UNSUPPORTED'>;}
// No geolocation permission required for an existing venue. No inferred road distance. Owner21 supplies adapter.
