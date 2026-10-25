export function createLiveReview({video,start,stop,status,consent,accessCode,onResult,onClear}){
 let configured=false,socket=null,pump=null,epoch=0,inFlight=false,lastSent=0,id=0,lastResult=null;
 function end(message='Gemini Live stopped. No more camera frames are being sent.'){
 epoch++;clearInterval(pump);pump=null;inFlight=false;
 if(socket){const old=socket;socket=null;old.close();}
 start.disabled=false;stop.hidden=true;status.textContent=message;
 }
 function sendFrame(){
 if(inFlight||!socket||socket.readyState!==1||video.readyState<2||!video.srcObject||Date.now()-lastSent<3100)return;
 const canvas=document.createElement('canvas');canvas.width=Math.min(768,video.videoWidth);canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth);if(!canvas.width||!canvas.height)return;
 canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
 socket.send(JSON.stringify({type:'frame',viewId:++id,image:canvas.toDataURL('image/jpeg',.65)}));inFlight=true;lastSent=Date.now();status.textContent='Gemini Live is checking one sampled frame. Other moments are not verified.';
 }
 start.onclick=()=>{
 if(socket)return;
 if(!configured){status.textContent='Gemini Live is not enabled on the server. Configure its Live settings before starting.';return;}
 if(!video.srcObject){status.textContent='Open live camera and allow camera permission first.';return;}
 if(!consent.checked){status.textContent='Confirm permission to send footage to Google before starting Gemini Live.';consent.focus();return;}
 if(!accessCode.value){status.textContent='Enter your team’s Live access code. Do not enter a Google API key here.';accessCode.focus();return;}
 onClear();lastResult=null;const code=accessCode.value;const current=++epoch;start.disabled=true;stop.hidden=false;status.textContent='Connecting to Gemini Live…';
 const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/live`);socket=ws;ws.onopen=()=>{if(current===epoch){ws.send(JSON.stringify({type:'authorize',code}));accessCode.value='';}};
 ws.onmessage=event=>{if(current!==epoch)return;let message;try{message=JSON.parse(event.data);}catch{end('Invalid Live response. No assessment is available.');return;}
 if(message.type==='connected'){status.textContent=`Connected to ${message.model}. Sampled frames only; session limit ${message.sessionSeconds} seconds. Model usage may incur charges.`;pump=setInterval(sendFrame,3200);}
 if(message.type==='ready'){inFlight=false;sendFrame();}
 if(message.type==='observation'){lastResult=message.checkedAt;status.textContent='Last frame checked at '+new Date(message.checkedAt).toLocaleTimeString()+'. The current moving view may differ.';onResult(message);}
 if(message.type==='error'){end(message.message);}
 };
 ws.onerror=()=>{if(current===epoch)end('Live connection failed. Check Render Live configuration, model access and network settings.');};
 ws.onclose=()=>{if(current===epoch)end(lastResult?'Live connection closed. Last frame checked at '+new Date(lastResult).toLocaleTimeString()+'.':'Live connection closed. No visual assessment is available.');};
 };
 stop.onclick=()=>end();
 window.addEventListener('siteysense:camera-stopped',()=>{if(socket)end('Gemini Live stopped with the camera. No more frames are being sent.');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&socket)end('Gemini Live paused when the app left the foreground. Start it again to reconnect.');});
 window.addEventListener('pagehide',()=>end());
 consent.addEventListener('change',()=>{if(!consent.checked&&socket)end('Upload permission withdrawn. Gemini Live stopped.');});
 return {stop:end,configure(value){configured=value;}};
}
