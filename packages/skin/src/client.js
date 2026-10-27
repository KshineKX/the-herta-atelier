import { createMirror } from './mirror.js';
import { createIdleMotion } from './motion.js';
import { createToolDock } from './dock.js';
import { SCENE_DEFINITIONS } from './scenes.js';
import { createThemeIcon } from './theme-icon.js';
const KEY = 'herta-atelier:v1';
import { CSS, THEME_TRANSITION_MS } from './styles.js';
import { PALETTES } from './palette.js';
import { PROJECT_VERSION } from './project.generated.js';
import { HOST_SELECTORS, shellFrame, shouldSyncMutation, shouldDecorateSurface } from './host.js';
const DEFAULTS = { opacity: 0.9, scene: 'auto', theme: 'auto', art: 'ultra', mirror: true, displayMode: 'admire', motion: 'static' };
const SCENES = ['auto', ...Object.keys(SCENE_DEFINITIONS)];
const THEMES = ['auto', 'light', 'dark'];

export function sanitize(value = {}) {
  return {
    opacity: Number.isFinite(value.opacity) ? Math.max(0.12, Math.min(1, value.opacity)) : DEFAULTS.opacity,
    scene: SCENES.includes(value.scene) ? value.scene : DEFAULTS.scene,
    theme: THEMES.includes(value.theme) ? value.theme : DEFAULTS.theme,
    art: ['soft','crisp','ultra'].includes(value.art) ? value.art : 'ultra',
    mirror: value.mirror !== false,
    displayMode: ['admire','focus'].includes(value.displayMode) ? value.displayMode : DEFAULTS.displayMode,
    motion: value.motion === 'dynamic' ? 'dynamic' : 'static',
  };
}

export function chooseScene(doc) {
  if ([...doc.querySelectorAll('[role="dialog"],[aria-modal="true"],[data-slot="settings"]')]
    .some((el) => !el.hidden && !el.closest('[hidden],#herta-atelier-mirror'))) return 'settings';
  for (const el of doc.querySelectorAll('[data-phase]')) {
    if (el.querySelector('[data-conversation-scroll]') && ['active', 'settling'].includes(el.dataset.phase)) return 'chat';
  }
  return 'home';
}

export function chooseTone(scene, nativeDark) { return nativeDark ? 'dark' : 'light'; }
function isPreviewShell(doc) {
  return !!doc.getElementById('settings-demo') || /(^|\/)preview\.html$/.test(doc.defaultView.location.pathname);
}
// DSH SlotOutlet uses display:contents. Its anchor is addressable, but it has no
// layout box. Use the first real sidebar container for geometry and decoration.
export function sidebarLayoutHost(doc) {
  const anchor = doc.querySelector('[data-slot="sidebar"]');
  if (!anchor) return null;
  const ownsBox = element => {
    const rect = element.getBoundingClientRect();
    return doc.defaultView.getComputedStyle(element).display !== 'contents' && rect.width > 24 && rect.height > 60;
  };
  if (ownsBox(anchor)) return anchor;
  const queue = [...anchor.children];
  for (let visited = 0; queue.length && visited < 24; visited++) {
    const candidate = queue.shift();
    if (ownsBox(candidate)) return candidate;
    queue.push(...candidate.children);
  }
  return null;
}
function shellContentTop(doc, sidebar) {
  const chrome = parseFloat(doc.defaultView.getComputedStyle(doc.documentElement).getPropertyValue('--dsh-windows-titlebar-height')) || 32;
  const left = sidebar?.getBoundingClientRect().right || 0;
  const tabs = [...doc.querySelectorAll('[role="tablist"]')].map(el => el.getBoundingClientRect())
    .filter(rect => rect.width > 0 && rect.height > 0 && rect.left >= left - 2 && rect.top < 180);
  return Math.max(chrome + 72, ...tabs.map(rect => rect.bottom));
}

const ART = Object.entries(SCENE_DEFINITIONS).flatMap(([scene,definition])=>Object.entries(definition.artwork).map(([tone,file])=>[scene+'-'+tone,file]));
function artworkFile(file, mode) {
  if(mode === 'ultra')return file.replace('-soft.webp','-ultra.webp');
  if(mode === 'crisp' && file.startsWith('art-home-'))return file.replace('-soft.webp','-crisp.webp');
  return file;
}

export function mount(doc = document, { base = '/herta-atelier/', storage = globalThis.localStorage } = {}) {
  if (doc.getElementById('herta-atelier-controls')) return () => {};
  let settings;
  try { settings = sanitize(JSON.parse(storage.getItem(KEY) || '{}')); } catch { settings = { ...DEFAULTS }; }

  const body = doc.body;
  // Discard the retired layout switch, including attributes left by a hot reload.
  body.removeAttribute('data-herta-reading');
  const style = doc.createElement('style');
  style.dataset.hertaAtelier = '';
  style.textContent = CSS.replaceAll('__HERTA_ASSETS__', new URL(base, doc.baseURI).href);
  doc.head.append(style);

  // One clock drives every color, gradient and portrait blend. Individual
  // component transitions would restart on each update and fall out of sync.
  const palettes = PALETTES;
  const shellProperties = [...Object.keys(palettes).map(name => '--'+name),'--herta-theme-mix'];
  const shellBefore = new Map(shellProperties.map(name => [name,{value:body.style.getPropertyValue(name),priority:body.style.getPropertyPriority(name)}]));
  const shellAfter = new Map();
  let shellTone;
  function syncShellPalette(tone) {
    if (tone === shellTone) return;
    shellTone = tone;
    const side = tone === 'light' ? 1 : 0;
    // Apply the final palette once. A root snapshot fade animates its pixels;
    // inherited custom properties are never rewritten on every frame.
    for (const [name, values] of Object.entries(palettes)) {
      const property = '--' + name;
      body.style.setProperty(property, values[side], 'important');
      shellAfter.set(property, body.style.getPropertyValue(property));
    }
    body.style.setProperty('--herta-theme-mix', String(side), 'important');
    shellAfter.set('--herta-theme-mix', body.style.getPropertyValue('--herta-theme-mix'));
    if (!body.hasAttribute('data-herta-transition')) body.dataset.hertaPalette = 'settled';
  }
  let nativeThemeDark=body.hasAttribute('data-ds-dark-theme'),lastThemeWritten=null;
  function writeTheme(dark){lastThemeWritten=dark;body.toggleAttribute('data-ds-dark-theme',dark);}
  if(settings.theme==='light'||settings.theme==='dark')writeTheme(settings.theme==='dark');
  let requestedDark=body.hasAttribute('data-ds-dark-theme');
  body.dataset.hertaAtelier = '';
  // The local preview harness has settings-demo/preview.html; everything else is the shipped shell.
  const previewShell = isPreviewShell(doc);
  if (previewShell) body.setAttribute('data-herta-preview', ''); else body.removeAttribute('data-herta-preview');
  body.dataset.hertaShell = previewShell ? 'preview' : 'real';

  const stage = doc.createElement('div');
  stage.id = 'herta-atelier-stage';
  stage.setAttribute('aria-hidden', 'true');
  const layers = new Map();
  for (const [id, file] of ART) {
    const layer = doc.createElement('div');
    layer.className = 'herta-art herta-art-' + id;
    layer.style.backgroundImage = 'none';
    stage.append(layer);
    layers.set(id, layer);
  }

  const controls = doc.createElement('div');
  controls.id = 'herta-atelier-controls';
  let toolDock;
  const ornamentalFrame = doc.createElement('div');
  ornamentalFrame.id = 'herta-atelier-frame';
  ornamentalFrame.setAttribute('aria-hidden', 'true');

  const image = (file, alt) => {
    const img = doc.createElement('img');
    img.src = base + file;
    img.alt = alt;
    return img;
  };

  const themeButton = doc.createElement('button');
  themeButton.id = 'herta-atelier-theme';
  themeButton.type = 'button';
  themeButton.append(createThemeIcon(doc));

  const viewButton = doc.createElement('button');
  viewButton.id = 'herta-atelier-view'; viewButton.type = 'button';
  const viewIcon = image('herta-view.svg', ''); viewButton.append(viewIcon);

  const open = doc.createElement('button');
  open.append(image('herta-symbol.svg', ''));
  open.title = '大黑塔皮肤设置';
  open.setAttribute('aria-label', '大黑塔皮肤设置');
  open.setAttribute('aria-expanded', 'false');

  const panel = doc.createElement('section');
  panel.id = 'herta-atelier-settings';
  open.setAttribute('aria-controls', panel.id);
  panel.hidden = true;
  panel.setAttribute('aria-label', '大黑塔 · 天才书房 皮肤设置面板');

  const heading = doc.createElement('strong');
  const panelDark=image('herta-wordmark-plaque.svg','HERTA'),panelLight=image('herta-wordmark-on-light.svg','HERTA');
  panelDark.className='herta-panel-dark';panelLight.className='herta-panel-light';heading.append(panelDark,panelLight);
  panel.append(heading);

  const row = (text, control) => {
    const label = doc.createElement('label');
    const span = doc.createElement('span');
    span.textContent = text;
    label.append(span, control);
    panel.append(label);
  };

  const theme = doc.createElement('select');
  for (const [value, text] of [['auto', '跟随 DSH'], ['light', '浅色 · 晨光'], ['dark', '深色 · 紫黑']]) {
    const option = doc.createElement('option');
    option.value = value;
    option.textContent = text;
    theme.append(option);
  }
  row('深浅外观', theme);
  const displayMode = doc.createElement('select'); displayMode.id='herta-display-mode';
  for (const [value,text] of [['admire','观赏模式'],['focus','专注模式']]) { const option=doc.createElement('option');option.value=value;option.textContent=text;displayMode.append(option); }
  row('显示模式', displayMode);
  const motionMode=doc.createElement('select');motionMode.id='herta-motion-mode';
  for(const [value,text]of [['static','静态'],['dynamic','动态']]){const option=doc.createElement('option');option.value=value;option.textContent=text;motionMode.append(option);}
  row('立绘模式',motionMode);

  const artDetail = doc.createElement('select');
  for (const [value, text] of [['ultra', '极清 · AI 4×超分'], ['crisp', '清晰 · 细节修复'], ['soft', '柔和 · 原画氛围']]) {
    const option = doc.createElement('option'); option.value = value; option.textContent = text; artDetail.append(option);
  }
  row('画面细节', artDetail);

  const opacity = doc.createElement('input');
  opacity.type = 'range';
  opacity.min = '.12';
  opacity.max = '1';
  opacity.step = '.01';
  opacity.value = settings.opacity;
  row('背景强度', opacity);


  const scene = doc.createElement('select');
  for (const [value, text] of [['auto', '随页面切换'], ...Object.entries(SCENE_DEFINITIONS).map(([id,value])=>[id,value.label])]) {
    const option = doc.createElement('option');
    option.value = value;
    option.textContent = text;
    scene.append(option);
  }
  row('画像场景', scene);

  const source = doc.createElement('small');
  source.textContent = '观赏保留画像 · 专注增强正文\n藏镜由工具栏按需打开';
  panel.append(source);

  const close = doc.createElement('button');
  close.textContent = '收起';
  panel.append(close);
  controls.append(themeButton, viewButton, open, panel);

  const brand = doc.createElement('div');
  brand.id = 'herta-atelier-brand';
  const brandDark = image('herta-wordmark.svg', 'HERTA');
  brandDark.className = 'herta-wm-dark';
  const brandLight = image('herta-wordmark-on-light.svg', 'HERTA');
  brandLight.className = 'herta-wm-light';
  brand.append(brandDark, brandLight);
  const brandCaption = doc.createElement('span');
  brandCaption.className = 'herta-brand-caption';
  brandCaption.textContent = '天才俱乐部 · 私人馆藏';
  brandCaption.setAttribute('aria-hidden', 'true');
  brand.append(brandCaption);
  const version = doc.createElement('small');
  version.className = 'herta-build';
  version.textContent = 'v'+PROJECT_VERSION+' · Kshine';
  panel.append(version);
  const nativeLayoutChanges = new Map();

  // Inline shell layout: survives stylesheet ordering/caching differences and is
  // the final arbiter if the shipped sidebar lives in a shadow root.
  function applyShellLayout(nativeButton, sidebar) {
    const real = body.dataset.hertaShell === 'real';
    const set = (element, property, value) => {
      if (!element) return;
      let changes;
      if (real && element !== brand && element !== brandDark && element !== brandLight && element !== brandCaption && element !== controls && element !== ornamentalFrame) {
        if (!nativeLayoutChanges.has(element)) nativeLayoutChanges.set(element,new Map());
        changes = nativeLayoutChanges.get(element);
        if (!changes.has(property)) changes.set(property,{before:element.style.getPropertyValue(property),priority:element.style.getPropertyPriority(property)});
      }
      if (value == null) element.style.removeProperty(property);
      else element.style.setProperty(property, value, 'important');
      if (changes) Object.assign(changes.get(property),{after:element.style.getPropertyValue(property),afterPriority:element.style.getPropertyPriority(property)});
    };
    for (const mark of [brandDark, brandLight]) {
      set(mark, 'width', real ? '170px' : null);
      set(mark, 'height', real ? '38px' : null);
      set(mark, 'object-fit', real ? 'contain' : null);
      set(mark, 'margin', real ? '0 auto' : null);
      mark.removeAttribute('width'); mark.removeAttribute('height');
    }
    set(brand, 'padding', real ? '54px 12px 18px' : null);
    set(brand, 'box-sizing', real ? 'border-box' : null);
    set(brand, 'margin', real ? '0 auto' : null);
    set(brand, 'background', real ? 'var(--herta-scroll) left top/92px auto no-repeat,var(--herta-crest) center 0/176px auto no-repeat' : null);
    set(brand, 'max-width', real ? '240px' : null);
    set(brand, 'width', real ? '100%' : null);
    set(brand, 'text-align', real ? 'center' : null);
    set(brand, 'height', real ? '128px' : null);
    set(brand, 'display', real ? 'block' : null);
    set(brandCaption, 'display', real ? 'block' : null);
    if (nativeButton) {
      const row = nativeButton.parentElement;
      if (real && row && sidebar?.contains(row)) {
        row.dataset.hertaBrandRow = '';
        set(row, 'height', '136px');
        set(row, 'min-height', '136px');
        set(row, 'flex-shrink', '0');
      }
      set(nativeButton, 'min-height', real ? '128px' : null);
      set(nativeButton, 'padding', real ? '0' : null);
      set(nativeButton, 'height', real ? '128px' : null);
      set(nativeButton, 'justify-content', real ? 'center' : null);
      set(nativeButton, 'width', real ? '100%' : null);
    }
    const contentTop = real ? shellContentTop(doc, sidebar) : 0;
    // Place the sheet beside the sidebar, away from the portrait on the right.
    set(panel, 'position', real ? 'fixed' : null);
    set(panel, 'left', real ? Math.max(12,Math.min((sidebar?.getBoundingClientRect().right || 0)+18,doc.defaultView.innerWidth-278))+'px' : null);
    set(panel, 'right', real ? 'auto' : null);
    set(panel, 'top', real ? (contentTop+52)+'px' : null);
    set(controls, 'top', real ? (contentTop + 12) + 'px' : null);
    set(controls, 'right', real ? '20px' : null);
    set(ornamentalFrame, 'top', real ? (contentTop + 6) + 'px' : null);
    toolDock?.position();
  }


  body.append(stage, ornamentalFrame, controls);
  const mirror = createMirror(doc, { base, onInfo(info) { source.textContent = '观赏 / 专注 · 藏镜按需打开\n图库：'+info.directory+'\n增删后重新打开藏镜刷新'; }, onOpen() { panel.hidden = true; open.setAttribute('aria-expanded','false'); } });

  controls.insertBefore(mirror.trigger, open);
  toolDock=createToolDock(doc,controls,panel,{onCollapse(){panel.hidden=true;open.setAttribute('aria-expanded','false');mirror.close()}});
  const idleMotion=createIdleMotion(doc,stage,()=>{motionMode.title='动态素材暂时不可用，显示静态画像';},status=>{const hints={unavailable:'动态素材暂时不可用，显示静态画像','unavailable-scene':'当前场景的动态素材暂时不可用','paused-reduced':'系统减少动画已暂停动态画像'};motionMode.title=hints[status]||'待机时自然互动，也可连续轻触背景';});

  const heroSymbols = new Map();
  const decoratedSurfaces = new Map();
  const sidebarHosts = new Set();
  const headerHosts = new Set();
  let stopped = false;
  let artCleanup, themeCleanup, themeTransition, themeRequest = 0, artCleanupKey = '';
  const decodedArtwork = new Map();
  function warmArtwork(file) {
    if (decodedArtwork.has(file)) return decodedArtwork.get(file);
    const image = new doc.defaultView.Image(); image.src = base + file;
    const ready = image.decode ? image.decode().catch(() => {}) : Promise.resolve();
    decodedArtwork.set(file, ready);
    while (decodedArtwork.size > 2) decodedArtwork.delete(decodedArtwork.keys().next().value);
    return ready;
  }
  let queued = false;
  let frame = 0;
  let observedSidebar = null;
  const layoutObserver = doc.defaultView.ResizeObserver ? new doc.defaultView.ResizeObserver(schedule) : null;

  function syncAppearance(current = body.dataset.hertaScene || (settings.scene === 'auto' ? chooseScene(doc) : settings.scene)) {
    if (stopped) return;
    const nativeDark = body.hasAttribute('data-ds-dark-theme');
    const tone = chooseTone(current, nativeDark);
    body.dataset.hertaTone = tone;
    syncShellPalette(tone);
    body.dataset.hertaScene = current;
    for (const [id, file] of ART) {
      const layer = layers.get(id);
      // Decode only the active scene: three AI enlarged backgrounds are large.
      if (!id.startsWith(current + '-')) {
        continue;
      }
      const selectedFile = artworkFile(file, settings.art);
      void warmArtwork(selectedFile);
      if (layer.dataset.hertaFile !== selectedFile) {
        layer.style.backgroundImage = `url("${base}${selectedFile}")`;
        layer.dataset.hertaFile = selectedFile;
      }
    }
    const cleanupKey = current + '-' + settings.art;
    if (cleanupKey !== artCleanupKey) {
      artCleanupKey = cleanupKey;
      clearTimeout(artCleanup);
      artCleanup = setTimeout(() => { for (const [id, layer] of layers) if (!id.startsWith(body.dataset.hertaScene + '-')) { layer.style.backgroundImage = 'none'; delete layer.dataset.hertaFile; } }, 1500);
    }
    stage.style.setProperty('--herta-art-opacity', settings.opacity);
    motionMode.value=settings.motion;
    idleMotion.update({enabled:settings.motion==='dynamic',ambient:true,suspended:body.hasAttribute('data-herta-transition'),manifestUrl:base+'motion-manifest.json',scene:current,opacity:settings.opacity});
    themeButton.dataset.tone = tone;
    themeButton.setAttribute('aria-pressed',String(nativeDark));
    themeButton.title = nativeDark ? '切换到浅色外观' : '切换到深色外观';
    themeButton.setAttribute('aria-label', themeButton.title);
    theme.value = settings.theme;
    scene.value = settings.scene;
    body.dataset.hertaView = settings.displayMode;
    displayMode.value = settings.displayMode;
    viewButton.title = settings.displayMode === 'focus' ? '专注模式 · 点击切换到观赏模式' : '观赏模式 · 点击切换到专注模式';
    viewButton.setAttribute('aria-label', viewButton.title);
    viewButton.setAttribute('aria-pressed', String(settings.displayMode === 'focus'));
    const iconFile = settings.displayMode === 'focus' ? 'herta-focus.svg' : 'herta-view.svg';
    if (viewIcon.dataset.file !== iconFile) { viewIcon.src = base + iconFile; viewIcon.dataset.file = iconFile; }
    artDetail.value = settings.art;
    artDetail.querySelector('option[value=crisp]').textContent=current==='home'?'清晰 · 细节修复':'清晰 · 此场景同柔和';
    mirror.setEnabled(true);
  }

  function sync() {
    if (stopped) return;
    const previewShell = isPreviewShell(doc);
    if (previewShell) body.setAttribute('data-herta-preview', ''); else body.removeAttribute('data-herta-preview');
    body.dataset.hertaShell = previewShell ? 'preview' : 'real';
    const current = settings.scene === 'auto' ? chooseScene(doc) : settings.scene;
    const sidebar = sidebarLayoutHost(doc);
    if (sidebar !== observedSidebar) {
      layoutObserver?.disconnect();
      observedSidebar = sidebar;
      if (sidebar) layoutObserver?.observe(sidebar);
    }
    if (sidebar && !previewShell) {
      sidebar.dataset.hertaSidebarHost = '';
      sidebarHosts.add(sidebar);
    }
    ornamentalFrame.style.left = Math.max(12, (sidebar?.getBoundingClientRect().right || 0) + 12) + 'px';
    const surfaceElements = doc.querySelectorAll(HOST_SELECTORS.surfaces);
    for (const surface of surfaceElements) {
      if (!shouldDecorateSurface(surface,doc.defaultView)) continue;
      if (decoratedSurfaces.has(surface)) continue;
      const trim = doc.createElement('div');
      trim.className = 'herta-surface-trim';
      trim.setAttribute('aria-hidden', 'true');
      surface.dataset.hertaSurface = '';
      if (doc.defaultView.getComputedStyle(surface).position === 'static') surface.dataset.hertaStatic = '';
      surface.append(trim);
      decoratedSurfaces.set(surface, trim);
    }
    for (const [surface, trim] of decoratedSurfaces) {
      if (!surface.isConnected || !shouldDecorateSurface(surface,doc.defaultView)) { trim.remove(); delete surface.dataset.hertaSurface;delete surface.dataset.hertaStatic;decoratedSurfaces.delete(surface); }
    }
    const frameEl = shellFrame(doc,sidebar);
    if (frameEl) frameEl.dataset.hertaFrame = '';
    const nativeMark = sidebar?.querySelector('[data-slot="sidebar.brand.mark"]');
    const nativeButton = nativeMark?.closest('button');
    for (const [element, changes] of nativeLayoutChanges) {
      if (!element.hasAttribute('data-herta-brand-row') || (nativeButton && element.contains(nativeButton))) continue;
      for (const [property, change] of changes) {
        if (element.style.getPropertyValue(property) !== change.after) continue;
        if (change.before) element.style.setProperty(property, change.before, change.priority); else element.style.removeProperty(property);
      }
      delete element.dataset.hertaBrandRow;
      nativeLayoutChanges.delete(element);
    }
    if (nativeButton) {
      nativeButton.dataset.hertaBrandButton = '';
      const identity = nativeMark.parentElement?.parentElement;
      if (identity && identity !== nativeButton) identity.dataset.hertaNativeBrand = '';
      if (!nativeButton.contains(brand)) nativeButton.append(brand);
    } else if (previewShell && sidebar && !sidebar.contains(brand)) {
      sidebar.prepend(brand);
    } else if (!previewShell && !nativeButton && brand.isConnected) {
      // A collapsed Windows sidebar has no brand row. Do not insert one into
      // its titlebar controls or turn a rail into a full-width column.
      brand.remove();
    }
    applyShellLayout(nativeButton, sidebar);
    // Replace the standalone DeepSeek hero mark; keep the model selector icons intact.
    for (const svg of doc.querySelectorAll('svg[viewBox="0 0 23.16 17.04"]')) {
      if (sidebar?.contains(svg) || svg.closest('button,[role="button"]') || heroSymbols.has(svg)) continue;
      const replacement = image('herta-symbol.svg', 'Herta');
      replacement.className = 'herta-hero-symbol';
      const size = Math.max(28, Math.min(64, svg.getBoundingClientRect().width || Number(svg.getAttribute('width')) || 40));
      replacement.style.width = size + 'px';
      replacement.style.height = size + 'px';
      svg.dataset.hertaHeroNative = '';
      svg.after(replacement);
      heroSymbols.set(svg, replacement);
    }
    for (const [svg, replacement] of [...heroSymbols]) {
      if (!svg.isConnected) { replacement.remove(); heroSymbols.delete(svg); }
    }
    // Find the real header box containing the visible conversation tabs.
    for(const tabs of doc.querySelectorAll('[role="tablist"]')) {
      if(sidebar?.contains(tabs))continue;
      let el=tabs.parentElement,header;
      for(let depth=0;el&&depth<6;depth++,el=el.parentElement){const r=el.getBoundingClientRect();if(r.top>=24&&r.top<180&&r.width>220&&r.height>=24&&r.height<=180)header=el;}
      if(header){header.dataset.hertaHeader='';headerHosts.add(header);}
    }
    for(const header of headerHosts)if(!header.isConnected)headerHosts.delete(header);
    syncAppearance(current);
  }

  function save() {
    try { storage.setItem(KEY, JSON.stringify(settings)); } catch {}
    syncAppearance(settings.scene==='auto'?chooseScene(doc):settings.scene);
  }
  function setTheme(mode) {
    const request = ++themeRequest;
    const dark = mode === 'auto' ? nativeThemeDark : mode === 'dark';
    requestedDark=dark;
    themeTransition?.skipTransition(); clearTimeout(themeCleanup);
    const update = () => {
      if (stopped || request !== themeRequest) return;
      settings.theme = mode;
      writeTheme(dark);
      try { storage.setItem(KEY, JSON.stringify(settings)); } catch {}
      syncAppearance();
    };
    const finish = () => {
      if (stopped || request !== themeRequest) return;
      clearTimeout(themeCleanup); themeTransition = null;
      delete body.dataset.hertaTransition;
      body.dataset.hertaPalette = 'settled';
      themeButton.removeAttribute('aria-busy');
      syncAppearance();
    };
    const reduced = doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduced || doc.hidden) { update(); finish(); return; }
    body.dataset.hertaTransition = ''; body.dataset.hertaPalette = 'changing';
    themeButton.setAttribute('aria-busy', 'true');
    // Pause authored motion while the compositor blends appearance snapshots.
    syncAppearance();
    try {
      themeTransition = doc.startViewTransition(update);
      // skipTransition() deliberately rejects ready; finished still commits the
      // final palette. Consume the snapshot cancellation, not application errors.
      themeTransition.ready?.catch(() => {});
      themeTransition.finished.then(finish, finish);
      // An obscured renderer may not dispatch animation completion promptly.
      themeCleanup = setTimeout(finish, THEME_TRANSITION_MS + 500);
    } catch { update(); finish(); }
  }
  function schedule() {
    if (queued || stopped) return;
    queued = true;
    frame = doc.defaultView.requestAnimationFrame(() => { queued = false; sync(); });
  }

  const observer = new doc.defaultView.MutationObserver(records=>{
    if(records.some(record=>record.target===body&&record.attributeName==='data-ds-dark-theme')){
      const actual=body.hasAttribute('data-ds-dark-theme');
      if(actual!==lastThemeWritten){nativeThemeDark=actual;requestedDark=actual;lastThemeWritten=null;}
      syncAppearance();
    }
    if(records.some(record=>shouldSyncMutation(record,[stage,controls,mirror.root])))schedule();
  });
  observer.observe(body, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ['data-phase', 'role', 'aria-modal', 'hidden', 'data-slot', 'data-ds-dark-theme'],
  });

  open.onclick = () => {
    mirror.close();void mirror.refreshInfo();
    panel.hidden = !panel.hidden;
    open.setAttribute('aria-expanded', String(!panel.hidden));
  };
  close.onclick = () => { panel.hidden = true; open.setAttribute('aria-expanded', 'false'); };
  // Dismiss the settings panel on any pointer outside it (borrowed from the
  // Claude/ChatGPT desktop skin's dismissControls method).
  function onPointerDown(event) {
    if (panel.hidden) return;
    if (event.composedPath().includes(controls)) return;
    panel.hidden = true; open.setAttribute('aria-expanded', 'false');
  }
  doc.addEventListener('pointerdown', onPointerDown, true);
  function onKeyDown(event) {
    if (event.key === 'Escape' && !panel.hidden) { close.onclick(); open.focus(); }
  }
  doc.addEventListener('keydown', onKeyDown);
  themeButton.onclick = () => setTheme(requestedDark ? 'light' : 'dark');
  theme.onchange = () => setTheme(theme.value);
  viewButton.onclick = () => { settings.displayMode = settings.displayMode === 'focus' ? 'admire' : 'focus'; save(); };
  displayMode.onchange = () => { settings.displayMode = displayMode.value; save(); };
  motionMode.onchange=()=>{settings.motion=motionMode.value;save();};
  opacity.oninput = () => { settings.opacity = Number(opacity.value); save(); };
  scene.onchange = () => { settings.scene = scene.value; save(); };
  artDetail.onchange = () => { settings.art = artDetail.value; save(); };

  doc.addEventListener('visibilitychange', sync);
  doc.defaultView.addEventListener('resize', schedule);
  theme.value = settings.theme;
  scene.value = settings.scene;
  sync();

  return () => {
    stopped = true;
    delete body.dataset.hertaPalette;
    decodedArtwork.clear();
    for (const [name,old] of shellBefore) if (body.style.getPropertyValue(name) === shellAfter.get(name)) { if (old.value) body.style.setProperty(name,old.value,old.priority); else body.style.removeProperty(name); }
    ++themeRequest; themeTransition?.skipTransition(); clearTimeout(themeCleanup); clearTimeout(artCleanup); delete body.dataset.hertaTransition;
    observer.disconnect();
    if(lastThemeWritten!==null&&body.hasAttribute('data-ds-dark-theme')===lastThemeWritten)body.toggleAttribute('data-ds-dark-theme',nativeThemeDark);
    layoutObserver?.disconnect();
    doc.defaultView.cancelAnimationFrame(frame);
    doc.removeEventListener('visibilitychange', sync);
    doc.removeEventListener('keydown', onKeyDown);
    doc.removeEventListener('pointerdown', onPointerDown, true);
    doc.defaultView.removeEventListener('resize', schedule);
    idleMotion.dispose();
    toolDock.destroy();
    stage.remove();
    controls.remove();
    ornamentalFrame.remove();
    mirror.dispose();
    for (const host of sidebarHosts) delete host.dataset.hertaSidebarHost;
    sidebarHosts.clear();
    for(const header of headerHosts)delete header.dataset.hertaHeader;headerHosts.clear();
    for (const [element,changes] of nativeLayoutChanges) for (const [property,change] of changes) {
      if (element.style.getPropertyValue(property)!==change.after || element.style.getPropertyPriority(property)!==change.afterPriority) continue;
      if (change.before) element.style.setProperty(property,change.before,change.priority); else element.style.removeProperty(property);
    }
    nativeLayoutChanges.clear();
    doc.querySelectorAll("[data-herta-brand-row]").forEach(el => delete el.dataset.hertaBrandRow);
    brand.remove();
    style.remove();
    for (const [svg, replacement] of heroSymbols) {
      delete svg.dataset.hertaHeroNative;
      replacement.remove();
    }
    heroSymbols.clear();
    for (const [surface, trim] of decoratedSurfaces) {
      trim.remove();
      delete surface.dataset.hertaSurface;
      delete surface.dataset.hertaStatic;
    }
    decoratedSurfaces.clear();
    doc.querySelectorAll('[data-herta-native-brand],[data-herta-brand-button],[data-herta-frame]').forEach((el) => {
      delete el.dataset.hertaNativeBrand;
      delete el.dataset.hertaBrandButton;
      delete el.dataset.hertaFrame;
    });
    delete body.dataset.hertaAtelier;
    delete body.dataset.hertaShell;
    delete body.dataset.hertaScene;
    delete body.dataset.hertaTone;
    delete body.dataset.hertaView;
    delete body.dataset.hertaPreview;
    delete body.dataset.hertaReading;
  };
}

export function apply(ctx) {
  ctx.effect(() => mount(), 'herta-atelier: presentation');
}
