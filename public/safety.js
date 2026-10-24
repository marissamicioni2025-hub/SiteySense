import {decideReminder} from './reminders.js';
export const guidance = {
 edge: {title:'Exposed edge', action:'Verify the site fall-protection plan and your connection before approaching an edge.', source:'OSHA · Fall protection', url:'https://www.osha.gov/fall-protection'},
 ladder: {title:'Ladder setup', action:'Inspect rails and rungs, verify stable footing and secure placement, and maintain three points of contact.', source:'OSHA · Stairways and ladders', url:'https://www.osha.gov/stairways-ladders'},
 ppe: {title:'Protective equipment', action:'Confirm the eye, head, and other protective equipment required for this task with your supervisor.', source:'OSHA · Personal protective equipment', url:'https://www.osha.gov/personal-protective-equipment'},
 heat: {title:'Heat exposure', action:'Follow your site heat plan for water, rest, shade, and acclimatization. Watch for signs of heat illness.', source:'OSHA · Heat exposure', url:'https://www.osha.gov/heat-exposure'}
};
export function assess({task='roofing',temperature=85,wind=8,rain=false,observations=[],detections}) {
 const visionReminders=detections?detections.flatMap(decideReminder):[];
 if(detections)observations=visionReminders;
 const keys = new Set([task==='ladder'?'ladder':'edge','ppe']);
 for(const observation of observations) if(guidance[observation.category]) keys.add(observation.category);
 if(temperature>=80) keys.add('heat');
 const environmental=[];
 if(wind>=20) environmental.push('Gusty conditions: review material handling and the site wind plan.');
 if(rain) environmental.push('Wet conditions: check traction and visibility before starting.');
 return {level:observations.some(o=>o.requiresReview===true||(o.category==='edge'&&o.requiresReview!==false))||wind>=20||rain||temperature>=95?'Review required':'Plan & verify', guidance:[...keys].map(key=>({key,...guidance[key]})),environmental,visionReminders};
}

export function buildBriefing(state){
 const result=assess(state);
 const parts=[state.mode==='demo'?'Scripted demo briefing. No footage has been analyzed.':state.mode==='model'?'Pre-task briefing from selected visual views.':'Pre-task briefing. Visual conditions have not been confirmed.'];
 parts.push(`Before ${state.task==='ladder'?'ladder access':'roofing'}, verify ${state.task==='ladder'?'ladder footing and secure placement':'your fall-protection plan and connection'}.`);
 parts.push(state.weatherSource==='forecast'?'Weather context uses an hourly forecast, not on-site measurements.':'Weather conditions in this briefing are simulated, not on-site measurements.');
 if(state.temperature>=80)parts.push('Follow your site heat plan for water, rest, and shade.');
 parts.push(...result.environmental);
 if(state.detections?.length&&state.detections.every(d=>d.quality==='insufficient'))parts.push('Visibility is insufficient. No visual hazard assessment can be made. Improve lighting and camera position.');
 parts.push(...new Set(result.visionReminders.map(r=>r.evidence)));
 parts.push('Confirm required protective equipment with your supervisor.');
 if(state.mode==='model'||state.mode==='demo')parts.push('Selected views can miss hazards. This is not an all-clear.');
 return parts.join(' ');
}
