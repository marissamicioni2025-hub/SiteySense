import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskVisionChecks,validateTaskVision,taskVisionResults} from '../public/task-vision.js';
import {liveConfig} from '../live.js';
import {tasks} from '../public/tasks.js';
test('task-specific Live schema follows selection and excludes housekeeping',()=>{
 assert.ok(!tasks.some(t=>t.id==='housekeeping'));
 const roof=liveConfig('roofing'),ladder=liveConfig('ladder');
 assert.match(ladder.systemInstruction,/Selected task: ladder/);
 assert.ok(roof.tools[0].functionDeclarations[0].parameters.properties.taskChecks.properties.opening);
 assert.ok(ladder.tools[0].functionDeclarations[0].parameters.properties.taskChecks.properties.baseVisible);
 assert.ok(!ladder.tools[0].functionDeclarations[0].parameters.properties.taskChecks.properties.opening);
 assert.equal(taskVisionChecks('vehicles').length,0);
});
test('obscured or low confidence task cues stay unknown and model prose is dropped',()=>{
 const raw={opening:{result:true,confidence:.95,advice:'made up'},debris:{result:false,confidence:.2}};
 const clean=validateTaskVision('roofing',raw,'usable');
 assert.deepEqual(clean.opening,{result:true,confidence:.95});
 assert.equal(clean.debris.result,null);
 assert.equal(clean.fallEquipment.result,null);
 assert.equal(validateTaskVision('roofing',raw,'insufficient').opening.result,null);
 assert.throws(()=>validateTaskVision('roofing',{opening:{result:'safe',confidence:1}},'usable'));
 assert.match(taskVisionResults('roofing',{quality:'usable',taskChecks:clean})[2].text,/cannot verify/);
});
