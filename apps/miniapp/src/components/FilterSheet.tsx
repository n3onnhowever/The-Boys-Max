import { useEffect, useRef } from 'react';
import {createPortal} from 'react-dom';
import type { SearchFilterState, SearchUiAction } from '../view-model/search.ts';
import type { SearchDraft } from '../port/contracts.ts';
import { RUNTIME_CATEGORY_OPTIONS, SEARCH_FILTER_OPTIONS } from '../view-model/search.ts';
import { FilterChip } from './FilterChip.tsx';
import { FilterSection } from './FilterSection.tsx';
import { Icon } from './Icon.tsx';

interface FilterSheetProps {
  open: boolean;
  filters: SearchFilterState;
  onAction: (action: SearchUiAction) => void;
  runtime?: { draft: SearchDraft; busy: boolean; onChange: (draft: SearchDraft) => void; onClose: () => void; onReset: () => void; onApply: () => void };
}

function choiceLabel(label: string, selected: boolean, removable: boolean) {
  return <>{label}{selected && removable ? <span className="filter-choice-remove" aria-hidden="true">×</span> : null}</>;
}

export function FilterSheet({ open, filters, onAction, runtime }: FilterSheetProps) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const layer = dialog.parentElement;
    const background = Array.from(layer?.parentElement?.children ?? [])
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== layer)
      .map(element => ({ element, inert: element.inert }));
    background.forEach(({ element }) => { element.inert = true; });
    const focusFrame = requestAnimationFrame(() => dialog.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(focusFrame);
      background.forEach(({ element, inert }) => { element.inert = inert; });
      document.body.style.overflow=previousOverflow;
      if (opener?.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
    };
  }, [open]);
  const close = () => runtime ? runtime.onClose() : onAction({ type: 'CLOSE_FILTERS' });
  const layer=<div className={`filter-sheet-layer${open ? ' is-open' : ''}`} aria-hidden={!open} inert={!open}>
    <button className="filter-sheet-backdrop" type="button" tabIndex={-1} aria-label="Закрыть фильтры" onClick={close} />
    <aside ref={dialogRef} id="filter-sheet-dialog" className="filter-sheet" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="filter-sheet-title" onKeyDown={event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'Tab') {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <span className="filter-sheet-handle" aria-hidden="true" />
      <header className="filter-sheet-header">
        <h1 id="filter-sheet-title">Фильтры</h1>
        <button type="button" className="filter-sheet-close" aria-label="Закрыть фильтры" onClick={close}><Icon name="close" /></button>
      </header>
      <div className="filter-sheet-scroll">
        {runtime ? <>
          <section className="filter-sheet-section">
            <h2>Дата</h2>
            <div className="v2-chip-row">{[{label:'Любая',value:''},{label:'Сегодня',value:new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'})},{label:'Завтра',value:new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'})}].map(x=><FilterChip key={x.label} className={`sheet-filter-chip${runtime.draft.date===x.value?' is-selected':''}`} aria-pressed={runtime.draft.date===x.value} onClick={()=>runtime.onChange({...runtime.draft,date:x.value,dateThrough:undefined})}>{x.label}</FilterChip>)}</div>
            <label htmlFor="runtime-filter-date">Выбрать дату</label>
            <input id="runtime-filter-date" className="v2-input runtime-filter-date" type="date" value={runtime.draft.date}
              onChange={event => runtime.onChange({ ...runtime.draft, date: event.target.value,dateThrough:undefined })} />
          </section>
          <section className="filter-sheet-section"><h2>Время начала</h2><div className="v2-chip-row">{[
            {label:'Любое',start:'',end:''},{label:'Утро',start:'06:00',end:'12:00'},{label:'День',start:'12:00',end:'18:00'},
            {label:'Вечер',start:'18:00',end:'22:00'},{label:'Ночь',start:'22:00',end:'23:59'}].map(x=><FilterChip key={x.label} className={`sheet-filter-chip${runtime.draft.startLocal===x.start?' is-selected':''}`} aria-pressed={runtime.draft.startLocal===x.start} onClick={()=>{
              const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'});
              const through=new Date(Date.now()+29*86400000).toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'});
              runtime.onChange({...runtime.draft,startLocal:x.start,endLocal:x.end,...(x.start&&!runtime.draft.date?{date:today,dateThrough:through,timeZone:'Europe/Moscow'}:{})});
            }}>{x.label}</FilterChip>)}</div></section>
          <FilterSection title="Категории">
            {RUNTIME_CATEGORY_OPTIONS.map(option => {
              const selected = runtime.draft.includedCategories.includes(option.id);
              return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`}
                aria-pressed={selected} onClick={() => runtime.onChange({ ...runtime.draft,
                  includedCategories: selected ? runtime.draft.includedCategories.filter(id => id !== option.id) : [...runtime.draft.includedCategories, option.id] })}>
                {choiceLabel(option.label, selected, true)}
              </FilterChip>;
            })}
          </FilterSection>
          <section className="filter-sheet-section"><h2>Бюджет на человека</h2><div className="v2-chip-row">{[{label:'Любой',value:'',free:false},{label:'Бесплатно',value:'0',free:true},{label:'До 1 000 ₽',value:'1000',free:false},{label:'До 1 500 ₽',value:'1500',free:false},{label:'До 3 000 ₽',value:'3000',free:false},{label:'До 5 000 ₽',value:'5000',free:false}].map(x=><FilterChip key={x.label} className={`sheet-filter-chip${runtime.draft.budgetText===x.value&&!!runtime.draft.freeOnly===x.free?' is-selected':''}`} aria-pressed={runtime.draft.budgetText===x.value&&!!runtime.draft.freeOnly===x.free} onClick={()=>runtime.onChange({...runtime.draft,budgetText:x.value,priceBasis:x.value?'PER_PERSON':'UNKNOWN',freeOnly:x.free})}>{x.label}</FilterChip>)}</div></section>
          <div className="filter-map-row" aria-disabled="true"><Icon name="map"/><span>Показать на карте · Скоро</span></div>
        </> : <>
        <FilterSection title="Дата">
          {SEARCH_FILTER_OPTIONS.dates.map(option => {
            const selected = filters.date === option.id;
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'SET_DATE', value: option.id })}>
              {choiceLabel(option.label, selected, option.id !== 'any')}
            </FilterChip>;
          })}
        </FilterSection>
        <FilterSection title="Категории">
          {SEARCH_FILTER_OPTIONS.categories.map(option => {
            const selected = filters.categories.includes(option.id);
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'TOGGLE_CATEGORY', value: option.id })}>
              {choiceLabel(option.label, selected, true)}
            </FilterChip>;
          })}
        </FilterSection>
        <FilterSection title="Формат">
          {SEARCH_FILTER_OPTIONS.formats.map(option => {
            const selected = filters.format === option.id;
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'SET_FORMAT', value: option.id })}>
              {choiceLabel(option.label, selected, option.id !== 'any')}
            </FilterChip>;
          })}
        </FilterSection>
        <FilterSection title="Цена">
          {SEARCH_FILTER_OPTIONS.prices.map(option => {
            const selected = filters.price === option.id;
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'SET_PRICE', value: option.id })}>
              {choiceLabel(option.label, selected, option.id !== 'any')}
            </FilterChip>;
          })}
        </FilterSection>
        <FilterSection title="Район / расстояние">
          {SEARCH_FILTER_OPTIONS.distances.map(option => {
            const selected = filters.distance === option.id;
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'SET_DISTANCE', value: option.id })}>
              {choiceLabel(option.label, selected, option.id !== 'any')}{option.id === 'other' ? <Icon name="chevronDown" /> : null}
            </FilterChip>;
          })}
        </FilterSection>
        <div className="filter-map-row" aria-disabled="true">
          <Icon name="pin" /><span>Показать события на карте</span><span className="filter-map-switch" aria-hidden="true" />
        </div>
        </>}
      </div>
      <footer className="filter-sheet-footer">
        <button type="button" className="filter-reset" onClick={() => runtime ? runtime.onReset() : onAction({ type: 'RESET_FILTERS' })}>Сбросить все</button>
        <button type="button" className="filter-apply" disabled={runtime?.busy} onClick={() => runtime ? runtime.onApply() : onAction({ type: 'APPLY_FILTERS' })}>Показать события</button>
      </footer>
    </aside>
  </div>;
  return open?createPortal(layer,document.body):layer;
}
