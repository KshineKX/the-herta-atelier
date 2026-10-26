import test from 'node:test';import assert from 'node:assert/strict';import {inspectPatch} from '../tools/profile.mjs';
test('doctor distinguishes inherited duplicate theme overrides from owned managed blocks without repairing YAML',()=>{
 const raw='# 保留此中文注释\r\n- id: ui-skin-herta-atelier\r\n  disabled: false\r\n- id: unrelated\r\n  config: { token: untouched }\r\n- id: ui-skin-herta-atelier\r\n  disabled: false\r\n';
 const before=Buffer.from(raw);const legacy=inspectPatch(raw);assert.deepEqual(legacy.duplicateIds,[{id:'ui-skin-herta-atelier',count:2}]);assert.equal(legacy.legacyHertaEntries,2);assert.equal(legacy.repairApplied,false);assert.deepEqual(Buffer.from(raw),before);
 const managed=inspectPatch('# BEGIN THE-HERTA-ATELIER MANAGED\n- id: ui-skin-herta-atelier\n  disabled: false\n# END THE-HERTA-ATELIER MANAGED\n');assert.equal(managed.managedBlocks,1);assert.deepEqual(managed.duplicateIds,[]);assert.equal(managed.legacyHertaEntries,null);
});
