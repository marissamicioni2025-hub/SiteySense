import {forecastState,weatherProvenance,activeAlerts} from './weather-state.js';
const $=id=>document.getElementById(id);
const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString():'Unavailable';
export function createWeatherControls({state,onChange,request}){
 let revision=0;
 function render(){
 const data=state.weatherSource==='forecast'?state.weatherData:null,simulated=state.weatherSource==='simulated';
 const status=forecastState(data);
 document.querySelector('.sun').textContent=data?(/snow|ice/i.test(data.summary)?'❄':/rain|shower|storm/i.test(data.summary)?'☂':/cloud/i.test(data.summary)?'☁':/clear|sunny/i.test(data.summary)?'☀':'◌'):simulated?'◇':'◌';
 $('weather-badge').textContent=simulated?'WHAT-IF SIMULATION':data?(status.status==='stale'?'STALE FORECAST':'NWS FORECAST'):'UNAVAILABLE';
 $('temp-display').textContent=Number.isFinite(state.temperature)?Math.round(state.temperature)+'°':'—';
 $('wind-display').textContent=Number.isFinite(state.wind)?state.wind+' mph':'—';
 $('rain-display').textContent=data?(data.precipitationChance===null?'Unknown':data.precipitationChance+'% chance'):simulated?(state.rain?'Simulated wet':'Not simulated'):'Unknown';
 $('humidity-display').textContent=Number.isFinite(data?.humidity)?data.humidity+'%':'Unknown';
 $('weather-summary').textContent=data?data.summary:simulated?'What-if scenario · not current site weather':'No usable forecast loaded';
 $('weather-age').textContent=data?`${navigator.onLine?'':'Offline · previously fetched in this session. '}${status.label}. Period ${date(data.period)} to ${date(data.periodEnd)}. Updated ${date(data.updated)}.`:'';
 $('weather-source').href=data?.url||'https://www.weather.gov/';
 document.querySelector('.location').textContent=data?.location||(simulated?'What-if location · no live weather':'Choose a US forecast location');
 $('task-location').textContent=data?.location||'No forecast location loaded';
 $('task-provenance').textContent=`Task selected by you · ${weatherProvenance(state)} · ${state.mode==='model'?'Model observations':state.mode==='demo'?'Scripted example':'Camera not analyzed'}`;
 $('weather-alerts').replaceChildren();
 const active=activeAlerts(data);
 const alertsText=document.createElement('p');alertsText.className='fine';
 if(!data)alertsText.textContent=simulated?'Official alerts are not part of this simulation.':'Official alert information unavailable until a location is checked.';
 else if(data.alertsStatus!=='available')alertsText.textContent='Official alerts unavailable. Do not interpret this as no alerts.';
 else alertsText.textContent=active.length?`${active.length} non-expired official alert(s) returned for this location.`:'No active alerts returned for this point. This is not a site safety assessment.';
 if(data?.alertsStatus==='available'&&(!Number.isFinite(Date.parse(data.fetchedAt))||Date.now()-Date.parse(data.fetchedAt)>600000))alertsText.textContent+=' Alert age is unknown or over 10 minutes; refresh before relying on it.';
 $('weather-alerts').append(alertsText);
 for(const alert of active){const details=document.createElement('details');details.className='alert-item';details.open=alert.relevant&&['Extreme','Severe'].includes(alert.severity);const summary=document.createElement('summary');summary.textContent=alert.event+' · '+(alert.severity||'Severity unavailable');const reason=document.createElement('p');reason.textContent=alert.relevance;const headline=document.createElement('p');headline.textContent=alert.headline;const instruction=document.createElement('p');instruction.textContent=alert.instruction?'Official instruction: '+alert.instruction:'Read the official alert and your site plan for instructions.';const when=document.createElement('small');when.textContent=`Issued ${date(alert.sent)} · expires ${date(alert.expires)}`;const link=document.createElement('a');link.href='https://www.weather.gov/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Official NWS alerts ↗';details.append(summary,headline,reason,instruction,when,link);$('weather-alerts').append(details);}
 }
 async function load(current=++revision){
 const lat=$('lat').value.trim(),lon=$('lon').value.trim();
 if(!lat||!lon||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))||Math.abs(Number(lat))>90||Math.abs(Number(lon))>180){$('weather-message').textContent='Enter valid latitude and longitude.';return;}
 if(!navigator.onLine){$('weather-message').textContent='Offline. New forecasts and alerts need a connection. Existing data, if shown, is not refreshed.';render();return;}
 $('weather').disabled=true;state.weatherStatus='loading';$('weather-message').textContent='Retrieving NWS forecast and active alerts…';
 try{const data=await request(`/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);if(current!==revision){$('weather-message').textContent='Forecast request finished; newer location or simulation changes were kept.';return;}
 if(!Number.isFinite(data.temperature)||!Array.isArray(data.alerts))throw Error('Weather response was incomplete.');
 state.weatherSource='forecast';state.weatherData=data;state.weatherStatus='loaded';state.temperature=data.temperature;state.wind=data.wind;state.rain=false;
 $('temp').value=Math.max(40,Math.min(115,data.temperature));$('wind').value=Math.max(0,Math.min(45,data.wind||0));$('rain').checked=false;
 $('weather-message').textContent='Forecast loaded. Wind is forecast wind, not measured gusts. Rain probability does not establish whether the roof is wet.';onChange();
 }catch(error){if(current===revision){state.weatherStatus='error';$('weather-message').textContent=error.message+' Prior values, if shown, were not refreshed.';render();onChange();}}
 finally{$('weather').disabled=false;}
 }
 $('weather').onclick=()=>load();
 $('use-location').onclick=()=>{
 if(!navigator.geolocation){$('weather-message').textContent='Location is unsupported. Enter coordinates manually.';return;}
 const current=++revision;$('use-location').disabled=true;$('weather-message').textContent='Waiting for location permission…';
 navigator.geolocation.getCurrentPosition(position=>{$('use-location').disabled=false;if(current!==revision)return;$('lat').value=position.coords.latitude.toFixed(3);$('lon').value=position.coords.longitude.toFixed(3);load(current);},error=>{$('use-location').disabled=false;if(current!==revision)return;$('weather-message').textContent=error.code===1?'Location permission denied. Enter coordinates manually.':'Could not obtain location. Enter coordinates manually.';},{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
 };
 for(const id of ['lat','lon'])$(id).addEventListener('input',()=>revision++);
 const timer=setInterval(()=>{if(state.weatherSource==='forecast')onChange();},60000);
 window.addEventListener('pagehide',()=>clearInterval(timer));
 window.addEventListener('offline',()=>{render();onChange();});window.addEventListener('online',()=>{render();onChange();});
 return {render,simulationChanged(){revision++;state.weatherSource='simulated';state.weatherData=null;state.weatherStatus='simulation';$('weather-message').textContent='What-if simulation. These values are not current site conditions or official alerts.';}};
}
