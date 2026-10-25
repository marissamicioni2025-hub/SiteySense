import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',...(process.env.CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[])]});
try{
 const context=await browser.newContext({serviceWorkers:'block',permissions:['camera'],viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];let frames=0,authorizations=0,connections=0;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/status',route=>route.fulfill({json:{visionConfigured:true,liveEnabled:true,model:'mock',liveModel:'mock-live',extendedChecks:false}}));
 await page.routeWebSocket('**/api/live',ws=>{connections++;ws.onMessage(raw=>{const message=JSON.parse(raw);if(message.type==='authorize'){assert.equal(message.code,'test-team-code');authorizations++;ws.send(JSON.stringify({type:'connected',model:'mock-live',sessionSeconds:120}));ws.send(JSON.stringify({type:'ready'}));}if(message.type==='frame'){frames++;assert.match(message.image,/^data:image\/jpeg;base64,/);assert.ok(!raw.includes('test-team-code'));ws.send(JSON.stringify({type:'observation',viewId:message.viewId,frame:{time:3,quality:'usable',edgeProximity:{confidence:.95,nearEdge:true},ppeEye:{confidence:.1,missingEyeProtection:null}},checkedAt:new Date().toISOString(),model:'mock-live'}));}});});
 await page.goto(process.env.SITESENSE_URL||'http://127.0.0.1:3000');await page.getByText('Vision model configured',{exact:true}).waitFor();
 await page.click('#start-live-review');await page.getByText('Open live camera and allow camera permission first.',{exact:true}).waitFor();assert.equal(connections,0);
 await page.click('#camera-shortcut');await page.waitForFunction(()=>document.getElementById('live-video').readyState>=2);
 await page.click('#start-live-review');await page.getByText('Confirm permission to send footage to Google before starting Gemini Live.',{exact:true}).waitFor();assert.equal(frames,0);
 await page.check('#consent');await page.fill('#live-access-code','test-team-code');await page.click('#start-live-review');await page.getByText('LIVE · LAST FRAME',{exact:true}).waitFor();await page.locator('#briefing-text').filter({hasText:'suggests proximity'}).waitFor();assert.equal(authorizations,1);assert.equal(frames,1);assert.equal(await page.locator('#live-access-code').inputValue(),'');
 await page.click('#stop-live-review');await page.waitForTimeout(3400);assert.equal(frames,1);assert.ok(await page.locator('#live-video').evaluate(video=>video.srcObject.active));
 await page.fill('#live-access-code','test-team-code');await page.click('#start-live-review');await page.waitForFunction(()=>document.querySelector('#live-review-status').textContent.includes('Last frame checked'));assert.equal(frames,2);
 await page.click('#live-close');await page.getByText('Gemini Live stopped with the camera.',{exact:false}).waitFor();assert.ok(await page.locator('#live-video').evaluate(video=>video.srcObject===null));
 await page.setViewportSize({width:1440,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 console.log('Live browser passed: camera/consent/access-code prerequisites, sampled JPEG stream, fixed reminders, no overlapping requests, stop/restart and camera cleanup. Provider WebSocket and camera mocked.');
}finally{await browser.close();}
