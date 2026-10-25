import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',...(process.env.CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[])]});
try{
 const context=await browser.newContext({serviceWorkers:'block',permissions:['camera']});
 await context.addInitScript(()=>{
 window.speechTest={spoken:[],cancelled:0,speaking:false};
 const voices=[{voiceURI:'test-calm',name:'Calm English',lang:'en-US',localService:true,default:true},{voiceURI:'test-natural',name:'Natural English',lang:'en-GB',localService:true}];
 window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>voices,addEventListener(){},get speaking(){return window.speechTest.speaking;},cancel(){window.speechTest.cancelled++;window.speechTest.speaking=false;},speak(utterance){window.speechTest.spoken.push({text:utterance.text,voice:utterance.voice?.voiceURI,rate:utterance.rate});window.speechTest.speaking=true;utterance.onstart?.();}}});
 });
 const page=await context.newPage();let liveSocket,frameCount=0;
 await page.route('**/api/status',route=>route.fulfill({json:{visionConfigured:true,liveEnabled:true,liveModel:'mock-live'}}));
 await page.routeWebSocket('**/api/live',ws=>{liveSocket=ws;ws.onMessage(raw=>{const message=JSON.parse(raw);if(message.type==='authorize'){ws.send(JSON.stringify({type:'connected',model:'mock-live',sessionSeconds:120}));ws.send(JSON.stringify({type:'ready'}));}if(message.type==='frame'){frameCount++;ws.send(JSON.stringify({type:'observation',frame:{time:frameCount*3,quality:'usable',edgeProximity:{confidence:.95,nearEdge:true},ppeEye:{confidence:.1,missingEyeProtection:null}},model:'mock-live',checkedAt:new Date().toISOString()}));}});});
 await page.goto(process.env.SITESENSE_URL||'http://127.0.0.1:3000');await page.locator('#briefing-voice option[value="test-calm"]').waitFor({state:'attached'});
 await page.selectOption('#briefing-voice','test-calm');await page.selectOption('#briefing-rate','0.85');await page.click('#preview-voice');let result=await page.evaluate(()=>window.speechTest.spoken.at(-1));assert.equal(result.voice,'test-calm');assert.equal(result.rate,.85);assert.match(result.text,/briefing voice/);
 await page.click('#brief');result=await page.evaluate(()=>window.speechTest.spoken.at(-1));assert.match(result.text,/Before roofing/);assert.doesNotMatch(result.text,/Precipitation is forecast/);
 await page.click('#stop-speech');assert.equal(await page.evaluate(()=>window.speechTest.speaking),false);
 await page.reload();assert.equal(await page.locator('#briefing-voice').inputValue(),'test-calm');assert.equal(await page.locator('#briefing-rate').inputValue(),'0.85');
 await page.locator('#walkthrough').evaluate(el=>el.open=true);await page.click('[data-scenario="poor-light"]');await page.click('#brief');result=await page.evaluate(()=>window.speechTest.spoken.at(-1));assert.match(result.text,/can’t get a clear view/);assert.doesNotMatch(result.text,/put gloves on|eye protection is missing/i);
 const before=await page.evaluate(()=>window.speechTest.cancelled);await page.selectOption('#task','ladder');assert.ok(await page.evaluate(()=>window.speechTest.cancelled)>before);
 await page.selectOption('#task','roofing');await page.click('#camera-shortcut');await page.waitForFunction(()=>document.getElementById('live-video').readyState>=2);await page.check('#consent');await page.fill('#live-access-code','test-code');await page.click('#start-live-review');await page.locator('#briefing-text').filter({hasText:'suggests proximity'}).waitFor();await page.click('#brief');const cancellations=await page.evaluate(()=>window.speechTest.cancelled);liveSocket.send(JSON.stringify({type:'ready'}));await page.waitForTimeout(3500);assert.ok(frameCount>=2);assert.equal(await page.evaluate(()=>window.speechTest.cancelled),cancellations);assert.equal(await page.evaluate(()=>window.speechTest.speaking),true);await page.click('#stop-live-review');await page.click('#live-close');
 console.log('Speech browser passed: device voice selection, speed, preview, saved preferences, fixed briefing playback, stop, unclear-view wording and changed-briefing cancellation, and uninterrupted playback across identical Live updates. Voices and audio mocked.');
}finally{await browser.close();}
