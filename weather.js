const headers={'User-Agent':'SiteySense/0.3 (construction pre-task forecast client)','Accept':'application/geo+json'};
async function request(url,fetchImpl){const response=await fetchImpl(url,{headers,signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`NWS request failed (${response.status}). Forecast data is unavailable.`);return response.json();}
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
const percent=value=>Number.isFinite(value)&&value>=0&&value<=100?value:null;
export function parseWind(value){if(typeof value!=='string')return null;if(/^calm$/i.test(value.trim()))return 0;if(!/^\d+(?:\s+to\s+\d+)?\s+mph$/i.test(value.trim()))return null;return Math.max(...value.match(/\d+/g).map(Number));}
export function mapAlert(feature,now=Date.now()){
 const p=feature?.properties;if(!p||typeof p.event!=='string')return null;
 if(p.status&&p.status!=='Actual')return null;
 if(p.messageType==='Cancel')return null;
 const expires=validDate(p.expires),ends=validDate(p.ends);
 if((ends&&Date.parse(ends)<=now)||(expires&&Date.parse(expires)<=now))return null;
 const text=(value,max=3000)=>typeof value==='string'?value.slice(0,max):'';
 const relevant=/tornado|thunderstorm|wind|heat|flood|lightning|hurricane|tropical storm|winter|snow|ice|freeze|cold|fire weather|red flag/i.test(p.event);
 return {id:text(feature.id||p.id,300),event:text(p.event,120),severity:text(p.severity,40),headline:text(p.headline,500),instruction:text(p.instruction),sent:validDate(p.sent),onset:validDate(p.onset),expires,ends,relevant,
 relevance:relevant?'May affect outdoor access, weather exposure or site conditions. Review the official instruction and site plan.':'Local official alert; no task-specific relevance has been established by this prototype.',
 url:'https://www.weather.gov/'};
}
export async function fetchWeather(lat,lon,{fetchImpl=fetch,now=Date.now()}={}){
 const point=await request(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,fetchImpl);
 const url=point.properties?.forecastHourly;
 if(typeof url!=='string'||!url.startsWith('https://api.weather.gov/'))throw Error('NWS hourly forecasts are unavailable for this location. US coverage is required.');
 const [forecastResult,alertResult]=await Promise.allSettled([request(url,fetchImpl),request(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,fetchImpl)]);
 if(forecastResult.status!=='fulfilled')throw forecastResult.reason;
 const forecast=forecastResult.value,periods=forecast.properties?.periods;
 if(!Array.isArray(periods))throw Error('NWS returned no usable hourly forecast.');
 const p=periods.find(period=>Date.parse(period.startTime)<=now&&Date.parse(period.endTime)>now)||periods.find(period=>Date.parse(period.endTime)>now);
 if(!p||!Number.isFinite(p.temperature)||!['F','C'].includes(p.temperatureUnit))throw Error('No current or upcoming hourly forecast is available.');
 const location=point.properties?.relativeLocation?.properties;
 const alerts=alertResult.status==='fulfilled'&&Array.isArray(alertResult.value.features)?alertResult.value.features.map(feature=>mapAlert(feature,now)).filter(Boolean).slice(0,30):null;
 return {temperature:p.temperatureUnit==='C'?p.temperature*9/5+32:p.temperature,wind:parseWind(p.windSpeed),summary:typeof p.shortForecast==='string'?p.shortForecast:'Forecast summary unavailable',humidity:percent(p.relativeHumidity?.value),precipitationChance:percent(p.probabilityOfPrecipitation?.value),
 updated:validDate(forecast.properties.updateTime),period:validDate(p.startTime),periodEnd:validDate(p.endTime),fetchedAt:new Date(now).toISOString(),location:location?.city&&location?.state?`${location.city}, ${location.state}`:'Selected US forecast area',source:'National Weather Service hourly forecast',url,alerts:alerts||[],alertsStatus:alerts===null?'unavailable':'available'};
}
