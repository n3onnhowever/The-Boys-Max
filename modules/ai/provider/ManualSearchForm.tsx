import {useState, type FormEvent} from 'react';
import {MANUAL_DEFAULTS, fromManualForm} from './manual.ts';
import type {ManualValues} from './manual.ts';
import type {Candidate,Category,ParseContext} from './types.ts';
/** Integration source for target React; not built/rendered in this isolated package.
 * Explicit submit returns a manual candidate. Parent must confirm/store via server 23/shared19.
 * No fetch, LLM, prices, membership or final eligibility implementation here. */
export function ManualSearchForm({context,onReview}:{context:ParseContext;onReview:(candidate:Candidate)=>void}){
  const [values,setValues]=useState<ManualValues>({...MANUAL_DEFAULTS});
  const [errors,setErrors]=useState<string[]>([]);
  const update=<K extends keyof ManualValues>(key:K,value:ManualValues[K])=>setValues(s=>({...s,[key]:value}));
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const result=fromManualForm(values,context);setErrors(result.errors);if(result.candidate)onReview(result.candidate);};
  const categories:Record<Category,string>={CINEMA:'Кино',THEATRE:'Театр',CONCERT:'Концерт',MUSEUM:'Музей',SPORT:'Спорт',OUTDOOR:'На улице',VOLUNTEER:'Волонтёрство',OTHER:'Другое'};
  return <form onSubmit={submit} aria-label="Ручные фильтры поиска">
    <p>Поиск без ИИ. Здесь меняются только фильтры: состав плана и согласия остаются прежними.</p>
    <label>Город<select value={values.city_id} onChange={e=>{const c=context.cities.find(x=>x.id===e.target.value);setValues(s=>({...s,city_id:e.target.value,timezone:c?.timezone??''}));}}><option value="">Не выбран</option>{context.cities.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    <label>Тип даты<select value={values.date_kind} onChange={e=>update('date_kind',e.target.value as ManualValues['date_kind'])}><option value="">Не задана</option><option value="EXACT">Точная дата</option><option value="RANGE">Диапазон включительно</option></select></label>
    <label>Дата / начало<input type="date" value={values.date_from} onChange={e=>update('date_from',e.target.value)}/></label>
    {values.date_kind==='RANGE'&&<label>Последняя дата<input type="date" value={values.date_through} onChange={e=>update('date_through',e.target.value)}/></label>}
    <fieldset><legend>Временное окно</legend>
      <label>Начало<input type="time" value={values.start} onChange={e=>update('start',e.target.value)}/></label>
      <label>Конец, не включая<input type="time" value={values.end} onChange={e=>update('end',e.target.value)}/></label>
      <label><input type="checkbox" checked={values.next_day} onChange={e=>update('next_day',e.target.checked)}/>Конец на следующий день</label>
      <label>Правило<select value={values.time_mode} onChange={e=>update('time_mode',e.target.value as ManualValues['time_mode'])}><option value="UNKNOWN">Нужно выбрать при указании времени</option><option value="STARTS_WITHIN">Мероприятие начинается внутри окна</option><option value="FULLY_WITHIN">Мероприятие целиком внутри окна</option></select></label>
      <label>Часовой пояс<input value={values.timezone} onChange={e=>update('timezone',e.target.value)} placeholder="Europe/Moscow"/></label>
    </fieldset>
    {(['included','excluded'] as const).map(key=><fieldset key={key}><legend>{key==='included'?'Категории':'Исключить'}</legend>{Object.entries(categories).map(([category,label])=><label key={category}><input type="checkbox" checked={values[key].includes(category as Category)} onChange={e=>update(key,e.target.checked?[...values[key],category as Category]:values[key].filter(c=>c!==category))}/>{label}</label>)}</fieldset>)}
    <label>Число желающих (не состав плана)<input type="number" min="1" max="100" step="1" value={values.party_size} onChange={e=>update('party_size',e.target.value)}/></label>
    <label>Бюджет, рублей<input inputMode="decimal" value={values.budget_rub} onChange={e=>update('budget_rub',e.target.value)} placeholder="1500,50"/></label>
    <label>База бюджета<select value={values.budget_basis} onChange={e=>update('budget_basis',e.target.value as ManualValues['budget_basis'])}><option value="UNKNOWN">Не выбрана</option><option value="PER_PERSON">На человека</option><option value="GROUP_TOTAL">На всех желающих</option></select></label>
    {([['indoor','В помещении'],['wheelchair','Доступность для коляски'],['available','Отдельно проверять наличие билетов']] as const).map(([key,label])=><label key={key}>{label}<select value={values[key]} onChange={e=>update(key,e.target.value as ''|'true'|'false')}><option value="">Условие не задано</option><option value="true">Да</option><option value="false">Нет</option></select></label>)}
    {errors.length>0&&<div role="alert">Проверьте поля: {errors.join('; ')}. Неоднозначное время или неподдержанное условие нельзя отправить молча.</div>}
    <p>Результаты и окончательная стоимость появятся только после проверки источников. Бюджет не является ценой события.</p>
    <button type="submit">Проверить фильтры перед поиском</button>
  </form>;
}
