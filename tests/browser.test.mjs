import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createPreviewServer } from '../tools/preview.mjs';
import { PALETTES } from '../packages/skin/src/palette.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(process.env.HERTA_TEST_MODULE_ROOT?path.join(process.env.HERTA_TEST_MODULE_ROOT,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const complete=fs.existsSync(path.join(root,'packages/skin/motion/motion-manifest.json'));

test('browser regression against a semantic DSH fixture (not native acceptance)',{timeout:120000},async t=>{
  const server=createPreviewServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)}));
  const base='http://127.0.0.1:'+server.address().port;
  const channel=process.env.HERTA_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined);
  const browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
  t.after(()=>browser.close());
  async function pageFor(settings={},options={}){
    const context=await browser.newContext({viewport:{width:1440,height:1000},...options});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(value=>localStorage.setItem('herta-atelier:v1',JSON.stringify(value)),{art:'soft',scene:'home',motion:'static',theme:'dark',...settings});
    await page.goto(base+'/skin-preview.html');
    await page.waitForFunction(()=>document.body.dataset.demoReady==='true');
    return {page,errors,async close(){await context.close();assert.deepEqual(errors,[],'Uncaught browser errors')}};
  }
  await t.test('palette, native text and focus geometry remain consistent in both tones',async()=>{
    for(const tone of ['dark','light']){
      const fixture=await pageFor({theme:tone}),{page}=fixture;
      try{
        const before=await page.evaluate(()=>({heading:document.querySelector('h1').textContent,placeholder:document.querySelector('textarea').placeholder,boxes:[...document.querySelectorAll('[data-chat-flow-key],[data-composer-card]')].map(el=>{const r=el.getBoundingClientRect();return[r.x,r.y,r.width,r.height]})}));
        const colors=await page.evaluate(names=>Object.fromEntries(names.map(name=>[name,document.body.style.getPropertyValue('--'+name)])),Object.keys(PALETTES));
        for(const[name,values]of Object.entries(PALETTES))assert.equal(colors[name],values[tone==='light'?1:0]);
        await page.evaluate(()=>document.querySelector('#herta-atelier-view').click());
        const after=await page.evaluate(()=>({heading:document.querySelector('h1').textContent,placeholder:document.querySelector('textarea').placeholder,boxes:[...document.querySelectorAll('[data-chat-flow-key],[data-composer-card]')].map(el=>{const r=el.getBoundingClientRect();return[r.x,r.y,r.width,r.height]})}));
        assert.deepEqual(after,before,'Reading mode must not move or rewrite host content');
        assert.equal(await page.locator('body').getAttribute('data-herta-view'),'focus');
        const contrast=await page.evaluate(()=>{
          const el=document.querySelector('th'),style=getComputedStyle(el);
          const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4});
          const lum=value=>rgb(value).reduce((sum,c,index)=>sum+c*[.2126,.7152,.0722][index],0);
          const a=lum(style.color),b=lum(style.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        });
        assert.ok(contrast>=4.5,'Table headers need a readable text color, not ornament gold');
      }finally{await fixture.close()}
    }
  });
  await t.test('wide tables scroll within the answer instead of widening the window',async()=>{
    const fixture=await pageFor(),{page}=fixture;
    try{
      const geometry=await page.evaluate(()=>{const table=document.querySelector('table');table.querySelector('td').textContent='wide-column-'.repeat(100);table.querySelector('td').style.whiteSpace='nowrap';return{table:table.clientWidth,content:table.scrollWidth,window:innerWidth,page:document.documentElement.scrollWidth,overflow:getComputedStyle(table).overflowX}});
      assert.ok(geometry.content>geometry.table);assert.equal(geometry.overflow,'auto');assert.ok(geometry.page<=geometry.window+1);
    }finally{await fixture.close()}
  });
  await t.test('streamed answer chunks do not repeatedly measure the whole sidebar',async()=>{
    const fixture=await pageFor(),{page}=fixture;
    try{
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const calls=await page.evaluate(async()=>{const sidebar=document.querySelector('.demo-sidebar'),original=sidebar.getBoundingClientRect;let count=0;sidebar.getBoundingClientRect=function(){count++;return original.call(this)};const answer=document.querySelector('[data-chat-flow-key]');for(let i=0;i<100;i++)answer.append(document.createTextNode('流式片段'));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));sidebar.getBoundingClientRect=original;return count});
      assert.equal(calls,0,'Existing streamed Markdown already inherits CSS');
    }finally{await fixture.close()}
  });
  await t.test('rapid theme changes settle and disposal restores only owned changes',async()=>{
    const fixture=await pageFor(),{page}=fixture;
    try{
      await page.evaluate(()=>{const button=document.querySelector('#herta-atelier-theme');button.click();button.click()});
      await page.waitForFunction(()=>document.body.dataset.hertaPalette==='settled'&&document.querySelector('#herta-atelier-theme').dataset.tone==='dark');
      await page.evaluate(()=>{const button=document.querySelector('#herta-atelier-theme');button.click();button.click();button.click()});
      await page.waitForFunction(()=>document.body.dataset.hertaPalette==='settled'&&!document.querySelector('#herta-atelier-theme').hasAttribute('aria-busy'));
      assert.equal(await page.locator('#herta-atelier-theme').getAttribute('data-tone'),'light');
      assert.equal(await page.locator('#herta-atelier-theme').getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('#herta-atelier-theme svg[aria-hidden=true]').count(),1);
      await page.evaluate(async()=>{window.demoDispose();const {mount}=await import('/packages/skin/src/client.js');document.body.setAttribute('data-ds-dark-theme','');document.body.style.setProperty('--herta-ink','rgb(1, 2, 3)');window.demoDispose=mount(document,{storage:{getItem:()=>JSON.stringify({theme:'light',art:'soft',scene:'home'}),setItem(){}}})});
      assert.equal(await page.locator('body').getAttribute('data-herta-tone'),'light');
      const restored=await page.evaluate(()=>{window.demoDispose();return{dark:document.body.hasAttribute('data-ds-dark-theme'),ink:document.body.style.getPropertyValue('--herta-ink'),owned:!!document.querySelector('#herta-atelier-controls,[data-herta-surface],[data-herta-frame]')}});
      assert.deepEqual(restored,{dark:true,ink:'rgb(1, 2, 3)',owned:false});
      await page.evaluate(async()=>{const {mount}=await import('/packages/skin/src/client.js');window.demoDispose=mount(document,{storage:{getItem:()=>JSON.stringify({theme:'dark',art:'soft'}),setItem(){}}});document.body.removeAttribute('data-ds-dark-theme')});
      await page.waitForFunction(()=>document.body.dataset.hertaTone==='light');
      assert.equal(await page.evaluate(()=>{window.demoDispose();return document.body.hasAttribute('data-ds-dark-theme')}),false,'A later native theme choice must survive disposal');
    }finally{await fixture.close()}
  });
  await t.test('dock arrows have equal height, do not rotate, and keyboard dismissal works',async()=>{
    const fixture=await pageFor(),{page}=fixture;
    try{
      await page.locator('#herta-dock-handle').click();
      assert.equal(await page.locator('#herta-dock-handle span').textContent(),'›');
      const geometry=await page.evaluate(()=>{const tray=document.querySelector('.herta-dock-tray'),handle=document.querySelector('#herta-dock-handle'),a=tray.getBoundingClientRect(),b=handle.getBoundingClientRect();return{height:[a.height,b.height],top:[a.top,b.top],transform:getComputedStyle(handle.firstElementChild).transform}});
      assert.deepEqual(geometry.height,[44,44]);assert.equal(geometry.top[0],geometry.top[1]);assert.equal(geometry.transform,'none');
      await page.getByRole('button',{name:'大黑塔皮肤设置',exact:true}).click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#herta-atelier-settings').isHidden(),true);
      assert.equal(await page.locator('#herta-atelier-settings').getByText('动作播放中',{exact:true}).count(),0);
    }finally{await fixture.close()}
  });
  await t.test('authored video advances in all three scenes; three deliberate backdrop taps trigger an action',{skip:!complete&&'Core edition intentionally has no portrait videos'},async()=>{
    const fixture=await pageFor({motion:'dynamic'}),{page}=fixture;
    try{
      for(const [scene,clip]of [['home','home-idle'],['chat','campus-idle'],['settings','room-idle']]){
        if(scene!=='home')await page.evaluate(value=>{const select=[...document.querySelectorAll('#herta-atelier-settings select')].find(el=>[...el.options].some(option=>option.value==='home'));select.value=value;select.dispatchEvent(new Event('change'))},scene);
        await page.waitForFunction(id=>document.querySelector('#herta-atelier-stage').dataset.hertaClip===id&&[...document.querySelectorAll('.herta-motion-video')].some(video=>!video.hidden&&!video.paused),clip);
        const first=await page.evaluate(()=>[...document.querySelectorAll('.herta-motion-video')].find(video=>!video.hidden&&!video.paused).currentTime);
        await page.waitForFunction(time=>[...document.querySelectorAll('.herta-motion-video')].some(video=>!video.hidden&&!video.paused&&video.currentTime>time+.2),first);
      }
      await page.evaluate(()=>{const target=document.querySelector('.demo-header');for(let i=0;i<3;i++){target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,isPrimary:true,clientX:300,clientY:80}));target.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,isPrimary:true,clientX:300,clientY:80}))}});
      await page.waitForFunction(()=>document.querySelector('#herta-atelier-stage').dataset.hertaActionState==='action');
    }finally{await fixture.close()}
  });
  await t.test('system reduced motion leaves the static artwork visible',async()=>{
    const fixture=await pageFor({motion:'dynamic'},{reducedMotion:'reduce'}),{page}=fixture;
    try{
      await page.waitForFunction(complete=>document.querySelector('#herta-atelier-stage').dataset.hertaPlayback===(complete?'paused-reduced':'unavailable'),complete);
      // Require the catalog request to finish before accepting a reduced-motion state.
      const catalog=await page.evaluate(async()=>await(await fetch('/herta-atelier/motion-manifest.json')).json());assert.equal(catalog.status,complete?'ready':'missing');
      if(complete)await page.waitForFunction(()=>document.querySelector('#herta-atelier-stage').dataset.hertaClip==='home-idle');
      assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.herta-motion-video')].some(video=>!video.hidden&&!video.paused)),false);
      assert.equal(await page.locator('.herta-art-home-dark').evaluate(element=>getComputedStyle(element).visibility),'visible');
    }finally{await fixture.close()}
  });
});
