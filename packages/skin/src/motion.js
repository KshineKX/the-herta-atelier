// Genuine authored motion only. No image deformation or procedural body warp.
export const MOTION_SCENES = {
  home: { idle:'home-idle', actions:{ leave:{label:'离席',clips:['home-rise','home-exit'],end:'away'}, return:{label:'回来',clips:['home-enter','home-sit']} } },
  chat: { idle:'campus-idle', actions:{ greet:{label:'回头回应',clips:['campus-greet','campus-reset'],holdAfter:0} } },
  settings: { idle:'room-idle', actions:{ roll:{label:'仰躺看你',clips:['room-roll','room-roll-reset'],holdAfter:0}, tilt:{label:'歪头看你',clips:['room-tilt','room-tilt-reset'],holdAfter:0} } },
};

export function createIdleMotion(doc,stage,onUnavailable=()=>{},onStatus=()=>{}) {
  const win=doc.defaultView,reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const plane=doc.createElement('div');plane.className='herta-motion-plane';Object.assign(plane.style,{position:'absolute',inset:'0',pointerEvents:'none'});stage.append(plane);
  const videos=[0,1].map(()=>{const v=doc.createElement('video');v.className='herta-motion-video';v.muted=true;v.defaultMuted=true;v.playsInline=true;v.preload='metadata';v.hidden=true;v.setAttribute('aria-hidden','true');plane.append(v);return v});
  const prepared=[null,null];let blendTimer,blendResolve;
  let options={},catalog=null,catalogPromise=null,disposed=false,failed=false,loading=false,sceneMissing=false,serial=0,actionSerial=0,active=-1,scene='home',state='idle',status='',delayTimer,delayResolve;
  videos.forEach((v,i)=>v.addEventListener('error',()=>{if(i===active&&allowed())fail()}));
  const manifestUrl=()=>options.manifestUrl||'/herta-atelier/motion-manifest.json';
  const allowed=()=>options.enabled&&!disposed&&!failed;
  const paused=()=>doc.hidden||reduced.matches||options.suspended;
  function notify(){
    const visible=active>=0&&!videos[active].hidden&&allowed()&&!sceneMissing&&!reduced.matches;
    stage.dataset.hertaMotion=visible?'ready':allowed()&&!catalog?'loading':'static';
    stage.dataset.hertaActionState=state;
    const next=!options.enabled?'static':failed?'unavailable':sceneMissing?'unavailable-scene':reduced.matches?'paused-reduced':doc.hidden?'paused-hidden':options.suspended?'paused-transition':loading||!visible?'loading':state==='away'?'away':state==='action'?'action':'playing';
    stage.dataset.hertaPlayback=next;if(next!==status){status=next;onStatus(next);}
  }
  function cancelBlend(){clearTimeout(blendTimer);blendResolve?.();blendResolve=null;for(const v of videos){v.style.transition='none';v.style.opacity='1'}}
  function stopAll(clear=false){cancelBlend();for(const [i,v]of videos.entries()){v.pause();if(clear){prepared[i]?.cancel();prepared[i]=null;v.hidden=true;v.removeAttribute('src');v.load()}}if(clear){active=-1;delete stage.dataset.hertaClip}}
  function cancelDelay(){clearTimeout(delayTimer);delayResolve?.();delayResolve=null}
  function fail(){if(disposed)return;failed=true;loading=false;++serial;++actionSerial;cancelDelay();stopAll(true);notify();onUnavailable()}
  async function getCatalog(){
    if(catalog)return catalog;if(catalogPromise)return catalogPromise;
    catalogPromise=(async()=>{const response=await win.fetch(manifestUrl(),{cache:'no-store'});if(!response.ok)throw Error('Motion catalog unavailable');const value=await response.json();if(value.schemaVersion!==1||!value.clips||!Object.keys(value.clips).length)throw Error('No authored motion installed');
      const clips={};for(const [id,clip] of Object.entries(value.clips)){const url=new URL(clip.url,doc.baseURI);if(url.origin!==new URL(doc.baseURI).origin)throw Error('Motion must be local');clips[id]={...clip,url:url.href}}return catalog={clips};})();
    return catalogPromise;
  }
  function prepare(slot,id){
    if(prepared[slot]?.id===id)return prepared[slot].promise;
    prepared[slot]?.cancel();const v=videos[slot],record={id,cancel:()=>{}};prepared[slot]=record;
    record.promise=new Promise((resolve,reject)=>{let timer;const clean=()=>{clearTimeout(timer);v.removeEventListener('loadeddata',ready);v.removeEventListener('error',error)};const ready=()=>{clean();record.cancel=()=>{};resolve()};const error=()=>{clean();prepared[slot]=null;reject(Error('Video decode failed'))};record.cancel=()=>{clean();reject(Error('Video preparation cancelled'))};v.addEventListener('loadeddata',ready,{once:true});v.addEventListener('error',error,{once:true});timer=setTimeout(error,12000);v.pause();v.hidden=true;v.loop=false;v.preload='auto';v.src=catalog.clips[id].url;v.load();if(v.readyState>=2)ready()});
    return record.promise;
  }
  function preload(id){if(id&&catalog?.clips[id]&&active>=0&&allowed())void prepare(active===0?1:0,id).catch(()=>{})}
  async function showClip(id,{loop=false,nextId}={}){
    if(!allowed())return false;const request=++serial;loading=true;notify();
    try{
      await getCatalog();if(disposed||request!==serial||!options.enabled)return false;
      const clip=catalog.clips[id];if(!clip){sceneMissing=true;loading=false;stopAll(true);notify();return false}sceneMissing=false;
      cancelBlend();const slot=active===0?1:0,v=videos[slot];await prepare(slot,id);v.loop=loop;
      if(disposed||request!==serial||!options.enabled){return false}
      if(!paused())await v.play();
      if(disposed||request!==serial||!options.enabled)return false;
      const old=active,blend=old>=0&&!paused()?Math.max(0,Math.min(250,options.blendMs??180)):0;
      active=slot;loading=false;plane.style.opacity=String(options.opacity??.9);v.hidden=reduced.matches;v.style.zIndex='2';v.style.opacity=blend?'0':'1';stage.dataset.hertaClip=id;
      if(old>=0&&old!==slot){videos[old].pause();videos[old].style.zIndex='1'}
      notify();
      if(blend){void v.offsetWidth;v.style.transition=`opacity ${blend}ms linear`;v.style.opacity='1';await new Promise(resolve=>{blendResolve=resolve;blendTimer=setTimeout(()=>{blendResolve=null;resolve()},blend)})}
      if(disposed||request!==serial||!options.enabled)return false;
      if(old>=0&&old!==slot)videos[old].hidden=true;
      v.style.transition='none';preload(nextId);return true;
    }catch{if(!disposed&&request===serial&&options.enabled)fail();return false}
  }
  function ended(video,token){return new Promise(resolve=>{let timer;const complete=()=>{clearInterval(timer);video.removeEventListener('ended',complete);resolve(token===actionSerial&&!disposed&&options.enabled)};video.addEventListener('ended',complete,{once:true});timer=setInterval(()=>{if(token!==actionSerial||disposed||!options.enabled)complete()},100);if(video.ended)complete()})}
  async function idle(){state='idle';const set=MOTION_SCENES[scene]||MOTION_SCENES.home;return showClip(set.idle,{loop:true,nextId:scene==='home'?'home-rise':null})}
  function availableActions(){const set=MOTION_SCENES[scene]||MOTION_SCENES.home;return Object.entries(set.actions).filter(([,a])=>catalog?.clips[set.idle]&&a.clips.every(id=>catalog.clips[id])).filter(([id])=>scene!=='home'||(state==='away'?id==='return':id==='leave')).map(([id,a])=>({id,label:a.label,disabled:state==='action'||loading||!allowed()||!catalog||paused()}))}
  async function trigger(id){
    const set=MOTION_SCENES[scene]||MOTION_SCENES.home,action=set.actions[id];if(!action||state==='action'||loading||!allowed()||paused()||!catalog||!catalog.clips[set.idle]||!action.clips.every(id=>catalog.clips[id]))return false;
    if(scene==='home'&&((id==='return')!==(state==='away')))return false;
    const token=++actionSerial;state='action';notify();
    for(let i=0;i<action.clips.length;i++){
      const nextId=action.clips[i+1]||(action.end==='away'?set.actions.return?.clips[0]:set.idle);
      if(token!==actionSerial||!await showClip(action.clips[i],{nextId}))return false;
      if(!await ended(videos[active],token))return false;
      if(i===action.holdAfter){await new Promise(resolve=>{delayResolve=resolve;delayTimer=setTimeout(()=>{delayResolve=null;resolve()},1400)});if(token!==actionSerial||!allowed())return false}
    }
    if(token!==actionSerial)return false;
    if(action.end==='away'){state='away';notify();return true}
    await idle();return true;
  }
  function resume(){
    cancelBlend();plane.style.opacity=String(options.opacity??.9);
    for(let i=0;i<videos.length;i++){const v=videos[i];if(i!==active||!allowed()||paused())v.pause();else if(state!=='away'&&!v.ended)v.play().catch(fail);v.hidden=i!==active||!allowed()||reduced.matches}
    notify();
  }
  function update(next){
    const before=options;options=next;const nextScene=MOTION_SCENES[next.scene]?next.scene:'home',changed=nextScene!==scene;scene=nextScene;
    if(!next.enabled){++serial;++actionSerial;cancelDelay();state='idle';failed=false;sceneMissing=false;loading=false;catalog=null;catalogPromise=null;stopAll(true);notify();return}
    if(failed){notify();return}
    if(changed||!before.enabled||active<0&&!catalogPromise){++actionSerial;cancelDelay();notify();void idle();return}
    if(before.suspended!==next.suspended||before.opacity!==next.opacity)resume();else notify();
  }
  doc.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);
  return {update,trigger,availableActions,getState:()=>({scene,state,status,clip:stage.dataset.hertaClip,loading,sceneMissing}),dispose(){disposed=true;++serial;++actionSerial;cancelDelay();stopAll(true);plane.remove();doc.removeEventListener('visibilitychange',resume);reduced.removeEventListener('change',resume);for(const key of ['hertaMotion','hertaPlayback','hertaActionState','hertaClip'])delete stage.dataset[key]}};
}
