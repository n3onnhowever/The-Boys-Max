import {useState,type ReactNode} from 'react';
import {capabilities,openLink} from '../../bridge.ts';
/** Receives an already allowlisted URL. Keep a normal anchor when native APIs are absent. */
export function ExternalLink({href,children}:{href:string;children:ReactNode}){
 const [failed,setFailed]=useState(false);
 return <><a className="link-button" href={href} target="_blank" rel="noopener noreferrer" onClick={event=>{
  if(failed||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const c=capabilities(),inside=new URL(href).origin==='https://max.ru';
  if(!c.openLink&&!(inside&&c.openMaxLink))return;
  event.preventDefault();void openLink(href).then(result=>setFailed(result!=='INVOKED'));
 }}>{children}</a>{failed&&<p role="status">Нажмите ссылку ещё раз, чтобы открыть её в браузере.</p>}</>;
}
