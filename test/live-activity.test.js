import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSceneActivity,liveConfig} from '../live.js';
import {describeLiveScene} from '../public/live-review.js';
test('Live activity is bounded, visibility-aware and does not infer unsafe inactivity',()=>{
 assert.equal(validateSceneActivity('no_visible_work','usable'),'no_visible_work');
 assert.equal(validateSceneActivity('work_visible','insufficient'),'unclear');
 assert.equal(validateSceneActivity(undefined,'usable'),'unclear');
 assert.throws(()=>validateSceneActivity('safe','usable'));
 assert.match(describeLiveScene('no_visible_work','usable'),/Sitting or waiting is not itself a safety issue/);
 assert.match(describeLiveScene('no_person','usable'),/No person is visible/);
 assert.match(describeLiveScene('work_visible','insufficient'),/can’t clearly identify/);
 assert.ok(liveConfig().tools[0].functionDeclarations[0].parameters.required.includes('sceneActivity'));
});
