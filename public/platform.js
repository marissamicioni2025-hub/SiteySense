const $=id=>document.getElementById(id);
let installPrompt=null;
function connectivity(){$('connection-banner').hidden=navigator.onLine;}
window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);connectivity();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('native-install').hidden=false;});
window.addEventListener('appinstalled',()=>{installPrompt=null;$('native-install').hidden=true;$('install-status').textContent='SiteSense is installed. Open it from your home screen or app launcher.';});
$('install-app').onclick=()=>$('install-dialog').showModal();
$('native-install').onclick=async()=>{if(!installPrompt)return;try{await installPrompt.prompt();const result=await installPrompt.userChoice;$('install-status').textContent=result.outcome==='accepted'?'Installation requested.':'You can install later using your browser menu.';}catch{$('install-status').textContent='Use your browser menu to install SiteSense.';}finally{installPrompt=null;$('native-install').hidden=true;}};
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$(button.dataset.close).close();
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
const KEY='sitesense-reviews-v1';
function readReviews(){try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(data)?data.filter(r=>r&&typeof r.created==='string'&&typeof r.briefing==='string').slice(0,12):[];}catch{return [];}}
function download(report){const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='sitesense-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderReviews(){const reports=readReviews();$('review-count').textContent=reports.length;$('saved-reviews').replaceChildren();
 if(!reports.length){const p=document.createElement('p');p.className='empty-state';p.textContent='A clearer picture starts here. Your saved review summaries will appear in this notebook.';$('saved-reviews').append(p);}
 for(const report of reports){const article=document.createElement('article');article.className='saved-review';const heading=document.createElement('h3');heading.textContent=(report.task==='ladder'?'Ladder access':'Roofing & edge work');const meta=document.createElement('small');const date=new Date(report.created);meta.textContent=(Number.isNaN(date.getTime())?'Unknown date':date.toLocaleString())+' · '+(report.mode==='demo'?'Scripted demo':report.mode==='model'?'Model review':'Not analyzed');const text=document.createElement('p');text.textContent=report.briefing;const button=document.createElement('button');button.className='secondary';button.textContent='Download summary';button.onclick=()=>download(report);article.append(heading,meta,text,button);$('saved-reviews').append(article);}
 $('clear-reviews').disabled=!reports.length;
}
const openReviews=()=>{renderReviews();$('reviews-dialog').showModal();};$('open-reviews').onclick=openReviews;$('mobile-reviews').onclick=openReviews;
$('clear-reviews').onclick=()=>{try{localStorage.removeItem(KEY);$('review-status').textContent='Saved review summaries cleared from this device.';}catch{$('review-status').textContent='Device storage could not be cleared.';}renderReviews();};
window.addEventListener('sitesense:save-review',event=>{const report=event.detail;try{localStorage.setItem(KEY,JSON.stringify([report,...readReviews()].slice(0,12)));$('speech-status').textContent='Review saved on this device and downloaded.';}catch{$('speech-status').textContent='Summary downloaded. Device storage is unavailable or full.';}renderReviews();});
renderReviews();
if('serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{$('install-status').textContent='Offline setup could not finish. Visit on HTTPS and try again.';});}
