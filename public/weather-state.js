export function forecastState(data,now=Date.now()){
 if(!data)return {status:'unavailable',label:'Information unavailable'};
 const updated=Date.parse(data.updated),end=Date.parse(data.periodEnd),start=Date.parse(data.period);
 if(!Number.isFinite(updated)||!Number.isFinite(end)||!Number.isFinite(start)||updated>now+300000)return {status:'stale',label:'Forecast age unavailable'};
 if(end<=now||now-updated>3*60*60*1000)return {status:'stale',label:'Stale forecast — refresh'};
 return {status:'current',label:start>now?'Upcoming hourly forecast':'Current forecast period'};
}
export function weatherProvenance(state){
 if(state.weatherSource==='simulated')return 'What-if simulation';
 if(state.weatherSource!=='forecast')return 'Weather unavailable';
 return forecastState(state.weatherData).label;
}
export function sanitizeWeatherReport(state){
 const d=state.weatherData;
 return {source:state.weatherSource,status:state.weatherSource==='forecast'?forecastState(d).status:state.weatherSource,
 temperatureF:state.temperature,forecastWindMph:state.wind,simulatedWet:state.weatherSource==='simulated'?state.rain:null,workerSurface:state.surfaceStatus||'unknown',
 forecast:state.weatherSource==='forecast'&&d?{location:d.location,summary:d.summary,updated:d.updated,period:d.period,periodEnd:d.periodEnd,humidity:d.humidity,precipitationChance:d.precipitationChance,source:d.source,url:d.url,alertsStatus:d.alertsStatus,alerts:d.alerts}:null};
}

export function activeAlerts(data,now=Date.now()){
 return (data?.alerts||[]).filter(alert=>(!alert.expires||Date.parse(alert.expires)>now)&&(!alert.ends||Date.parse(alert.ends)>now));
}
