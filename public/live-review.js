export function describeLiveScene(activity,quality){
 if(quality==='insufficient'||activity==='unclear'||!activity)return 'I can’t clearly identify work activity in this frame. Steady the camera and show the work area in better light.';
 return {
 work_visible:'Work activity appears visible in this frame. Show the task area, access route and relevant protective equipment for the next check.',
 no_visible_work:'A person is visible, but no work activity is apparent in this frame. If you’re preparing for a task, point the camera at the work area and equipment. Sitting or waiting is not itself a safety issue.',
 no_person:'No person is visible in this frame. Show the worker and task area if you want a worker or eye-protection check.'
 }[activity]||'Activity could not be identified. Show the work area for the next check.';
}
export function createLiveReview({video,start,stop,status,stage,consent,accessCode,onResult,onClear,getTask=()=>'roofing'}){
 let configured=false,socket=null,pump=null,epoch=0,inFlight=false,lastSent=0,id=0,lastResult=null;
 function end(message='Gemini Live stopped. No more camera frames are being sent.'){
 epoch++;clearInterval(pump);pump=null;inFlight=false;
 if(socket){const old=socket;socket=null;old.close();}
 start.disabled=false;stop.hidden=true;stage.textContent='AI review stopped';status.textContent=message;
 }
 function sendFrame(){
 if(inFlight||!socket||socket.readyState!==1||video.readyState<2||!video.srcObject||Date.now()-lastSent<3100)return;
 const canvas=document.createElement('canvas');canvas.width=Math.min(768,video.videoWidth);canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth);if(!canvas.width||!canvas.height)return;
 canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
 socket.send(JSON.stringify({type:'frame',viewId:++id,image:canvas.toDataURL('image/jpeg',.65)}));inFlight=true;lastSent=Date.now();stage.textContent='Checking a sampled frame';status.textContent='Gemini Live is checking one sampled frame. Other moments are not verified.';
 }
 start.onclick=()=>{
 if(socket)return;
 if(!configured){stage.textContent='Server setup incomplete';status.textContent='Gemini Live is not enabled on the server. Configure its Live settings before starting.';return;}
 if(!video.srcObject){stage.textContent='Step 1 · Open the camera';status.textContent='Open live camera and allow camera permission first.';return;}
 if(!consent.checked){stage.textContent='Step 2 · Confirm upload permission';status.textContent='Confirm permission to send footage to Google before starting Gemini Live.';consent.focus();return;}
 if(!accessCode.value){stage.textContent='Step 3 · Enter session code';status.textContent='Enter the Gemini Live session code set for this app in Render.';accessCode.focus();return;}
 document.getElementById('live-scene-result').textContent='Waiting for the first Gemini observation…';onClear();lastResult=null;const code=accessCode.value;const current=++epoch;start.disabled=true;stop.hidden=false;stage.textContent='Connecting to the SiteySense server';status.textContent='Connecting to Gemini Live…';
 const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/live`);socket=ws;ws.onopen=()=>{if(current===epoch){ws.send(JSON.stringify({type:'authorize',code,task:getTask()}));accessCode.value='';}};
 ws.onmessage=event=>{if(current!==epoch)return;let message;try{message=JSON.parse(event.data);}catch{end('Invalid Live response. No assessment is available.');return;}
 if(message.type==='connecting'){stage.textContent='Session code accepted · connecting to Google';status.textContent='Opening Gemini Live model '+message.model+'…';}
 if(message.type==='connected'){stage.textContent='Connected to Gemini Live';status.textContent=`Connected to ${message.model}. Sampled frames only; session limit ${message.sessionSeconds} seconds. Model usage may incur charges.`;pump=setInterval(sendFrame,3200);}
 if(message.type==='ready'){inFlight=false;sendFrame();}
 if(message.type==='observation'){document.getElementById('live-scene-result').textContent=describeLiveScene(message.sceneActivity,message.frame?.quality)+' Last checked '+new Date(message.checkedAt).toLocaleTimeString()+'. This describes one sampled frame, not continuous activity tracking.';lastResult=message.checkedAt;stage.textContent='Structured result received';status.textContent='Last frame checked at '+new Date(message.checkedAt).toLocaleTimeString()+'. The current moving view may differ.';onResult(message);}
 if(message.type==='error'){end(message.message+(message.code?' ['+message.code+']':''));}
 };
 ws.onerror=()=>{if(current===epoch)end('Live connection failed. Check Render Live configuration, model access and network settings.');};
 ws.onclose=()=>{if(current===epoch)end(lastResult?'Live connection closed. Last frame checked at '+new Date(lastResult).toLocaleTimeString()+'.':'Live connection closed. No visual assessment is available.');};
 };
 stop.onclick=()=>end();
 window.addEventListener('siteysense:camera-stopped',()=>{if(socket)end('Gemini Live stopped with the camera. No more frames are being sent.');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&socket)end('Gemini Live paused when the app left the foreground. Start it again to reconnect.');});
 window.addEventListener('pagehide',()=>end());
 consent.addEventListener('change',()=>{if(!consent.checked&&socket)end('Upload permission withdrawn. Gemini Live stopped.');});
 return {stop:end,configure(value,model){configured=value;stage.textContent=value?'Server configured · connection not tested yet'+(model?' · '+model:''):'Gemini Live is not enabled in server settings';}};
}
