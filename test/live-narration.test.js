import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLiveNarration,liveNarrationText} from '../public/live-narration.js';
import {liveConfig} from '../live.js';
const message={sceneActivity:'no_person',frame:{quality:'usable',edgeProximity:{nearEdge:null,confidence:0},ppeEye:{missingEyeProtection:null,confidence:0}}};
test('first person speech does not mistake absent wearer for inactivity or missing PPE',()=>{
 const text=liveNarrationText(message,'roofing',true);
 assert.match(text,/wearer may be outside/);assert.doesNotMatch(text,/missing|not working/);
 assert.match(liveConfig('roofing',true).systemInstruction,/first-person wearable/);
});
test('Live speech deduplicates, throttles, respects mute and stops with session',()=>{
 let time=0,stopped=0;const spoken=[],enabled={checked:true},output={};
 const narration=createLiveNarration({speech:{speak:()=>{},speakLive:t=>{spoken.push(t);return true;},stop:()=>stopped++},enabled,output,now:()=>time});
 narration.start();narration.update(message,'roofing',true);narration.update(message,'roofing',true);assert.equal(spoken.length,1);
 const poor={...message,frame:{...message.frame,quality:'insufficient'}};
 narration.update(poor,'roofing',true);assert.equal(spoken.length,1);
 time=16000;narration.update(poor,'roofing',true);assert.equal(spoken.length,2);assert.match(output.textContent,/unclear/);
 enabled.checked=false;time=32000;narration.update(message,'roofing',true);assert.equal(spoken.length,2);
 narration.stop();assert.equal(stopped,1);enabled.checked=true;narration.update(message,'roofing',true);assert.equal(spoken.length,2);
});
