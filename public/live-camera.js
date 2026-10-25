// Device-local preview only. This module never makes network requests.
export function createLiveCamera({video,open,close,flip,snapshot,onStart,onMessage,onBusy}){
 let stream=null,request=0,facing='environment',pending=false;
 function controls(){open.disabled=pending||!!stream;close.hidden=!pending&&!stream;flip.hidden=!stream;snapshot.hidden=!stream;flip.disabled=pending;snapshot.disabled=pending;}
 function stop(){window.dispatchEvent(new Event('siteysense:camera-stopped'));request++;pending=false;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;video.pause();video.srcObject=null;video.hidden=true;controls();}
 async function start(nextFacing=facing){
 if(!navigator.mediaDevices?.getUserMedia){onMessage('Live camera requires HTTPS and a supported browser. Use Take a photo or Upload footage instead.');return;}
 stop();onStart();facing=nextFacing;const current=++request;pending=true;onBusy(true);controls();onMessage('Waiting for camera permission. Choose Allow in your browser. No audio or footage is sent.');
 try{
 const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},audio:false});
 if(current!==request){acquired.getTracks().forEach(track=>track.stop());return;}
 stream=acquired;video.hidden=false;video.srcObject=stream;video.muted=true;await video.play();
 if(current!==request)return;
 for(const track of stream.getVideoTracks())track.addEventListener('ended',()=>{if(current===request){stop();onMessage('Camera disconnected. Open live camera to reconnect.');}},{once:true});
 onMessage('Camera preview is open. Start Gemini Live below for AI observations; opening the camera alone does not start analysis.');
 }catch(error){if(current===request){stop();onBusy(false);onMessage(error.name==='NotAllowedError'?'Camera access was denied. Allow camera access in your browser’s site settings, then try again. You can also upload a photo.':error.name==='NotFoundError'?'No camera was found. Connect a camera or upload a photo.':'Camera could not start. Close other camera apps and try again, or upload a photo.');}}
 finally{if(current===request){pending=false;onBusy(false);}controls();}
 }
 open.onclick=()=>start();flip.onclick=()=>start(facing==='environment'?'user':'environment');
 close.onclick=()=>{stop();onBusy(false);onMessage('Camera stopped. Nothing was recorded or sent.');};
 snapshot.onclick=()=>{
 if(!stream||video.readyState<2||!video.videoWidth){onMessage('The camera is not ready yet. Wait for a picture before capturing.');return;}
 const current=request;const canvas=document.createElement('canvas');canvas.width=Math.min(1280,video.videoWidth);canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
 canvas.toBlob(blob=>{if(current!==request)return;if(!blob){onMessage('Could not capture this frame. Try again.');return;}snapshot.dispatchEvent(new CustomEvent('camera:frame',{detail:new File([blob],'site-camera.jpg',{type:'image/jpeg'})}));},'image/jpeg',.85);
 };
 window.addEventListener('pagehide',()=>{stop();onBusy(false);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&(stream||pending)){stop();onBusy(false);onMessage('Camera paused when the app left the foreground. Open live camera to reconnect.');}});
 controls();return {stop};
}
