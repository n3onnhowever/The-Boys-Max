/** Editorial artwork fallback from a known category label, never an event photograph. */
export function categoryTone(label:string|undefined):string {
 const value=(label??'').toLocaleLowerCase('ru-RU');
 if(/концерт|музык|музыка/.test(value))return 'music';
 if(/кино|фильм/.test(value))return 'cinema';
 if(/музей|выстав|искусств/.test(value))return 'museum';
 if(/спорт|прогул|воздух/.test(value))return 'outdoor';
 if(/театр|стендап/.test(value))return 'theatre';
 return 'other';
}
