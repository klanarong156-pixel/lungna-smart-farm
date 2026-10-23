const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('dashboard/js/app.js', 'utf8');

assert.match(app, /let modePending[^;]*scheduleDraftActive = false, scheduleDraft = null;/,
  'Schedule draft must live separately from the latest FarmState snapshot');
assert.match(app, /if \(scheduleDraftActive && !force && scheduleDraft\?\.id === id\) \{[^}]*return;/,
  'A live editor must not be rebuilt by incoming render updates');
assert.match(app, /function beginScheduleDraft\(\)[\s\S]*?FarmState\.get\(\)\.schedules\?\.\[id\]\?\.slots[\s\S]*?scheduleDraft = \{ id, slots:/,
  'Draft must be initialized from a copy of confirmed device state');
assert.match(app, /function captureScheduleDraft\(\)[\s\S]*?checked\)[\s\S]*?data-field="on"[\s\S]*?data-field="off"[\s\S]*?scheduleDraft = \{ id, slots:/,
  'Checkbox enabled and both times must be captured into draft');
assert.match(app, /scheduleDraft = \{ id, slots: normalized\.slots\.map/,
  'Only the validated user draft is sent as the pending payload');
assert.match(app, /if \(confirmed\) \{ scheduleDraftActive = false; scheduleDraft = null; \} else scheduleDraftActive = true;/,
  'Clear draft only after ESP confirmation; retain on save failure');
assert.match(app, /pointerdown[\s\S]*?beginScheduleDraft\(\)[\s\S]*?focusin[\s\S]*?beginScheduleDraft\(\)/,
  'Draft must be protected before iOS time picker interaction begins');
console.log('PASS schedule editor regression: isolated draft, stable editor during picker/state updates, confirmed-only clear');
