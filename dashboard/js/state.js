(() => {
  'use strict';
  const relays=Object.fromEntries(SmartFarmConfig.relays.map(r=>[r.id,null]));
  const state={connection:'offline',connectionReason:'ยังไม่ได้เชื่อมต่อ',espOnline:null,heartbeatAt:0,device:null,mode:null,temperature:null,humidity:null,relays,errors:[]};
  const listeners=new Set();
  function emit(event){const snapshot=structuredClone(state);listeners.forEach(fn=>fn(snapshot,event));window.dispatchEvent(new CustomEvent('farm:state',{detail:{state:snapshot,event}}));}
  function setConnection(status,reason=''){state.connection=status;state.connectionReason=reason;if(status!=='online'){if(status!=='connecting')state.espOnline=false;Object.keys(state.relays).forEach(id=>state.relays[id]=null);if(status!=='connecting')state.mode=null;}emit('connection:'+status);}
  function setEspOffline(reason='offline'){state.espOnline=false;state.mode=null;state.connectionReason=reason;Object.keys(state.relays).forEach(id=>state.relays[id]=null);emit('esp:offline');}
  function setDevice(obj,retained=false){if(!obj||typeof obj!=='object'||Array.isArray(obj)||typeof obj.online!=='boolean'||typeof obj.mqtt!=='boolean')throw Error('device heartbeat payload invalid');state.device=obj;if(!retained){state.heartbeatAt=Date.now();state.espOnline=obj.online&&obj.mqtt;}emit('device:update');}
  function setSensor(obj){if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('DHT11 payload must be object');for(const k of ['temperature','humidity'])if(obj[k]!==undefined&&obj[k]!==null&&(typeof obj[k]!=='number'||!Number.isFinite(obj[k])))throw Error('invalid sensor field '+k);state.temperature=typeof obj.temperature==='number'?obj.temperature:null;state.humidity=typeof obj.humidity==='number'?obj.humidity:null;emit('sensor:update');}
  function setRelay(id,payload){if(!Object.hasOwn(state.relays,id))throw Error('unknown relay '+id);if(payload!=='ON'&&payload!=='OFF')throw Error('invalid relay state');state.relays[id]=payload==='ON';emit('relay:'+id);}
  function setMode(payload){if(!['AUTO','MANUAL'].includes(payload))throw Error('unsupported firmware mode');state.mode=payload;emit('mode:update');}
  function addError(kind,message){const item={kind:String(kind),message:String(message),at:Date.now()};state.errors=[item,...state.errors].slice(0,20);emit('error');console.error('[SmartFarm]',item);}
  function subscribe(fn){listeners.add(fn);fn(structuredClone(state),'initial');return()=>listeners.delete(fn);}
  window.FarmState=Object.freeze({get:()=>structuredClone(state),subscribe,setConnection,setEspOffline,setDevice,setSensor,setRelay,setMode,addError});
})();
