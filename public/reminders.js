// Shared deterministic reminders. Confidence is not calibrated accuracy.
export const VISION_CONFIDENCE_THRESHOLD = 0.8;
export function decideReminder(frame) {
 const reminders=[];
 const edge=frame.edgeProximity,eye=frame.ppeEye;
 if(frame.quality==='insufficient'||edge.confidence<VISION_CONFIDENCE_THRESHOLD||edge.nearEdge===null){
 reminders.push({category:'edge',time:frame.time,requiresReview:false,evidence:'I can’t clearly confirm edge proximity from this view. Verify your surroundings and fall protection before proceeding.'});
 }else if(edge.nearEdge){
 reminders.push({category:'edge',time:frame.time,requiresReview:true,evidence:'The image suggests proximity to an edge. Verify your fall-protection plan and connection before approaching.'});
 }
 if(frame.quality==='insufficient'||eye.confidence<VISION_CONFIDENCE_THRESHOLD||eye.missingEyeProtection===null){
 reminders.push({category:'ppe',time:frame.time,requiresReview:false,evidence:'I can’t verify eye protection from this view. Please confirm the protection required for your task.'});
 }else if(eye.missingEyeProtection){
 reminders.push({category:'ppe',time:frame.time,requiresReview:true,evidence:'Eye protection may be missing in the visible view. Confirm and use the protection required for your task.'});
 }
 // Confident negatives do not establish safety or remove task checks.
 return reminders;
}
