import {taskVisionResults} from './task-vision.js';
export function liveNarrationText(message,task,firstPerson){
 const frame=message.frame;
 if(frame.quality==='insufficient')return 'The view is unclear. Pause to steady the camera and look toward the work area in better light. I cannot verify conditions from this image.';
 const parts=[];
 if(['roofing','scaffold'].includes(task)&&frame.edgeProximity?.nearEdge===true&&frame.edgeProximity.confidence>=.8)parts.push('An exposed edge appears in view. Verify your fall-protection plan and connection before approaching.');
 const cues=taskVisionResults(task,frame).filter(c=>c.result===true&&['opening','debris','routeObstruction','nearbyPerson'].includes(c.id));
 for(const cue of cues.slice(0,2))parts.push(cue.text);
 if(!firstPerson&&frame.ppeEye?.missingEyeProtection===true&&frame.ppeEye.confidence>=.8)parts.push('Eye protection may be missing on the visible person. Confirm the protection required for the task.');
 if(parts.length)return parts.join(' ');
 if(['no_person','no_visible_work'].includes(message.sceneActivity))return firstPerson?'I’m checking your surroundings. No work activity is apparent in this sampled view; the wearer may be outside the frame. Look toward the task area and access route.':'No work activity is apparent in this sampled view. Show the task area and equipment for the next check.';
 return 'I checked this sampled view. No configured visual concern was identified with enough confidence to report. Keep checking your surroundings and follow the task checklist; this is not an all-clear.';
}
export function createLiveNarration({speech,enabled,output,now=Date.now}){
 let active=false,last='',lastAt=-Infinity;
 return {start(){active=true;last='';lastAt=-Infinity;if(enabled.checked)speech.speak('Starting Live review. I will read brief updates when observations change.',true);},stop(){if(active)speech.stop();active=false;},update(message,task,firstPerson){
 if(!active||!enabled.checked)return;
 const text=liveNarrationText(message,task,firstPerson),time=now();
 if(text===last||time-lastAt<15000)return;
 if(speech.speakLive(text)){last=text;lastAt=time;output.textContent=text;}
 }};
}
