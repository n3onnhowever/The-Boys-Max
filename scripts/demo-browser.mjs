import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {buildApp} from '../apps/api/app.ts';
import {sign} from '../tests/fixtures.ts';
import {launchPovodBrowser} from './lib/povod-browser.mjs';
import {DEMO_NOTICE} from '../packages/demo/constants.ts';

const databaseUrl=process.env.DEMO_TEST_DATABASE_URL;
if(!databaseUrl||new URL(databaseUrl).hostname!=='127.0.0.1'||new URL(databaseUrl).pathname!=='/povod_demo_verify')throw Error('ISOLATED_DEMO_DB_REQUIRED');
const origin='http://127.0.0.1:3000';
const cfg={mode:'demo',demoCatalogVersion:'v3',databaseUrl,redisUrl:'redis://127.0.0.1:6379',publicOrigin:origin,
 sessionKey:randomBytes(32).toString('hex'),escrowKey:randomBytes(32).toString('hex'),botToken:randomBytes(24).toString('hex'),webhookSecret:randomBytes(32).toString('hex'),
 credentialScope:'DEMO_BROWSER_VERIFY',cookieProfile:'LAX_FIRST_PARTY',ingressMode:'WEBHOOK',liveGate:''};
const {app,pool,sessions}=await buildApp(cfg);
let browser=null;
try{
 const boot=await sessions.bootstrap(),external=BigInt('0x'+randomBytes(7).toString('hex')).toString();
 const exchange=await sessions.exchange(boot.binding,boot.body.csrfToken,sign(cfg.botToken,`{"id":${external},"first_name":"DEMO_BROWSER"}`,Math.floor(Date.now()/1000),{query_id:randomUUID()}),randomUUID(),undefined);
 await app.listen({host:'127.0.0.1',port:3000});
 browser=await launchPovodBrowser();
 await browser.send('Storage.setCookies',{cookies:[{name:'__Host-max_session',value:exchange.token,url:origin,secure:true,httpOnly:true,sameSite:'Lax'}]});
 const page=await browser.open(origin+'/');
 await browser.until(page,'document.querySelector(".demo-catalog-notice")?.getAttribute("aria-label")==='+JSON.stringify(DEMO_NOTICE));
 await browser.until(page,'Boolean(document.querySelector(".event-card-compact h3"))');
 const title=await browser.evaluate(page,'document.querySelector(".event-card-compact h3").textContent');
 assert.equal(await browser.evaluate(page,'(()=>{const button=document.querySelector(".event-card-compact .event-card-image-button");if(!button||button.disabled)return false;button.click();return true})()'),true);
 await browser.until(page,'Boolean(document.querySelector(".detail-screen .detail-secondary-actions button:first-child:not(:disabled)"))');
 const saveButton='.detail-screen .detail-secondary-actions button:first-child';
 assert.equal(await browser.evaluate(page,'document.querySelector('+JSON.stringify(saveButton)+').getAttribute("aria-pressed")'),'false');
 await browser.evaluate(page,'document.querySelector('+JSON.stringify(saveButton)+').click()');
 await browser.until(page,'document.querySelector('+JSON.stringify(saveButton)+').getAttribute("aria-pressed")==="true"');
 await browser.send('Page.navigate',{url:origin+'/?ui=saved'},page.sessionId);
 await browser.until(page,'[...document.querySelectorAll(".saved-screen .event-list-card")].some(x=>x.textContent.includes('+JSON.stringify(title)+'))');
 assert.equal(await browser.evaluate(page,'document.querySelector(".saved-screen .demo-catalog-card-label")?.textContent'),'Демо-каталог');
 await browser.send('Page.reload',{},page.sessionId);
 await browser.until(page,'Boolean(document.querySelector(".saved-screen"))');
 await browser.until(page,'[...document.querySelectorAll(".saved-screen .event-list-card")].some(x=>x.textContent.includes('+JSON.stringify(title)+'))');
 const count=await pool.query('SELECT count(*)::int AS n FROM saved_occurrences WHERE actor_id=$1',[exchange.body.actor.id]);
 assert.equal(count.rows[0].n,1);assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
 console.log('PASS demo browser Detail → Save → Saved → reload with authenticated canonical persistence and notice');
 await browser.closePage(page);
}finally{if(browser)await browser.close();await app.close();}
