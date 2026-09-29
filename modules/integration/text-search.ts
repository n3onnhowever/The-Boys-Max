import type {Candidate} from '../search/core/types.ts';
import {requireThat} from '../../packages/domain/errors.ts';

const CATEGORY_TEXT:Record<string,string>={CINEMA:'кино',THEATRE:'театр',CONCERT:'концерт музыка',MUSEUM:'музей выставка искусство',SPORT:'спорт',OUTDOOR:'прогулка на воздухе',VOLUNTEER:'волонтерство',OTHER:'другое'};

/** Literal, accent-insensitive words only; no inferred synonyms or provider text. */
export function normalizeSearchText(value:string):string {
 return value.normalize('NFKC').toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}

export function searchWords(value:string):string[] {
 requireThat(value.length<=120,'SEARCH_TEXT_TOO_LONG',422);
 const words=normalizeSearchText(value).split(' ').filter(Boolean);
 requireThat(words.length<=12,'SEARCH_TEXT_TOO_MANY_WORDS',422);
 return words;
}

export function matchesCandidateText(candidate:Candidate,words:readonly string[]):boolean {
 if(words.length===0)return true;
 const fields=[candidate.untrusted_title,candidate.venue.address??'',...candidate.categories.known.map(category=>CATEGORY_TEXT[category]??'')].map(normalizeSearchText);
 return words.every(word=>fields.some(field=>field.includes(word)));
}
