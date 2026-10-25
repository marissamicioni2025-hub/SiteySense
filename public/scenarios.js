import {decideReminder} from './reminders.js';
const detection=(time,quality,nearEdge,edgeConfidence,missingEyeProtection,eyeConfidence)=>({time,quality,edgeProximity:{confidence:edgeConfidence,nearEdge},ppeEye:{confidence:eyeConfidence,missingEyeProtection}});
export const scenarios=[
 {id:'roof-edge',title:'Example of an edge review',subtitle:'A reminder before approaching',dim:false,
 summary:'Scripted roof-edge scenario with an illustrated roof. An illustrated worker is near an edge; fall-protection connection is not verifiable.',
 limitation:'Illustration only. No camera or model analysis. Distance and fall-protection status cannot be established.',
 detections:[detection(0,'usable',true,.9,null,.2)]},
 {id:'poor-light',title:'Example of poor visibility',subtitle:'Knowing when not to assess',dim:true,
 summary:'Scripted poor-light scenario with an obscured view. Visibility is insufficient. No hazard assessment can be made.',
 limitation:'Improve lighting and camera position. Unreadable footage cannot establish whether hazards are present or absent.',
 detections:[detection(0,'insufficient',null,0,null,0)]},
 {id:'eye-unclear',title:'Example of unclear eye protection',subtitle:'Out of view stays unknown',dim:false,
 summary:'Scripted eye-protection scenario with an unclear face. The illustrated view does not resolve the worker’s eyes or protective equipment.',
 limitation:'An unclear face does not show whether eye protection is present. Confirm required protection directly.',
 detections:[detection(0,'usable',null,.3,null,.1)]}
];
export function getScenario(id){const scenario=scenarios.find(s=>s.id===id);if(!scenario)throw Error('Unknown demo scenario.');return {...scenario,detections:structuredClone(scenario.detections),observations:scenario.detections.flatMap(decideReminder)};}

export function walkthroughSteps(scenario){return [
 {title:'1. Show the work area',body:scenario.id==='poor-light'?'The illustration is dark and blurred. A useful camera view must show the relevant work area.':scenario.id==='eye-unclear'?'The illustration shows the worker, but does not resolve the eyes or eye protection.':'The illustration shows a worker near an apparent roof edge. It cannot establish distance or a fall-protection connection.'},
 {title:'2. Understand the observation',body:scenario.summary},
 {title:'3. Verify the precaution',body:scenario.observations.map(item=>item.evidence).join(' ')+' '+scenario.limitation}
];}
