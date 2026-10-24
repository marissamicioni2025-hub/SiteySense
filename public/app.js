import {getTask,tasks,topics,readTaskChecks} from './tasks.js';
import {assess,buildBriefing} from './safety.js';
import './platform.js';
import {createLiveCamera} from './live-camera.js';
import {scenarios,getScenario} from './scenarios.js';
const $=id=>document.getElementById(id);
let state={task:'roofing',temperature:94,wind:23,rain:false,observations:[],mode:'task',weatherSource:'simulated'},upload=null,objectURL=null,generation=0;
$('task').replaceChildren(...tasks.map(task=>{const option=document.createElement('option');option.value=task.id;option.textContent=task.label;return option;}));
for(const scenario of scenarios){const button=document.createElement('button');button.type='button';button.dataset.scenario=scenario.id;button.innerHTML=`<strong>${scenario.title}</strong><span>${scenario.subtitle}</span>`;button.onclick=()=>demo(scenario.id);$('scenario-options').append(button);}
let checks={};try{checks=JSON.parse(localStorage.getItem('sitesense-checks')||'{}');if(!checks||typeof checks!=='object'||Array.isArray(checks))checks={};}catch{}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,data){const response=await fetch(path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed');return result;}
let briefing='', recorder=null, cameraStream=null, recordTimer=null, recordedDuration=null, capturePending=false;
let visualSummary='Visual conditions have not been confirmed.';
let latestGuidance=[],visionConfigured=null,weatherRevision=0;
const liveCamera=createLiveCamera({video:$('live-video'),open:$('live-open'),close:$('live-close'),flip:$('live-flip'),snapshot:$('live-snapshot'),onBusy:setBusy,
 onStart:()=>{clearMedia();state.mode='upload';clearScenarioSelection();state.observations=[];delete state.detections;delete state.processing;delete state.model;visualSummary='Live camera preview only. No visual assessment has been made.';$('illustration').toggleAttribute('hidden',true);$('scene-note').hidden=true;$('scene-label').textContent='LIVE CAMERA · LOCAL PREVIEW ONLY';$('mode-badge').textContent='LIVE PREVIEW';$('analysis-message').textContent='Camera preview does not detect hazards. Capture a frame or record a clip for a separate review.';render();},
 onMessage:message=>{$('live-status').textContent=message;if(state.mode==='upload'&&!upload){const active=!!$('live-video').srcObject;$('mode-badge').textContent=active?'LIVE PREVIEW':'CAMERA NOT CONNECTED';$('scene-label').textContent=active?'LIVE CAMERA · LOCAL PREVIEW ONLY':'CAMERA NOT CONNECTED · NO ANALYSIS';}}
});
$('camera-shortcut').onclick=()=>{$('visual').scrollIntoView({behavior:'smooth',block:'start'});$('live-open').click();};
$('live-snapshot').addEventListener('camera:frame',event=>{selectFile(event.detail);$('live-status').textContent='Frame captured locally. Preview stopped. The image has not been analyzed or uploaded.';});
async function render(){
 const version=++generation;
 if('speechSynthesis'in window&&speechSynthesis.speaking){speechSynthesis.cancel();$('speech-status').textContent='Review updated. Play the new briefing when ready.';}
 $('temp-display').textContent=Math.round(state.temperature)+'°';$('wind-display').innerHTML=escape(state.wind)+' <span>mph</span>';$('rain-display').textContent=state.rain?'Wet':'Dry';
 $('temp-value').textContent=state.temperature+'°F';$('wind-value').textContent=state.wind+' mph';
 $('timeline').replaceChildren();
 for(const time of [...new Set((state.detections||[]).map(d=>d.time))]){
 const button=document.createElement('button');button.textContent=time.toFixed(1)+'s';button.type='button';button.title='Jump to reviewed moment';button.disabled=$('video').hidden;
 button.onclick=()=>{$('video').currentTime=time;$('video').scrollIntoView({behavior:'smooth',block:'center'});};$('timeline').append(button);
 }
 $('observations').replaceChildren();
 for(const o of state.observations){const div=document.createElement('div');div.className='observation';div.innerHTML=`<span class="timestamp">${state.mode==='demo'?'EXAMPLE · ':''}${o.time}s</span><strong>↗ ${escape({edge:'Roof edge observation',ladder:'Ladder observation',ppe:'Equipment visibility'}[o.category]||o.category)}</strong><p>${escape(o.evidence)}</p>`;$('observations').append(div);}
 try{
 const result=assess(state);if(version!==generation)return;
 latestGuidance=result.guidance;
 $('risk').textContent=result.level;
 $('guidance').innerHTML=result.guidance.map(g=>`<div class="guidance-item"><h3>${escape(g.title)}</h3><p>${escape(g.action)}</p><a href="${escape(g.url)}" target="_blank" rel="noopener noreferrer">${escape(g.source)} ↗</a><details class="source-scope"><summary>Source and scope</summary><p>${escape(g.kind)} · ${escape(g.reviewedAt?'Reviewed '+g.reviewedAt:g.sourceStatus)}</p><p>${escape(g.scope)}</p></details></div>`).join('');
 $('environmental').textContent=result.environmental.join(' ')||'Review the site plan and verify conditions before beginning.';
 briefing=buildBriefing(state);
 $('briefing-text').textContent=briefing;
 }catch(error){$('guidance').textContent=error.message;}
 renderChecks();
}
function renderChecks(){
 const definition=getTask(state.task);const current=readTaskChecks(state.task,checks[state.task]);
 $('checklist').replaceChildren();
 for(const item of definition.checks){
 const row=document.createElement('div');row.className='check-row';
 const label=document.createElement('label');label.className='check';const input=document.createElement('input');input.type='checkbox';input.checked=current[item.id];input.dataset.check=item.id;
 const text=document.createElement('span');text.textContent=item.label;const small=document.createElement('small');small.textContent=input.checked?'Confirmed by you':'Awaiting your confirmation';text.append(small);label.append(input,text);
 const source=document.createElement('a');source.className='check-source';source.href=topics[item.topic].url;source.target='_blank';source.rel='noopener noreferrer';source.textContent=topics[item.topic].source+' ↗';
 input.onchange=()=>{checks[state.task]={...readTaskChecks(state.task,checks[state.task]),[item.id]:input.checked};try{localStorage.setItem('sitesense-checks',JSON.stringify(checks));}catch{$('progress').title='Storage unavailable; confirmations last for this session only.';}renderChecks();};
 row.append(label,source);$('checklist').append(row);
 }
 $('progress').textContent=`${Object.values(current).filter(Boolean).length} / ${definition.checks.length} VERIFIED`;
}

function beginReview(clearNote=true){
 clearMedia();checks[state.task]={};try{localStorage.setItem('sitesense-checks',JSON.stringify(checks));}catch{}
 state.mode='task';clearScenarioSelection();state.observations=[];delete state.detections;delete state.processing;delete state.model;
 if(clearNote)$('review-note').value='';
 visualSummary='New review. Visual conditions have not been confirmed.';$('illustration').toggleAttribute('hidden',false);$('illustration').style.filter='';$('scene-note').hidden=true;$('mode-badge').textContent='YOUR WORKSPACE';$('scene-label').textContent='ILLUSTRATION · NO CAMERA CONNECTED';
 $('analysis-message').textContent='Choose your camera or add footage for this review. No visual conditions have been confirmed.';
 $('task-status').textContent=clearNote?'Fresh review started. Confirm each check again.':'Conditions recheck started. Prior confirmations and visual results cleared; your unsaved note was kept.';render();
}
$('new-task').onclick=()=>beginReview();$('reset').onclick=()=>beginReview(false);
$('task').onchange=()=>{state.task=$('task').value;$('review-note').value='';$('task-status').textContent='Showing this task’s saved confirmations. Start a fresh review for a new job.';render();};

for(const id of ['temp','wind','rain'])$(id).oninput=()=>{weatherRevision++;state.weatherSource='simulated';state.temperature=Number($('temp').value);state.wind=Number($('wind').value);state.rain=$('rain').checked;$('weather-badge').textContent='SIMULATED';$('weather-summary').textContent='What-if scenario';$('weather-message').textContent='Simulated values. Not current site conditions.';render();};
$('weather').onclick=async()=>{const revision=++weatherRevision;const button=$('weather');button.disabled=true;$('weather-message').textContent='Retrieving NWS hourly forecast…';try{const data=await api(`/api/weather?lat=${encodeURIComponent($('lat').value)}&lon=${encodeURIComponent($('lon').value)}`);if(revision!==weatherRevision){$('weather-message').textContent='Forecast request finished; your newer simulated conditions were kept.';return;}state.weatherSource='forecast';state.temperature=Math.round(data.temperature);state.wind=data.wind;state.rain=/rain|shower|thunder|snow/i.test(data.summary);$('temp').value=state.temperature;$('wind').value=state.wind;$('rain').checked=state.rain;$('weather-badge').textContent='NWS FORECAST';$('weather-summary').textContent=data.summary;$('weather-message').textContent=`Forecast for ${new Date(data.period).toLocaleString()}. Updated ${new Date(data.updated).toLocaleString()}. Wind is forecast wind, not measured gusts.`;document.querySelector('.location').textContent=`↗ ${$('lat').value}, ${$('lon').value}`;render();}catch(error){if(revision===weatherRevision)$('weather-message').textContent=error.message+'. Existing conditions retained.';}finally{button.disabled=false;}};
function clearMedia(){liveCamera.stop();stopCamera();recordedDuration=null;$('coverage').hidden=true;$('coverage').textContent='';if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;upload=null;$('upload').value='';$('video').pause();$('video').removeAttribute('src');$('video').load();$('photo').removeAttribute('src');$('video').hidden=true;$('photo').hidden=true;}
function demo(id='roof-edge'){
 const scenario=getScenario(id);$('walkthrough').open=true;clearMedia();state.mode='demo';state.scenarioId=id;state.detections=scenario.detections;state.observations=scenario.observations;delete state.processing;delete state.model;
 $('illustration').toggleAttribute('hidden',false);$('illustration').style.filter=scenario.dim?'brightness(.15) blur(4px)':'';
 $('scene-note').hidden=scenario.dim;$('scene-note').replaceChildren();const title=document.createElement('span');title.textContent=scenario.title;const small=document.createElement('small');small.textContent='Scripted moment · '+scenario.time+'s';$('scene-note').append(title,small);
 visualSummary=scenario.summary;$('scene-label').textContent='ILLUSTRATION · SCRIPTED EXAMPLE · '+scenario.time+'s';$('mode-badge').textContent='SCRIPTED EXAMPLE';
 $('scenario-description').textContent='Scripted example — not an analysis of your camera. '+scenario.summary+' '+scenario.limitation;
 $('analysis-message').textContent=scenario.summary+' This example does not describe your camera or upload.';
 for(const button of $('scenario-options').children)button.setAttribute('aria-pressed',String(button.dataset.scenario===id));
 render();
}
$('demo').onclick=()=>demo();$('dim').onclick=()=>demo('poor-light');
function clearScenarioSelection(){delete state.scenarioId;for(const button of $('scenario-options').children)button.setAttribute('aria-pressed','false');$('scenario-description').textContent='Your upload is separate from the scripted scenarios. Choose an example above to return to the illustrated walkthrough.';}
function selectFile(file,duration=null){
 if(!file)return;
 if(file.size>40*1024*1024){$('analysis-message').textContent='Please choose a file under 40 MB.';return;}
 if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.type.split(';')[0])){$('analysis-message').textContent='Choose a JPEG, PNG, WebP, MP4 or WebM file.';return;}
 clearMedia();$('consent').checked=false;upload=file;recordedDuration=duration;objectURL=URL.createObjectURL(file);
 const el=file.type.startsWith('video')?$('video'):$('photo');el.src=objectURL;el.hidden=false;
 $('illustration').toggleAttribute('hidden',true);$('scene-note').hidden=true;$('scene-label').textContent='LOCAL PREVIEW · NOT YET ANALYZED';$('mode-badge').textContent='UPLOAD';
 state.observations=[];delete state.detections;delete state.processing;delete state.model;state.mode='upload';clearScenarioSelection();visualSummary='Footage not yet analyzed.';
 $('analysis-message').textContent='Preview stays on this device. Grant permission below, then analyze. Agentic review sends the clip to Google; quick check sends four frames. No footage is stored by this app.';
 render();
}
$('upload').onchange=()=>selectFile($('upload').files[0]);
$('phone-photo').onchange=()=>{selectFile($('phone-photo').files[0]);$('phone-photo').value='';};
$('capture-photo').onclick=()=>$('phone-photo').click();
function stopCamera(){if(recordTimer)clearInterval(recordTimer);recordTimer=null;if(recorder&&recorder.state!=='inactive')recorder.stop();if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;$('video').srcObject=null;$('video').muted=false;$('stop-recording').hidden=true;$('record').disabled=false;$('record-clock').textContent='';}
$('record').onclick=async()=>{
 if(capturePending)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){$('analysis-message').textContent='In-browser recording needs a supported browser and HTTPS. Use your phone camera and Upload footage instead.';return;}
 capturePending=true;liveCamera.stop();setBusy(true);
 try{
 const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
 clearMedia();cameraStream=stream;state.mode='upload';clearScenarioSelection();state.observations=[];delete state.detections;delete state.processing;delete state.model;visualSummary='Recording in progress; footage has not been analyzed.';render();
 $('illustration').toggleAttribute('hidden',true);$('photo').hidden=true;$('scene-note').hidden=true;$('video').hidden=false;$('video').muted=true;$('video').srcObject=stream;await $('video').play();
 const mime=['video/webm;codecs=vp8','video/mp4','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 recorder=mime?new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1_500_000}):new MediaRecorder(stream);
 const chunks=[];const started=Date.now();
 recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
 recorder.onerror=()=>{stopCamera();setBusy(false);$('analysis-message').textContent='Recording failed. Please upload a clip from your phone camera.';};
 recorder.onstop=()=>{const duration=Math.min(30,(Date.now()-started)/1000);const type=(recorder.mimeType||'video/webm').split(';')[0];const file=new File(chunks,['site-clip',type==='video/mp4'?'mp4':'webm'].join('.'),{type});recorder=null;stopCamera();setBusy(false);if(file.size)selectFile(file,duration);};
 recorder.start(500);$('record').disabled=true;$('stop-recording').hidden=false;$('mode-badge').textContent='RECORDING';$('scene-label').textContent='CAMERA · RECORDING LOCALLY';
 $('analysis-message').textContent='Recording video only, without microphone audio. Stops automatically at 30 seconds. Nothing is sent until you analyze.';
 recordTimer=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);$('record-clock').textContent=seconds+' / 30 sec';if(seconds>=30)stopCamera();},250);
 }catch(error){stopCamera();setBusy(false);$('analysis-message').textContent='Camera could not start. Check browser permission or upload a photo or clip instead.';}
 finally{capturePending=false;}
};
$('stop-recording').onclick=stopCamera;
window.addEventListener('pagehide',stopCamera);

async function ready(el,event){if(el instanceof HTMLVideoElement?el.readyState>=2:el.complete&&el.naturalWidth)return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(Error('Media could not be loaded. Try a different file.'));},12000);const cleanup=()=>{clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad);};const ok=()=>{cleanup();resolve();};const bad=()=>{cleanup();reject(Error('Media could not be decoded.'));};el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});});}
async function frames(){const canvas=document.createElement('canvas');const context=canvas.getContext('2d');const isVideo=upload.type.startsWith('video');const el=isVideo?$('video'):$('photo');await ready(el,isVideo?'loadeddata':'load');const duration=recordedDuration||el.duration;if(isVideo&&(!Number.isFinite(duration)||duration>30))throw Error('Choose a clip of 30 seconds or less.');const width=isVideo?el.videoWidth:el.naturalWidth,height=isVideo?el.videoHeight:el.naturalHeight;canvas.width=Math.min(width,960);canvas.height=Math.round(height*canvas.width/width);const times=isVideo?[0.1,0.33,0.66,0.95].map(f=>Math.round(duration*f*100)/100):[0];const samples=[];for(const time of times){if(isVideo){el.pause();if(Math.abs(el.currentTime-time)>.01)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{el.removeEventListener('seeked',done);reject(Error('Could not sample video.'));},7000);const done=()=>{clearTimeout(timer);resolve();};el.addEventListener('seeked',done,{once:true});el.currentTime=time;});}context.drawImage(el,0,0,canvas.width,canvas.height);samples.push({time,image:canvas.toDataURL('image/jpeg',.8)});}return samples;}
function setBusy(busy){for(const id of ['analyze','upload','phone-photo','demo','dim','record','capture-photo','review-mode','live-open','camera-shortcut','new-task','reset'])$(id).disabled=busy;for(const button of $('scenario-options').children)button.disabled=busy;}
async function videoPayload(){
 const el=$('video');await ready(el,'loadeddata');const duration=recordedDuration||el.duration;
 if(!Number.isFinite(duration)||duration<=0||duration>30)throw Error('Choose a clip of 30 seconds or less.');
 if(upload.size>14*1024*1024)throw Error('Agentic clips must be under 14 MB. Trim the clip or select Quick check.');
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Could not read this clip.'));reader.readAsDataURL(upload);});
 return {mimeType:upload.type.split(';')[0],duration,data};
}
$('analyze').onclick=async()=>{
 if(!upload){$('analysis-message').textContent='Upload a photo or short video first. Demo scenarios do not use a model.';return;}
 if(visionConfigured===false||!navigator.onLine){$('analysis-message').textContent='Automatic analysis is unavailable here. Your upload has not been analyzed. Explore a scripted example above to continue without a key or connection.';$('demo-picker').scrollIntoView({behavior:'smooth',block:'center'});return;}
 if(!$('consent').checked){$('analysis-message').textContent='Please confirm permission to send this footage to Google before analyzing.';$('consent').focus();return;}
 const agentic=upload.type.startsWith('video')&&$('review-mode').value==='agentic';
 setBusy(true);state.observations=[];delete state.detections;delete state.processing;delete state.model;state.mode='upload';visualSummary='Review in progress. No visual conditions confirmed.';render();
 $('analysis-message').textContent=agentic?'Sending your clip for agentic review. The model will select relevant moments; this may take a minute…':'Requesting structured checks on selected frames…';
 try{
 const data=agentic?await api('/api/analyze-video',{video:await videoPayload()}):await api('/api/analyze',{frames:await frames()});
 state.mode='model';state.detections=data.detections;state.observations=data.observations;state.processing=data.processing;state.model=data.model;
 $('mode-badge').textContent=agentic?'VIDEO REVIEW':'MODEL RESPONSE';$('scene-label').textContent=(agentic?'CLIP REVIEW · ':'SELECTED FRAMES · ')+data.model;
 visualSummary=data.quality==='insufficient'?'Visibility insufficient. No visual assessment could be made.':data.reason||'Selected views reviewed.';
 $('analysis-message').textContent=visualSummary+' This is not an all-clear. Verify site conditions directly.';
 $('coverage').hidden=false;$('coverage').textContent=agentic?(data.processing?.confirmed?`Agentic trace confirmed · ${data.processing.calls} processing call(s). Selected moments only; the rest of the clip is not certified as checked.`:'Agentic processing requested, but no complete processing trace was returned. Agentic navigation is unconfirmed.'): 'Quick check · selected frames only. Events between frames may be missed.';
 render();
 }catch(error){visualSummary='Visual check unavailable. No assessment was made.';$('analysis-message').textContent=error.message+' No assessment was made. Explore a labeled example if needed.';$('coverage').hidden=true;render();}
 finally{setBusy(false);}
};
$('brief').onclick=()=>{if(!('speechSynthesis'in window)){$('speech-status').textContent='Speech is unavailable in this browser. Read the briefing below.';return;}speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(briefing);utterance.rate=.95;utterance.onstart=()=>{$('speech-status').textContent='Speaking briefing…';};utterance.onend=()=>{$('speech-status').textContent='Briefing complete.';};utterance.onerror=()=>{$('speech-status').textContent='Speech could not play. Read the briefing above.';};speechSynthesis.speak(utterance);};
api('/api/status').then(s=>{visionConfigured=s.visionConfigured;$('vision-status').textContent=s.visionConfigured?'Vision model configured':'Camera & checklists · no key needed';}).catch(()=>{$('vision-status').textContent='Offline workspace · AI needs connection';});
$('scenario-description').textContent='Scripted examples explain the workflow. They never analyze or describe your camera.';render();

$('stop-speech').onclick=()=>{if('speechSynthesis'in window)speechSynthesis.cancel();$('speech-status').textContent='Audio stopped.';};
$('download-report').onclick=()=>{
 const report={project:'SiteySense AI',created:new Date().toISOString(),task:state.task,mode:state.mode,scenarioId:state.scenarioId||null,note:$('review-note').value.trim(),visualSummary,conditions:{temperatureF:state.temperature,windMph:state.wind,wet:state.rain,source:$('weather-badge').textContent,details:$('weather-message').textContent},detections:state.detections||[],processing:state.processing||null,visionModel:state.model||null,observations:state.observations,taskLabel:getTask(state.task).label,checklist:getTask(state.task).checks,workerConfirmations:readTaskChecks(state.task,checks[state.task]),briefing,guidance:latestGuidance,limitation:'Decision support only. Not an all-clear. No injury probability, compliance certification, or comprehensive video coverage.'};
 window.dispatchEvent(new CustomEvent('sitesense:save-review',{detail:report}));
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='siteysense-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
