const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
class CE{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
const context={console,structuredClone,Date,Math,JSON,Number,String,Object,Array,Set,Map,Error,CustomEvent:CE,window:{dispatchEvent(){}}};context.window.window=context.window;context.window.SmartFarmConfig={relays:[{id:'pump'},{id:'zone1'},{id:'lighthome'},{id:'lightsala'}]};context.SmartFarmConfig=context.window.SmartFarmConfig;vm.createContext(context);vm.runInContext(fs.readFileSync('dashboard/js/state.js','utf8'),context);const s=context.window.FarmState;
let state=s.get();for(const value of Object.values(state.relays))assert.equal(value,null,'relay starts unknown');assert.equal(state.espOnline,null);
assert.throws(()=>s.setRelay('pump',true),/invalid relay state/);assert.equal(s.get().relays.pump,null);
s.setRelay('pump','ON');assert.equal(s.get().relays.pump,true);s.setConnection('offline','test disconnect');assert.equal(s.get().relays.pump,null);assert.equal(s.get().espOnline,false);
s.setConnection('online','connected');s.setDevice({online:true,mqtt:true,firmware:'test',device_id:'unit-1'},true);assert.equal(s.get().espOnline,false,'retained heartbeat cannot establish liveness');s.setDevice({online:true,mqtt:true,firmware:'V7.2.0-OTA-STABLE',device_id:'unit-1'},false);assert.equal(s.get().espOnline,true);
s.setRelay('zone1','OFF');assert.equal(s.get().relays.zone1,false);s.setEspOffline('heartbeat timeout');for(const value of Object.values(s.get().relays))assert.equal(value,null,'ESP offline resets live relay state to unknown');
s.setSensor({temperature:29.5,humidity:71});assert.equal(s.get().temperature,29.5);assert.throws(()=>s.setSensor({temperature:'30'}),/invalid sensor field/);assert.equal(s.get().temperature,29.5);
assert.throws(()=>s.setMode('SCHEDULE'),/unsupported firmware mode/);s.setMode('AUTO');assert.equal(s.get().mode,'AUTO');
console.log('PASS state contract: null, strict relay/sensor, retained heartbeat, live heartbeat, offline reset, modes');
