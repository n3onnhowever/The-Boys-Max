import {spawn} from 'node:child_process';

type Child={on(event:'close',listener:(code:number|null,signal:NodeJS.Signals|null)=>void):unknown;on(event:'error',listener:(error:Error)=>void):unknown;kill(signal?:NodeJS.Signals):boolean};
type Signals={on(event:'SIGTERM'|'SIGINT',listener:()=>void):unknown;off(event:'SIGTERM'|'SIGINT',listener:()=>void):unknown};
type Service={name:string;script:string};

/** API and queue worker share the hackathon container; failure of either restarts the pair. */
export function superviseNodeServices(services:readonly Service[],deps:{spawn?:(script:string)=>Child;signals?:Signals;log?:(event:Record<string,unknown>)=>void}={}):Promise<number>{
 const start=deps.spawn??((script:string)=>spawn(process.execPath,[script],{stdio:'inherit'}));
 const signals=deps.signals??process;
 const log=deps.log??(event=>console.info(JSON.stringify(event)));
 const children=services.map(service=>({name:service.name,child:start(service.script)}));
 const closed=new Set<Child>();let stopping=false,exitCode=0,timer:ReturnType<typeof setTimeout>|undefined;
 return new Promise(resolve=>{
  const finish=()=>{if(closed.size!==children.length)return;if(timer)clearTimeout(timer);signals.off('SIGTERM',onTerm);signals.off('SIGINT',onInterrupt);resolve(exitCode)};
  const shutdown=(code:number)=>{
   if(stopping)return;stopping=true;exitCode=code;
   timer=setTimeout(()=>{for(const {child} of children)if(!closed.has(child))child.kill('SIGKILL')},10000);timer.unref();
   for(const {child} of children)if(!closed.has(child))child.kill('SIGTERM');
   finish();
  };
  const onTerm=()=>shutdown(0),onInterrupt=()=>shutdown(0);
  signals.on('SIGTERM',onTerm);signals.on('SIGINT',onInterrupt);
  for(const {name,child} of children){
   child.on('error',()=>{log({event:'AMVERA_SERVICE_ERROR',service:name});shutdown(1)});
   child.on('close',(code,signal)=>{if(closed.has(child))return;closed.add(child);log({event:'AMVERA_SERVICE_EXIT',service:name,code,signal});if(!stopping)shutdown(1);finish()});
  }
  log({event:'AMVERA_SERVICES_STARTED',services:children.map(x=>x.name)});
 });
}
