export type WritablePreferences={city:string;interests:string[];budgetRub:number|null;radiusKm:number;notificationsEnabled:boolean;preferredTime:'ANY'|'MORNING'|'DAY'|'EVENING'|'NIGHT'};

export function preferenceWritePayload(value:WritablePreferences):WritablePreferences{
 return {city:value.city,interests:value.interests,budgetRub:value.budgetRub,radiusKm:value.radiusKm,notificationsEnabled:value.notificationsEnabled,preferredTime:value.preferredTime};
}

export function calendarEventUrl(event:{title:string;startsAt:string;endsAt:string|null;place:string|null;note:string|null}):string{
 const start=new Date(event.startsAt);
 if(!Number.isFinite(start.getTime()))throw new Error('CALENDAR_DATE_INVALID');
 const parsedEnd=event.endsAt?new Date(event.endsAt):null;
 const end=parsedEnd&&Number.isFinite(parsedEnd.getTime())&&parsedEnd>start?parsedEnd:new Date(start.getTime()+3600000);
 const stamp=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const url=new URL('https://calendar.google.com/calendar/r/eventedit');
 url.searchParams.set('action','TEMPLATE');
 url.searchParams.set('dates',`${stamp(start)}/${stamp(end)}`);
 url.searchParams.set('text',event.title);
 if(event.place)url.searchParams.set('location',event.place);
 if(event.note)url.searchParams.set('details',event.note);
 return url.href;
}
