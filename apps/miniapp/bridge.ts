export interface MaxBridge {initData:string;platform?:string;version?:string;BackButton?:{show():void;hide():void;onClick(fn:()=>void):void;offClick(fn:()=>void):void};shareMaxContent?:(params:{text:string;link:string})=>void;}
declare global {interface Window {WebApp?:MaxBridge}}
export function bridge():MaxBridge|null {const b=window.WebApp;return b&&typeof b.initData==='string'&&b.initData.length>0?b:null;}
export function attachBack(back:()=>void){const b=bridge()?.BackButton;if(!b)return ()=>{};b.show();b.onClick(back);return ()=>{b.offClick(back);b.hide();};}
export function share(text:string,link:string):'INVOKED'|'UNSUPPORTED'{const b=bridge();if(!b?.shareMaxContent)return 'UNSUPPORTED';b.shareMaxContent({text,link});return 'INVOKED';}
// No invented WebApp.ready(), themeChanged, notification permission method. Bridge is ready by documented presence.
