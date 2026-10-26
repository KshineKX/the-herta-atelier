export function createToolDock(doc,host,panel,{onCollapse=()=>{}}={}) {
  const win=doc.defaultView,cleanups=[],timers=new Set();let idle,hover,finish,disposed=false,over=false,suppressHover=false,hoverOpenedAt=0,observed;
  const style=doc.createElement('style');style.textContent=`
body[data-herta-atelier] #herta-atelier-controls[data-herta-dock]{width:36px;height:44px;display:block;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;pointer-events:none}
#herta-atelier-controls .herta-dock-slot{position:absolute;right:36px;top:0;width:var(--herta-tools-width);height:44px;overflow:hidden;visibility:hidden;pointer-events:none}
#herta-atelier-controls .herta-dock-tray{box-sizing:border-box;display:flex;align-items:center;gap:6px;width:var(--herta-tools-width);height:44px;padding:4px 6px;background:var(--herta-glass);border:1px solid var(--herta-material-line);border-radius:14px 0 0 14px;transform:translateX(100%);opacity:0;transition:transform 180ms cubic-bezier(.2,.8,.2,1),opacity 180ms linear;pointer-events:none}
#herta-atelier-controls[data-herta-dock=open] .herta-dock-slot,#herta-atelier-controls[data-herta-dock=closing] .herta-dock-slot{visibility:visible}
#herta-atelier-controls[data-herta-dock=open] .herta-dock-tray{transform:translateX(0);opacity:1;pointer-events:auto}
#herta-atelier-controls[data-herta-dock-instant] .herta-dock-tray{transition:none}
#herta-atelier-controls .herta-dock-tray>button{box-sizing:border-box;display:grid;place-items:center;width:36px;height:36px;min-width:36px;min-height:36px;flex:0 0 36px;padding:0;margin:0;appearance:none;border:1px solid var(--herta-material-line);border-radius:11px;background:var(--herta-glass);color:var(--herta-gold);font-size:21px;line-height:1;cursor:pointer;transform:none}
#herta-atelier-controls .herta-dock-tray>button img{display:block;width:23px;height:23px;object-fit:contain;margin:0}
body[data-herta-atelier] #herta-atelier-controls>button.herta-dock-handle{position:absolute;right:0;top:0;display:grid;place-items:center;width:36px;height:44px;min-height:44px;padding:0;border-radius:0 12px 12px 0;background:var(--herta-glass)!important;pointer-events:auto;touch-action:manipulation;color:var(--herta-gold);font-size:22px}
#herta-atelier-controls .herta-dock-handle span{display:block;pointer-events:none;transition:none;transform:none!important}

#herta-atelier-controls[data-herta-dock] section{pointer-events:auto}
#herta-atelier-controls[data-herta-dock] button:focus-visible{outline:2px solid var(--herta-gold);outline-offset:2px}
@media(prefers-reduced-motion:reduce){#herta-atelier-controls .herta-dock-tray,#herta-atelier-controls .herta-dock-handle span{transition:none}}
`;doc.head.append(style);
  const slot=doc.createElement('div'),tray=doc.createElement('div'),handle=doc.createElement('button');slot.className='herta-dock-slot';tray.className='herta-dock-tray';tray.id='herta-dock-tray';tray.setAttribute('role','toolbar');tray.setAttribute('aria-label','大黑塔皮肤工具');
  const buttons=[...host.children].filter(el=>el.tagName==='BUTTON');for(const button of buttons)tray.append(button);host.style.setProperty('--herta-tools-width',(buttons.length*36+Math.max(0,buttons.length-1)*6+12)+'px');slot.append(tray);
  handle.className='herta-dock-handle';handle.id='herta-dock-handle';handle.type='button';handle.innerHTML='<span aria-hidden="true">‹</span>';handle.setAttribute('aria-controls',tray.id);host.append(handle,slot);
  function later(fn,ms){const id=win.setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id}
  function clear(id){win.clearTimeout(id);timers.delete(id)}
  function listen(el,event,fn,opts){el.addEventListener(event,fn,opts);cleanups.push(()=>el.removeEventListener(event,fn,opts))}
  const focused=()=>host.contains(doc.activeElement)&&doc.activeElement.matches(':focus-visible');
  const locked=()=>!panel.hidden||focused();
  function labels(value){handle.firstElementChild.textContent=value?'›':'‹';handle.setAttribute('aria-expanded',String(value));handle.setAttribute('aria-label',value?'收起皮肤工具':'展开皮肤工具');handle.title=value?'收起皮肤工具':'点击或停留片刻展开皮肤工具'}
  function schedule(){clear(idle);if(disposed||over||locked()||host.dataset.hertaDock!=='open')return;idle=later(()=>close(false),4000)}
  function open(instant=false){if(disposed)return;clear(idle);clear(hover);clear(finish);host.toggleAttribute('data-herta-dock-instant',instant);tray.inert=false;tray.removeAttribute('aria-hidden');host.dataset.hertaDock='open';labels(true);schedule()}
  function close(manual=false){if(disposed||!manual&&(over||locked()))return;clear(idle);clear(hover);clear(finish);if(manual){suppressHover=true;onCollapse();if(tray.contains(doc.activeElement))handle.focus({preventScroll:true})}host.removeAttribute('data-herta-dock-instant');tray.inert=true;tray.setAttribute('aria-hidden','true');host.dataset.hertaDock='closing';labels(false);finish=later(()=>{host.dataset.hertaDock='closed'},190)}
  function enter(){over=true;clear(idle);if(host.dataset.hertaDock==='closing')open(true)}
  function leave(){over=false;suppressHover=false;hoverOpenedAt=0;clear(hover);schedule()}
  listen(host,'pointerenter',enter);listen(host,'pointerleave',leave);
  listen(handle,'pointerenter',event=>{enter();if(event.pointerType!=='touch'&&!suppressHover&&host.dataset.hertaDock==='closed')hover=later(()=>{hoverOpenedAt=win.performance.now();open()},200)});
  listen(handle,'pointerleave',()=>clear(hover));
  listen(handle,'click',()=>{if(host.dataset.hertaDock!=='open')open(true);else if(hoverOpenedAt&&win.performance.now()-hoverOpenedAt<700){hoverOpenedAt=0;open(true)}else close(true)});
  listen(slot,'pointerenter',()=>{over=true;open(true)});
  listen(host,'pointerdown',()=>{clear(idle);clear(hover);if(host.dataset.hertaDock==='closing'||host.dataset.hertaDock==='open')open(true)},true);
  listen(host,'focusin',()=>{if(doc.activeElement!==handle)open(true);clear(idle)});listen(host,'focusout',()=>later(schedule,0));
  listen(host,'keydown',event=>{if(event.key==='Escape'&&panel.hidden){close(true);handle.focus({preventScroll:true})}});
  listen(doc,'visibilitychange',()=>{if(doc.hidden){clear(idle);clear(hover)}else schedule()});
  function position(){
    if(disposed)return;const scroll=doc.querySelector('[data-conversation-scroll]'),chat=doc.querySelector('[data-conversation-content]')||scroll?.closest('[data-phase]')||scroll;
    if(observed!==chat){resize.disconnect();if(chat)resize.observe(chat);observed=chat}
    const rect=chat?.getBoundingClientRect(),right=rect?.width>180?Math.min(win.innerWidth,rect.right):win.innerWidth;
    host.style.setProperty('right',Math.max(8,win.innerWidth-right+10)+'px','important');
    const h=host.getBoundingClientRect(),width=Math.min(260,win.innerWidth-24);panel.style.setProperty('position','fixed','important');panel.style.setProperty('left',Math.max(12,Math.min(h.right-width,win.innerWidth-width-12))+'px','important');panel.style.setProperty('right','auto','important');panel.style.setProperty('top',Math.max(12,h.bottom+8)+'px','important');
  }
  const resize=new win.ResizeObserver(position);listen(win,'resize',position);
  const observer=new win.MutationObserver(()=>{if(!panel.hidden)open(true);else schedule();position()});observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
  host.dataset.hertaDock='closed';tray.inert=true;tray.setAttribute('aria-hidden','true');labels(false);position();
  return {position,getState:()=>({mode:host.dataset.hertaDock,locked:locked(),over}),destroy(){disposed=true;for(const timer of timers)win.clearTimeout(timer);timers.clear();observer.disconnect();resize.disconnect();for(const cleanup of cleanups)cleanup();for(const button of buttons)host.insertBefore(button,panel);slot.remove();handle.remove();style.remove();host.style.removeProperty('--herta-tools-width');delete host.dataset.hertaDock;host.removeAttribute('data-herta-dock-instant')}};
}
