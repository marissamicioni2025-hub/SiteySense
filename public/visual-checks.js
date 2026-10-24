// Experimental definitions shared by schemas, validation, fixed reminders and fixtures.
export const visualChecks=[
 {id:'workAreaVisible',title:'Relevant work area visible',topic:'conditions',evidence:{positive:['work_area_visible'],negative:['no_relevant_area_in_view']},canObserve:'Whether the relevant work area is visibly in frame.',cannotEstablish:'Whether unseen areas contain hazards, or whether a worker is authorized or trained.',positive:null,negative:'The relevant work area is not visible. Reposition the camera and verify conditions directly.',unknown:'The relevant work area cannot be verified from this view.'},
 {id:'openingVisible',title:'Visible opening or skylight',topic:'edge',evidence:{positive:['opening_visible','skylight_visible'],negative:['none_visible_in_view']},canObserve:'An apparent opening or skylight in a clearly visible work area.',cannotEstablish:'Load-bearing capacity, cover strength, dimensions, protection suitability or compliance.',positive:'An opening or skylight appears in the selected view. Verify the site opening-protection plan before approaching.',negative:null,unknown:'Openings or skylights cannot be verified from this view. Check the work area directly.'},
 {id:'routeObstructionVisible',title:'Object on a visible access route',topic:'housekeeping',evidence:{positive:['route_and_object_visible'],negative:['route_clear_in_view']},canObserve:'An object and a walking/access route visibly overlapping in the same view.',cannotEstablish:'The complete access route, exact clearances, emergency-egress compliance or whether a fall will occur.',positive:'An object appears on a visible access route. Verify the route and follow the site housekeeping plan.',negative:null,unknown:'The access route cannot be verified from this view. Confirm a clear route directly.'}
];
export function additionalSchema(gemini=false){
 const type=t=>gemini?t.toUpperCase():t;
 return {type:type('object'),properties:Object.fromEntries(visualChecks.map(check=>[check.id,{type:type('object'),properties:{result:gemini?{type:'BOOLEAN',nullable:true}:{type:['boolean','null']},confidence:{type:type('number')},visibility:{type:type('string'),enum:['clear','partial','not_visible']},evidence:{type:type('string'),enum:[...check.evidence.positive,...check.evidence.negative,'unknown']}},required:['result','confidence','visibility','evidence']} ])),required:visualChecks.map(check=>check.id)};
}
export function validateAdditionalChecks(input,quality='usable'){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Missing experimental structured checks.');
 const output={};
 for(const check of visualChecks){const value=input[check.id];if(!value||![true,false,null].includes(value.result)||!Number.isFinite(value.confidence)||value.confidence<0||value.confidence>1||!['clear','partial','not_visible'].includes(value.visibility)||![...check.evidence.positive,...check.evidence.negative,'unknown'].includes(value.evidence))throw Error('Invalid experimental detection.');
 if(value.result===null||quality==='insufficient'||value.visibility!=='clear'||value.confidence<.8){output[check.id]={result:null,confidence:value.confidence,visibility:value.visibility,evidence:'unknown'};continue;}
 const required=value.result?check.evidence.positive:check.evidence.negative;if(!required.includes(value.evidence))throw Error('Experimental result contradicts its evidence.');
 output[check.id]={result:value.result,confidence:value.confidence,visibility:value.visibility,evidence:value.evidence};
 }
 if(output.workAreaVisible.result!==true)for(const check of visualChecks.slice(1))output[check.id]={...output[check.id],result:null,evidence:'unknown'};
 return output;
}
export function additionalReminders(frame){
 if(!frame.additionalChecks)return [];
 const checked=validateAdditionalChecks(frame.additionalChecks,frame.quality);
 return visualChecks.flatMap(check=>{const value=checked[check.id];const action=value.result===null?check.unknown:value.result?check.positive:check.negative;return action?[{check:check.id,title:check.title,topic:check.topic,action,time:frame.time,status:value.result===null?'Cannot verify':'Review required'}]:[];});
}
export function additionalPrompt(){return 'Return additionalChecks for each frame using these definitions: '+visualChecks.map(check=>`${check.id}: ${check.canObserve} Never establish ${check.cannotEstablish} result is boolean or null. Positive evidence: ${check.evidence.positive.join(',')}; negative evidence: ${check.evidence.negative.join(',')}.`).join(' ')+' Each check needs result, confidence from 0 to 1, visibility (clear, partial, not_visible), and the exact evidence code or unknown. Only use a non-null result when visibility is clear and the corresponding visual evidence is present. Do not invent evidence. Unknown is not absence.';}
export function additionalFixture(values={}){return Object.fromEntries(visualChecks.map(check=>[check.id,values[check.id]||{result:null,confidence:0,visibility:'not_visible',evidence:'unknown'}]));}
