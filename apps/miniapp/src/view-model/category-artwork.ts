export interface CategoryArtwork {url:string;alt:string;}

const ARTWORK:readonly [RegExp,CategoryArtwork][]=[
 [/кино/iu,{url:'/assets/events/category-cinema.png',alt:'Иллюстрация категории «Кино»'}],
 [/театр/iu,{url:'/assets/events/category-theatre.png',alt:'Иллюстрация категории «Театр»'}],
 [/концерт/iu,{url:'/assets/events/category-concert.png',alt:'Иллюстрация категории «Концерты»'}],
 [/музе|выстав/iu,{url:'/assets/events/category-museum.png',alt:'Иллюстрация категории «Музеи и выставки»'}],
 [/спорт/iu,{url:'/assets/events/category-sport.png',alt:'Иллюстрация категории «Спорт»'}],
 [/(?:на воздухе|прогул)/iu,{url:'/assets/events/category-outdoor-v2.png',alt:'Иллюстрация категории «На воздухе»'}],
];
const FALLBACK:CategoryArtwork={url:'/assets/events/category-other-v2.png',alt:'Иллюстрация категории «Другое»'};

/** Local presentation asset, never a source event poster. */
export function categoryArtwork(categoryLabel:string|null|undefined):CategoryArtwork{
 const label=categoryLabel??'';
 if(label.includes(','))return FALLBACK;
 return ARTWORK.find(([pattern])=>pattern.test(label))?.[1]??FALLBACK;
}
