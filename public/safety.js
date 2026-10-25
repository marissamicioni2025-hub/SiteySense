import {taskVisionResults} from './task-vision.js';
import {additionalReminders} from './visual-checks.js';
import {forecastState} from './weather-state.js';
import {decideReminder} from './reminders.js';
import {topics,getTask} from './tasks.js';
export const guidance=topics;
export function assess({task='roofing',temperature=85,wind=8,rain=false,observations=[],detections,weatherSource,weatherData,surfaceStatus,mode,exampleFocus}) {
 const visionReminders=(detections?detections.flatMap(decideReminder):[]).filter(item=>mode==='demo'||item.category!=='edge'||['roofing','scaffold'].includes(task)).filter(item=>mode!=='demo'||!exampleFocus||item.category===exampleFocus);
 const experimentalReminders=detections?detections.flatMap(additionalReminders):[];
 if(detections)observations=visionReminders;
 const definition=getTask(task)||getTask('roofing');
 const keys = new Set(definition.topics);
 for(const observation of observations) if(guidance[observation.category]) keys.add(observation.category);
 if(temperature>=80) keys.add('heat');
 const environmental=[];
 if(wind>=20) environmental.push('Gusty conditions: review material handling and the site wind plan.');
 if(rain&&weatherSource!=='forecast') environmental.push('Wet conditions (simulation): check traction and visibility before starting.');
 if(surfaceStatus==='wet')environmental.push('Worker-reported wet surface: verify traction and access under the site plan.');
 if(weatherSource==='forecast'&&weatherData?.precipitationChance>0)environmental.push('Precipitation is forecast. Check actual surface conditions; a forecast does not establish a wet roof.');
 return {level:observations.some(o=>o.requiresReview===true||(o.category==='edge'&&o.requiresReview!==false))||wind>=20||rain||temperature>=95?'Review required':'Plan & verify', guidance:[...keys].map(key=>({key,...guidance[key]})),environmental,visionReminders,experimentalReminders};
}

export function buildBriefing(state){
 const result=assess(state),task=getTask(state.task)||getTask('roofing');
 const parts=[];
 if(state.mode==='demo')parts.push('Scripted example briefing. This is an illustration, not your camera.');
 parts.push(`Before ${task.briefing}, ${task.lead}.`);
 const poor=state.detections?.length&&state.detections.every(frame=>frame.quality==='insufficient');
 if(poor)parts.push('I can’t get a clear view of the work area. Hold the camera steady, improve the lighting, and show the task area so I can try again. I can’t check your protective equipment from this view.');
 else if(state.mode==='model'||state.mode==='demo')parts.push(...new Set(result.visionReminders.map(reminder=>reminder.evidence)));
 else parts.push('I haven’t checked a camera view yet. Use the checklist to verify the work area directly.');
 if(!poor)parts.push(...new Set(result.experimentalReminders.map(reminder=>reminder.action)));
 if(state.liveCheckedAt)for(const item of taskVisionResults(state.task,state.detections?.[0]||{}))parts.push(item.text);
 const forecast=state.weatherSource==='forecast',simulated=state.weatherSource==='simulated'||!state.weatherSource;
 if(forecast){
 parts.push('The weather numbers come from an hourly forecast, not a sensor at your work site.');
 if(forecastState(state.weatherData).status!=='current')parts.push('That forecast is out of date or its timing is unclear. Refresh it before using it to plan the work.');
 }else if(simulated)parts.push('The weather in this example is simulated. It does not describe current conditions at your site.');
 else parts.push('I don’t have a weather update yet. Load the forecast and compare it with conditions at the site.');
 if(Number.isFinite(state.temperature)){
 parts.push(`The ${forecast?'forecast':simulated?'simulated':'supplied'} temperature is ${Math.round(state.temperature)} degrees Fahrenheit.`);
 if(state.temperature>=80)parts.push('For outdoor work, follow your site heat plan for water, rest and shade. Temperature alone does not tell us your heat exposure.');
 }
 if(Number.isFinite(state.wind)&&state.wind>=20)parts.push(`The ${forecast?'forecast':'simulated'} wind is ${state.wind} miles per hour. For exposed work, wind can affect balance and make materials harder to handle. Check your site wind plan; this number is not a measured gust or a stop-work rule.`);
 const chance=forecast?state.weatherData?.precipitationChance:null;
 if(Number.isFinite(chance)&&chance>0){
 const kind=/snow|sleet|ice|freezing/i.test(state.weatherData.summary||'')?'snow or icy weather':/rain|shower|thunder/i.test(state.weatherData.summary||'')?'rain':'rain or snow';
 parts.push(chance<10?`The forecast gives a low ${chance} percent chance of ${kind}.`:`There is a ${chance} percent chance of ${kind} during the forecast period.`);
 parts.push('That does not tell us whether the work surface is wet. Check it directly before starting.');
 }
 if(state.surfaceStatus==='wet')parts.push('You reported a wet surface. Confirm traction and the access route with your supervisor before continuing.');
 else if(simulated&&state.rain)parts.push('This example assumes wet conditions. In that situation, check footing and access under the site plan.');
 for(const alert of (forecast?state.weatherData?.alerts||[]:[]).filter(a=>a.relevant&&(!a.expires||Date.parse(a.expires)>Date.now())).slice(0,1))parts.push(`The National Weather Service has issued a ${alert.event}. Read its instructions and review your site’s weather plan with your supervisor.`);
 if(task.topics.includes('silica'))parts.push('Before cutting or drilling, confirm the dust controls and protective equipment specified for that task.');
 parts.push('Confirm the protective equipment required for this task with your supervisor. An unclear image is not proof that equipment is missing.');
 if(state.mode==='model'||state.mode==='demo')parts.push('The camera can miss hazards. This is not an all-clear.');
 return parts.join(' ');
}
