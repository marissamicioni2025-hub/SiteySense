import {decideReminder} from './reminders.js';
import {topics,getTask} from './tasks.js';
export const guidance=topics;
export function assess({task='roofing',temperature=85,wind=8,rain=false,observations=[],detections}) {
 const visionReminders=detections?detections.flatMap(decideReminder):[];
 if(detections)observations=visionReminders;
 const definition=getTask(task)||getTask('roofing');
 const keys = new Set(definition.topics);
 for(const observation of observations) if(guidance[observation.category]) keys.add(observation.category);
 if(temperature>=80) keys.add('heat');
 const environmental=[];
 if(wind>=20) environmental.push('Gusty conditions: review material handling and the site wind plan.');
 if(rain) environmental.push('Wet conditions: check traction and visibility before starting.');
 return {level:observations.some(o=>o.requiresReview===true||(o.category==='edge'&&o.requiresReview!==false))||wind>=20||rain||temperature>=95?'Review required':'Plan & verify', guidance:[...keys].map(key=>({key,...guidance[key]})),environmental,visionReminders};
}

export function buildBriefing(state){
 const result=assess(state);
 const parts=[state.mode==='demo'?'Scripted example briefing. No footage has been analyzed.':state.mode==='model'?'Pre-task briefing from selected visual views.':'Pre-task briefing. Visual conditions have not been confirmed.'];
 const definition=getTask(state.task)||getTask('roofing');
 parts.push(`Before ${definition.briefing}, ${definition.lead}.`);
 parts.push(state.weatherSource==='forecast'?'Weather context uses an hourly forecast, not on-site measurements.':'Weather conditions in this briefing are simulated, not on-site measurements.');
 if(state.temperature>=80)parts.push('Follow your site heat plan for water, rest, and shade.');
 parts.push(...result.environmental);
 for(const item of result.guidance.filter(item=>!['edge','ladder','ppe','heat'].includes(item.key)).slice(0,2))parts.push(item.action);
 if(state.detections?.length&&state.detections.every(d=>d.quality==='insufficient'))parts.push('Visibility is insufficient. No visual hazard assessment can be made. Improve lighting and camera position.');
 parts.push(...new Set(result.visionReminders.map(r=>r.evidence)));
 parts.push('Confirm required protective equipment with your supervisor.');
 if(state.mode==='model'||state.mode==='demo')parts.push('Selected views can miss hazards. This is not an all-clear.');
 return parts.join(' ');
}
