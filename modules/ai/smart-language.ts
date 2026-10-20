import type {Category} from '../search/core/types.ts';

/** A bounded vocabulary guard, not an NLP parser. Unconsumed wording needs review
 * by the user; the model cannot decide that an unknown expression is harmless. */
export function recognizedSmartConstraints(request:string){
 let rest=request.toLocaleLowerCase('ru-RU').replaceAll('ё','е').trim();
 const take=(pattern:string):string[]=>{
  const values:string[]=[];
  rest=rest.replace(new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`,'gu'),value=>{values.push(value);return ' ';});
  return values;
 };
 const dates=take('сегодня|завтра|(?:на )?выходных|выходные|\\d{4}-\\d{2}-\\d{2}').map(value=>value==='сегодня'?'TODAY':value==='завтра'?'TOMORROW':value.includes('выходн')?'WEEKEND':value);
 const partNames={утром:'MORNING',днем:'DAY',вечером:'EVENING',ночью:'NIGHT'} as const;
 const times=take('утром|днем|вечером|ночью').map(value=>partNames[value as keyof typeof partNames]);
 const budgets=take('(?:до|не дороже|не больше|максимум|бюджет)\\s+\\d+(?:[ \\u00a0]\\d{3})*(?:\\s*(?:рублей|рубля|руб|₽))?').map(value=>Number(value.replace(/^(?:до|не дороже|не больше|максимум|бюджет)\s+/u,'').replace(/(?:рублей|рубля|руб|₽)$/u,'').replace(/\s/gu,'')));
 const free=take('бесплатн[а-я]*|даром').length>0;
 const cities=take('москв(?:а|е|у|ы)|moscow|санкт[- ]петербург(?:е|а)?|спб').map(value=>value.startsWith('москв')||value==='moscow'?'Москва':'Санкт-Петербург');
 const parties=take('вдвоем|(?:на|для) двоих|(?:на|для) троих|(?:на|для) [1-9]\\d? (?:человек|человека)').map(value=>value.includes('дво')?2:value.includes('тро')?3:Number(/\d+/u.exec(value)![0]));
 const categories:Category[]=[];
 for(const [category,pattern] of Object.entries({CINEMA:'кино|фильм[а-я]*',THEATRE:'театр[а-я]*|спектакл[а-я]*',CONCERT:'концерт[а-я]*|музык[а-я]*',MUSEUM:'выстав[а-я]*|музе[а-я]*',SPORT:'спорт[а-я]*|матч[а-я]*',OUTDOOR:'прогул[а-я]*|парк[а-я]*',VOLUNTEER:'волонтер[а-я]*',OTHER:'другое'})){
  if(take(pattern).length)categories.push(category as Category);
 }
 // Only these connective/generic/soft words carry no additional hard condition.
 const generic=take('только|в|во|на|для|и|хочу|куда-нибудь|куда|сходить|нибудь|лучше|интересуют|рядом|вдвоем|пожалуйста|мне');
 // NIGHT crosses midnight, which the current UI draft cannot round-trip.
 const unsupported=/[^\s,.;:!?—–()«»"'…-]/u.test(rest)||dates.length>1||times.length>1||budgets.length>1||cities.length>1||parties.length>1||free&&budgets.length>0||times.length>0&&dates.length===0||times.includes('NIGHT')||
  !generic.length&&!dates.length&&!times.length&&!budgets.length&&!free&&!cities.length&&!parties.length&&!categories.length;
 return {unsupported,date:dates[0]??null,daypart:times[0]??null,budget:budgets[0]??null,free,city:cities[0]??null,party:parties[0]??null,categories};
}
