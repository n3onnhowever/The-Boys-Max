import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {capabilities,launchData,startParam,launchContext,viewportSize,openLink,share,attachBack,type MaxBridge} from '../../apps/miniapp/bridge.ts';
import {launchParam,decodeLaunch,validStartParam} from '../../packages/platform/launch.ts';
import {decodeLaunch as route} from '../../apps/miniapp/src/core/launch.ts';
function host(t:TestContext,app:MaxBridge){
 const original=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{value:{WebApp:app,location:{hash:''}},configurable:true});
 t.after(()=>{if(original)Object.defineProperty(globalThis,'window',original);else Reflect.deleteProperty(globalThis,'window');});
}
const methods={openLink(){},openMaxLink(){},shareContent(){},shareMaxContent(){},getLaunchContext:async()=>({entryPoint:'tabbar' as const}),getViewportSize:async()=>({height:'700',width:'390'})};
for(const platform of ['web','android','ios','desktop'])test('capability matrix '+platform,()=>{
 const result=capabilities({initData:'SYNTHETIC',platform,version:'26.20.0',...methods});
 assert.equal(result.platform,platform);assert.equal(result.openLink,true);assert.equal(result.openMaxLink,true);assert.equal(result.shareMaxContent,true);
 assert.equal(result.shareContent,['android','ios'].includes(platform));assert.equal(result.getLaunchContext,['android','ios'].includes(platform));
});
test('absent Bridge and CDN object without launch expose no native capabilities',()=>{
 for(const app of [null,{platform:'web',...methods}]){const c=capabilities(app);assert.equal(c.platform,'external');assert.equal(c.openLink,false);assert.equal(c.shareMaxContent,false);}
});
for(const [platform,version,allowed]of [['android','26.19.1',false],['android','26.19.2',true],['ios','26.19.99',false],['ios','26.20.0',true],['ios','unknown',false],['web','99.99.99',false]]as const)
 test('launch context version gate '+platform+' '+version,()=>assert.equal(capabilities({initData:'SYNTHETIC',platform,version,...methods}).getLaunchContext,allowed));
test('URL WebAppData is forwarded byte-exactly, without a fabricated Bridge',()=>{
 const raw='auth_date=1800000000&user=%7B%22id%22%3A9007199254740993%7D&hash=synthetic';
 assert.equal(launchData(null,'#WebAppData='+encodeURIComponent(raw)+'&WebAppPlatform=web'),raw);
 assert.equal(launchData({initData:raw},'#WebAppData='+encodeURIComponent(raw)),raw);
});
for(const fragment of ['#WebAppData=x&WebAppData=x','#WebAppData=x&%57ebAppData=y','#WebAppData=x&WebAppPlatform=web&WebAppPlatform=ios','#WebAppData=%ff','#WebAppData=%','#WebAppData='])
 test('reject ambiguous or malformed launch '+fragment,()=>assert.throws(()=>launchData(null,fragment),/LAUNCH_/));
test('conflicting Bridge and fragment rejected before exchange',()=>assert.throws(()=>launchData({initData:'a'},'#WebAppData=b'),/LAUNCH_CONFLICT/));
test('unsafe user never read even when its getter throws',()=>{
 const b={initData:'signed',get initDataUnsafe(){throw Error('unsafe user read');}};
 assert.equal(launchData(b,''),'signed');
});
test('only allowed context fields are read, never user identity',()=>{
 assert.equal(startParam('user=forged&start_param=c_summer','?startapp=r_other'),'c_summer');
 assert.equal(startParam(null,'?user=forged&startapp=c_summer'),'c_summer');
 for(const search of ['?startapp=x&startapp=y','?startapp=x&launch=y','?startapp=%ff','?startapp=role%3Dadmin'])assert.equal(startParam(null,search),null);
});
test('512 ASCII characters accepted; 513 or disallowed characters rejected',()=>{
 assert.equal(validStartParam('A'.repeat(512)),true);
 for(const value of ['A'.repeat(513),'a.b','a+b','тест','x/y','x=y','',null])assert.equal(validStartParam(value),false);
});
test('event deep link round-trip retains an occurrence locator, never an offer or permission',()=>{
 const event={kind:'EVENT' as const,sourceId:'SYNTHETIC',externalEventId:'event-1',occurrenceId:'occurrence-1'};
 const payload=launchParam(event);assert.equal(validStartParam(payload),true);assert.deepEqual(decodeLaunch(payload),event);
 assert.deepEqual(route(payload),{...event,scope:{kind:'PERSONAL'}});
 assert.equal('actorId' in decodeLaunch(payload),false);
});
test('campaign/referral are context only and route to personal home',()=>{
 for(const kind of ['CAMPAIGN','REFERRAL']as const){const payload=launchParam({kind,code:'public_campaign'});assert.deepEqual(decodeLaunch(payload),{kind,code:'public_campaign'});assert.deepEqual(route(payload),{kind:'CATALOG',scope:{kind:'PERSONAL'}});}
});
test('invalid or oversized event encoding fails closed to personal home',()=>{
 for(const payload of ['e_!','e_eyJyb2xlIjoiYWRtaW4ifQ','e_wA','e_'+'a'.repeat(511)])assert.deepEqual(decodeLaunch(payload),{kind:'INVALID'});
 assert.throws(()=>launchParam({kind:'EVENT',sourceId:'x'.repeat(160),externalEventId:'y'.repeat(160),occurrenceId:'z'.repeat(160)}),/PAYLOAD_LIMIT/);
});
test('launch context rejection and timeout are graceful',async t=>{
 host(t,{initData:'SYNTHETIC',platform:'android',version:'26.19.2',getLaunchContext:()=>new Promise(()=>{})});
 assert.equal(await launchContext(5),null);
 window.WebApp!.getLaunchContext=async()=>{throw Error('unsupported');};assert.equal(await launchContext(),null);
 window.WebApp!.getLaunchContext=async()=>({entryPoint:'tabbar'});assert.deepEqual(await launchContext(),{entryPoint:'tabbar'});
});
test('viewport dimensions are bounded and failures leave CSS fallback',async t=>{
 host(t,{initData:'SYNTHETIC',platform:'web',...methods});
 assert.deepEqual(await viewportSize(),{height:700,width:390});
 window.WebApp!.getViewportSize=async()=>({height:'Infinity',width:'390'});assert.equal(await viewportSize(),null);
 window.WebApp!.getViewportSize=async()=>{throw Error('unsupported');};assert.equal(await viewportSize(),null);
});
test('native links are dispatched in the click turn and routed by exact MAX origin',async t=>{
 const calls:string[]=[];
 host(t,{initData:'SYNTHETIC',platform:'ios',openLink:url=>calls.push('external:'+url),openMaxLink:url=>calls.push('max:'+url)});
 const result=openLink('https://max.ru/test_bot?startapp=catalog');assert.equal(calls.length,1);assert.equal(await result,'INVOKED');
 assert.equal(await openLink('https://max.ru.evil.invalid/'),'INVOKED');assert.ok(calls[1]?.startsWith('external:'));
 for(const link of ['javascript:alert(1)','http://max.ru/test_bot','https://user:password@max.ru/test_bot'])assert.equal(await openLink(link),'INVALID');
});
test('native rejection and missing APIs report explicit outcomes',async t=>{
 host(t,{initData:'SYNTHETIC',platform:'android',openLink:()=>Promise.reject(Error('native error')),shareMaxContent:()=>Promise.reject(Error('native error'))});
 assert.equal(await openLink('https://max.ru/test_bot'),'FAILED');assert.equal(await share('SYNTHETIC','https://max.ru/test_bot'),'FAILED');
 window.WebApp={initData:'SYNTHETIC',platform:'android'};
 assert.equal(await openLink('https://max.ru/test_bot'),'UNSUPPORTED');assert.equal(await share('SYNTHETIC','https://max.ru/test_bot'),'UNSUPPORTED');
});
test('native MAX share receives exact public link synchronously in the click turn',async t=>{
 const calls:{text:string;link:string}[]=[];
 host(t,{initData:'SYNTHETIC',platform:'android',shareMaxContent:params=>{calls.push(params);return undefined}});
 const link='https://max.ru/test_bot?startapp=f_'+'a'.repeat(64);
 const pending=share('Добавиться в друзья в Поводе',link);
 assert.deepEqual(calls,[{text:'Добавиться в друзья в Поводе',link}]);
 assert.equal(await pending,'INVOKED');
});
test('BackButton subscription and cleanup use the same callback',t=>{
 const calls:string[]=[],back=()=>{};host(t,{initData:'SYNTHETIC',platform:'android',BackButton:{onClick(fn){assert.equal(fn,back);calls.push('on');},offClick(fn){assert.equal(fn,back);calls.push('off');},show(){calls.push('show');},hide(){calls.push('hide');}}});
 attachBack(back)();assert.deepEqual(calls,['on','show','off','hide']);
});

test('resolved native error responses are never reported as invoked',async t=>{
 host(t,{initData:'SYNTHETIC',platform:'web',openLink:()=>({error:{code:'synthetic.unsupported'}}),shareMaxContent:()=>({error:{code:'synthetic.unsupported'}})});
 assert.equal(await openLink('https://max.ru/test_bot'),'FAILED');
 assert.equal(await share('SYNTHETIC','https://max.ru/test_bot'),'FAILED');
});
