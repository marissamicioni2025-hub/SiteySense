// These are visible cues, not equipment inspections or compliance decisions.
const check=(id,label,definition,action)=>({id,label,definition,action});
const profiles={
 roofing:[
 check('opening','Roof opening / skylight visible','An opening or skylight is visibly identifiable. Do not infer load capacity or protection adequacy.','Have the responsible person verify opening protection under the site plan.'),
 check('debris','Loose materials in the visible work area','Loose debris or scattered materials are clearly visible in the work area.','Verify footing and material management before approaching the work area.'),
 check('fallEquipment','Fall-protection equipment visible','A harness or connecting fall-protection equipment is clearly visible. Presence does not establish correct fit, connection or anchor strength.','Confirm required fall protection, fit and connection directly; the camera cannot verify the anchor.')],
 ladder:[
 check('ladderVisible','Ladder visible','A ladder is clearly identifiable in the current frame.','Show the ladder and its surroundings for a useful review.'),
 check('baseVisible','Ladder base visible','The ladder feet and their contact with the surface are clearly in view. This does not establish stability.','Inspect the footing and secure placement directly; show the base if it is out of view.'),
 check('routeObstruction','Visible access obstruction','Materials or objects visibly obstruct the ladder approach or landing.','Verify a clear designated approach and landing under site procedures.')],
 tools:[
 check('toolVisible','Power tool visible','A power tool is clearly identifiable. Do not guess tool type from an ambiguous object.','Show the tool and work area; follow its operating instructions.'),
 check('guardVisible','Tool guard visible','A guard on the visible tool is clearly identifiable. A guard outside the frame is unknown, not missing. Do not infer correct installation or functioning.','Inspect required guards directly under the tool instructions; disconnect or service only under approved procedures.'),
 check('nearbyPerson','Other person near the tool work area','An additional person is visibly close to the tool work area. Do not estimate exact distance or infer unsafe separation.','Confirm the work area and separation from others before operating.')]
};
export const taskVisionChecks=task=>profiles[task]||[];
export function taskVisionSchema(task){return {type:'OBJECT',properties:Object.fromEntries(taskVisionChecks(task).map(c=>[c.id,{type:'OBJECT',properties:{result:{type:'BOOLEAN',nullable:true},confidence:{type:'NUMBER'}},required:['result','confidence']}])),required:taskVisionChecks(task).map(c=>c.id)};}
export function validateTaskVision(task,raw,quality){
 return Object.fromEntries(taskVisionChecks(task).map(check=>{
 const value=raw?.[check.id];
 if(value!==undefined&&(!value||![true,false,null].includes(value.result)||!Number.isFinite(value.confidence)||value.confidence<0||value.confidence>1))throw Error('Invalid task visual observation.');
 return [check.id,quality==='insufficient'||!value||value.confidence<.8?{result:null,confidence:0}:{result:value.result,confidence:value.confidence}];
 }));
}
export function taskVisionResults(task,frame){return taskVisionChecks(task).map(c=>{
 const v=frame.taskChecks?.[c.id];const result=frame.quality==='insufficient'||!v||v.confidence<.8?null:v.result;
 return {...c,result,text:c.label+': '+(result===true?'visible in this frame. ':result===false?'not apparent in this frame; this does not establish absence. ':'cannot verify from this frame. ')+c.action};
});}
