const $=id=>document.getElementById(id);
window.addEventListener('beforeinstallprompt',event=>event.preventDefault());
function connectivity(){$('connection-banner').hidden=navigator.onLine;}
window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);connectivity();
let updateNotified=false;
function showUpdate(){$('update-banner').hidden=false;updateNotified=true;}
$('reload-app').onclick=()=>location.reload();
if('serviceWorker'in navigator){
 const hadController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController&&!updateNotified)showUpdate();});
 navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(value=>{
 value.addEventListener('updatefound',()=>{const installing=value.installing;installing?.addEventListener('statechange',()=>{if(installing.state==='installed'&&navigator.serviceWorker.controller)showUpdate();});});
 }).catch(()=>{ /* Offline availability depends on successful service-worker setup. */ });
}
