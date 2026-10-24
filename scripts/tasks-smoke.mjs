import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {tasks} from '../public/tasks.js';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),...(process.env.CHROMIUM_NO_SANDBOX==='1'?{args:['--no-sandbox']}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{if(!localStorage.getItem('sitesense-checks'))localStorage.setItem('sitesense-checks',JSON.stringify({roofing:{0:true,1:false,2:true},ladder:{1:true}}));if(!localStorage.getItem('sitesense-reviews-v1'))localStorage.setItem('sitesense-reviews-v1',JSON.stringify([{project:'SiteSense AI',created:'2026-10-01T12:00:00Z',task:'ladder',mode:'demo',briefing:'Legacy saved review'}]));});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SITESENSE_URL||'http://127.0.0.1:3000');
 assert.match(await page.title(),/SiteySense/);assert.equal(await page.locator('#task option').count(),10);
 await page.getByText('2 / 3 VERIFIED',{exact:true}).waitFor();
 assert.ok((await page.locator('#camera-shortcut').boundingBox()).y<650);
 await page.click('#mobile-reviews');await page.getByText('Legacy saved review',{exact:true}).waitFor();await page.getByRole('button',{name:'Close saved reviews'}).click();
 for(const task of tasks){await page.selectOption('#task',task.id);assert.equal(await page.locator('#checklist input').count(),task.checks.length);await page.locator('#briefing-text').filter({hasText:'Before '+task.briefing}).waitFor();const links=await page.locator('#checklist a').evaluateAll(links=>links.map(a=>a.href));assert.ok(links.every(link=>new URL(link).hostname==='www.osha.gov'));if(!['roofing','ladder'].includes(task.id)){await page.getByText(`0 / ${task.checks.length} VERIFIED`,{exact:true}).waitFor();await page.locator('#checklist input').first().check();}}
 await page.selectOption('#task','tools');await page.getByText('1 / 4 VERIFIED',{exact:true}).waitFor();
 await page.fill('#review-note','Supervisor discussion: review dust controls.');
 assert.ok(!(await page.evaluate(()=>localStorage.getItem('sitesense-reviews-v1'))).includes('review dust controls'));
 const downloading=page.waitForEvent('download');await page.click('#download-report');const file=await downloading;const stream=await file.createReadStream();let body='';for await(const chunk of stream)body+=chunk;const report=JSON.parse(body);
 assert.equal(report.project,'SiteySense AI');assert.equal(report.task,'tools');assert.equal(report.note,'Supervisor discussion: review dust controls.');assert.equal(file.suggestedFilename(),'siteysense-review.json');assert.ok(report.workerConfirmations['tool-condition']);assert.ok(!body.includes('base64'));
 await page.reload();await page.selectOption('#task','tools');await page.getByText('1 / 4 VERIFIED',{exact:true}).waitFor();
 await page.click('#mobile-reviews');await page.getByText('Your note: Supervisor discussion: review dust controls.',{exact:true}).waitFor();await page.getByText('Legacy saved review',{exact:true}).waitFor();await page.getByRole('button',{name:'Close saved reviews'}).click();
 await page.fill('#review-note','Keep this note for recheck');await page.locator('#walkthrough').evaluate(el=>el.open=true);await page.click('[data-scenario="roof-edge"]');await page.click('#reset');assert.equal(await page.locator('.observation').count(),0);await page.getByText('0 / 4 VERIFIED',{exact:true}).waitFor();assert.equal(await page.locator('#review-note').inputValue(),'Keep this note for recheck');
 await page.click('#new-task');assert.equal(await page.locator('#review-note').inputValue(),'');
 await page.selectOption('#task','roofing');await page.getByText('2 / 3 VERIFIED',{exact:true}).waitFor();
 await page.locator('.guidance-item>summary').first().click();await page.locator('.source-scope summary').first().click();await page.getByText(/Source review pending/).first().waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:1100});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/siteysense-expanded-desktop.png',fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/siteysense-expanded-mobile.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);console.log('Tasks browser passed: branding, camera placement, ten checklists/briefings, legacy confirmations and saved reviews, isolation, note opt-in/export, fresh review, conditions recheck and source scope.');
}finally{await browser.close();}
