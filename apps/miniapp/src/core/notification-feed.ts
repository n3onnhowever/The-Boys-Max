export type NotificationPage<T>={items:T[];unreadCount:number;nextCursor:string|null};
/** The cursor advances only on success. One pending operation orders reads and pages. */
export function createNotificationFeed<T extends {id:string;read:boolean}>(fetchPage:(cursor:string|null)=>Promise<NotificationPage<T>>,readNotification:(id:string)=>Promise<{unreadCount:number}>){
 let state:{items:T[]|null;unreadCount:number;nextCursor:string|null;pending:boolean;error:string}={items:null,unreadCount:0,nextCursor:null,pending:false,error:''};
 const listeners=new Set<()=>void>();
 const update=(patch:Partial<typeof state>)=>{state={...state,...patch};for(const listener of listeners)listener()};
 return {
  getSnapshot:()=>state,
  subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}},
  load:async()=>{
   if(state.pending||state.items!==null&&state.nextCursor===null)return;
   const cursor=state.nextCursor;update({pending:true,error:''});
   try{
    const page=await fetchPage(cursor),items=new Map((state.items??[]).map(item=>[item.id,item]));
    for(const item of page.items){const old=items.get(item.id);items.set(item.id,old?{...item,read:old.read||item.read}:item)}
    update({items:[...items.values()],unreadCount:page.unreadCount,nextCursor:page.nextCursor});
   }catch{update({error:'Не удалось загрузить уведомления. Попробуйте ещё раз.'})}finally{update({pending:false})}
  },
  markRead:async(id:string)=>{
   if(state.pending||!state.items?.some(item=>item.id===id))return false;
   update({pending:true,error:''});
   try{
    const result=await readNotification(id);
    update({items:state.items.map(item=>item.id===id?{...item,read:true}:item),unreadCount:result.unreadCount});return true;
   }catch{update({error:'Не удалось открыть уведомление. Попробуйте ещё раз.'});return false}finally{update({pending:false})}
  }
 };
}
