// Browser-provided voices only. No API request or generated model audio.
export function createSpeechControls({voiceSelect,rateSelect,preview,status}){
 const engine=window.speechSynthesis;let voices=[],generation=0,settings={},liveSpeaking=false;
 try{settings=JSON.parse(localStorage.getItem('siteysense-speech-settings-v1')||'{}')||{};}catch{}
 if(typeof settings!=='object'||Array.isArray(settings))settings={},liveSpeaking=false;
 const id=voice=>voice.voiceURI||voice.name+'|'+voice.lang;
 function persist(){try{localStorage.setItem('siteysense-speech-settings-v1',JSON.stringify({voice:voiceSelect.value,rate:rateSelect.value}));}catch{}}
 function populate(){
 voices=engine?.getVoices?.()||[];
 const english=voices.filter(voice=>voice.lang?.toLowerCase().startsWith('en'));
 const available=english.length?english:voices;
 voiceSelect.replaceChildren();const fallback=document.createElement('option');fallback.value='';fallback.textContent='Device default voice';voiceSelect.append(fallback);
 for(const voice of available){const option=document.createElement('option');option.value=id(voice);option.textContent=voice.name+' · '+voice.lang+(voice.localService?' · on device':'');voiceSelect.append(option);}
 const preferred=settings.voice===undefined?available.find(voice=>/natural|enhanced|premium|samantha|aria|google/i.test(voice.name))||available.find(voice=>voice.default):available.find(voice=>id(voice)===settings.voice);
 voiceSelect.value=preferred?id(preferred):'';
 }
 if(['0.85','1','1.1'].includes(String(settings.rate)))rateSelect.value=String(settings.rate);
 voiceSelect.onchange=()=>{settings.voice=voiceSelect.value;persist();};rateSelect.onchange=persist;
 function speak(text,live=false){
 liveSpeaking=live;
 if(!engine||!window.SpeechSynthesisUtterance){status.textContent='Speech is unavailable in this browser. Read the briefing on screen.';return;}
 const current=++generation;engine.cancel();const utterance=new SpeechSynthesisUtterance(text);const selected=voices.find(voice=>id(voice)===voiceSelect.value);if(selected)utterance.voice=selected;utterance.lang=selected?.lang||'en-US';utterance.rate=Number(rateSelect.value)||1;
 utterance.onstart=()=>{if(current===generation)status.textContent='Reading your briefing…';};utterance.onend=()=>{if(current===generation)liveSpeaking=false;if(current===generation)status.textContent='Briefing complete.';};utterance.onerror=()=>{if(current===generation)status.textContent='Audio could not play. The full briefing is available on screen.';};engine.speak(utterance);
 }
 preview.onclick=()=>speak('Hi, I’m your SiteySense briefing voice. I’ll explain the conditions and what to check next.');
 populate();engine?.addEventListener?.('voiceschanged',populate);
 if(!engine){voiceSelect.disabled=true;rateSelect.disabled=true;}
 return {speak,speakLive(text){if(engine?.speaking)return false;speak(text,true);return true;},stop(){liveSpeaking=false;generation++;engine?.cancel();status.textContent='Audio stopped.';},invalidate(){if(engine?.speaking&&!liveSpeaking){generation++;engine.cancel();status.textContent='The briefing changed. Play the updated version when ready.';}}};
}
