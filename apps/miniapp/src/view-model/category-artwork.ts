import {CATEGORIES,type Category} from '../../../../modules/search/core/types.ts';

export interface CategoryArtwork {url:string;alt:string;}

// The domain has no primary category. This fixed priority is independent of
// provider order, localized labels, and the current filter selection.
export const ARTWORK_PRIORITY:readonly Category[]=[
 'CINEMA','THEATRE','CONCERT','MUSEUM','SPORT','OUTDOOR','VOLUNTEER','OTHER',
];

const ARTWORK:Readonly<Record<Category,CategoryArtwork>>={
 CINEMA:{url:'/assets/events/category-cinema.png',alt:'Иллюстрация категории «Кино»'},
 THEATRE:{url:'/assets/events/category-theatre.png',alt:'Иллюстрация категории «Театр»'},
 CONCERT:{url:'/assets/events/category-concert.png',alt:'Иллюстрация категории «Концерты»'},
 MUSEUM:{url:'/assets/events/category-museum.png',alt:'Иллюстрация категории «Музеи и выставки»'},
 SPORT:{url:'/assets/events/category-sport.png',alt:'Иллюстрация категории «Спорт»'},
 OUTDOOR:{url:'/assets/events/category-outdoor-v2.png',alt:'Иллюстрация категории «На воздухе»'},
 // ASSET_MISSING_VOLUNTEER: no approved dedicated volunteer asset exists.
 // This temporary editorial fallback is explicit and never presented as volunteer-specific art.
 VOLUNTEER:{url:'/assets/events/category-other-v2.png',alt:'Временная редакционная иллюстрация для волонтёрства; отдельное изображение пока отсутствует'},
 OTHER:{url:'/assets/events/category-other-v2.png',alt:'Иллюстрация категории «Другое»'},
};

/** Resolve a canonical category set without depending on its input order. */
export function artworkCategory(categories:readonly string[]):Category|null{
 if(categories.some(value=>!CATEGORIES.includes(value as Category)))throw Error('UNKNOWN_ARTWORK_CATEGORY');
 return ARTWORK_PRIORITY.find(category=>categories.includes(category))??null;
}

/** Local editorial asset, never a source event poster. */
export function categoryArtwork(category:Category|null):CategoryArtwork{
 return category===null?ARTWORK.OTHER:ARTWORK[category];
}
