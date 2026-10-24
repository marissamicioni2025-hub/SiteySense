import {decideReminder} from './reminders.js';
const detection=(time,quality,nearEdge,edgeConfidence,missingEyeProtection,eyeConfidence)=>({time,quality,edgeProximity:{confidence:edgeConfidence,nearEdge},ppeEye:{confidence:eyeConfidence,missingEyeProtection}});
export const scenarios=[
 {id:'roof-edge',title:'Roof edge',subtitle:'A reminder before approaching',time:6,dim:false,
 summary:'Scripted roof-edge scenario at 6 seconds. An illustrated worker is near an edge; fall-protection connection is not verifiable.',
 limitation:'Illustration only. No camera or model analysis. Distance and fall-protection status cannot be established.',
 detections:[detection(6,'usable',true,.9,null,.2)]},
 {id:'poor-light',title:'Poor visibility',subtitle:'Knowing when not to assess',time:3,dim:true,
 summary:'Scripted poor-light scenario at 3 seconds. Visibility is insufficient. No hazard assessment can be made.',
 limitation:'Improve lighting and camera position. Unreadable footage cannot establish whether hazards are present or absent.',
 detections:[detection(3,'insufficient',null,0,null,0)]},
 {id:'eye-unclear',title:'Eye protection unclear',subtitle:'Out of view stays unknown',time:9,dim:false,
 summary:'Scripted eye-protection scenario at 9 seconds. The illustrated view does not resolve the worker’s eyes or protective equipment.',
 limitation:'An unclear face does not show whether eye protection is present. Confirm required protection directly.',
 detections:[detection(9,'usable',null,.3,null,.1)]}
];
export function getScenario(id){const scenario=scenarios.find(s=>s.id===id);if(!scenario)throw Error('Unknown demo scenario.');return {...scenario,detections:structuredClone(scenario.detections),observations:scenario.detections.flatMap(decideReminder)};}
