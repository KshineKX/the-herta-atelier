import { createMirror } from './mirror.js';
import { createIdleMotion } from './motion.js';
import { createToolDock } from './dock.js';
const KEY = 'herta-atelier:v1';
export const THEME_TRANSITION_MS = 700;
const DEFAULTS = { opacity: 0.9, scene: 'auto', theme: 'auto', art: 'ultra', mirror: true, displayMode: 'admire', motion: 'static' };
const COPY_MAP = new Map([
  ['探索未至之境', '群星静默如谜'],
  ['给 DeepSeek 发消息', '向大黑塔提问…'],
  ['有什么可以帮忙的？', '向大黑塔提问…'],
  ['How can I help you today?', '向大黑塔提问…'],
]);
const SCENES = ['auto', 'home', 'chat', 'settings'];
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

function patchCopy(doc, changes, placeholders, slogans) {
  const walker = doc.createTreeWalker(doc.body, 4); // NodeFilter.SHOW_TEXT
  const todo = [];
  let node;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue;
    if (!text || !text.trim()) continue;
    if (node.parentElement?.closest('script,style,pre,code,textarea,[contenteditable],[data-conversation-scroll],#herta-atelier-controls')) continue;
    for (const [from] of COPY_MAP) if (text.trim() === from) { todo.push([node, from]); break; }
  }
  for (const [node, from] of todo) {
    if (from === '探索未至之境') {
      const parent = node.parentNode;
      if (!parent) continue;
      const slogan = doc.createElement('span');
      slogan.className = 'herta-slogan';
      slogan.textContent = COPY_MAP.get(from);
      parent.replaceChild(slogan, node);
      slogans.set(slogan, node);
      continue;
    }
    const before = node.nodeValue;
    const after = before.replace(from, COPY_MAP.get(from));
    changes.set(node, { before, after });
    node.nodeValue = after;
  }
  for (const input of doc.querySelectorAll('textarea[placeholder],input[placeholder]')) {
    const before = input.getAttribute('placeholder');
    if (!COPY_MAP.has(before)) continue;
    const after = COPY_MAP.get(before);
    placeholders.set(input, { before, after });
    input.setAttribute('placeholder', after);
  }
}

const ART = [
  ['home-dark', 'art-home-dark-soft.webp'],
  ['home-light', 'art-home-light-soft.webp'],
  ['chat-dark', 'art-campus-soft.webp'],
  ['chat-light', 'art-campus-soft.webp'],
  ['settings-dark', 'art-room-soft.webp'],
  ['settings-light', 'art-room-soft.webp'],
];
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
  const copyChanges = new Map();
  const placeholderChanges = new Map();
  const sloganChanges = new Map();
  const style = doc.createElement('style');
  style.dataset.hertaAtelier = '';
  style.textContent = CSS.replaceAll('__HERTA_ASSETS__', new URL(base, doc.baseURI).href);
  doc.head.append(style);

  // One clock drives every color, gradient and portrait blend. Individual
  // component transitions would restart on each update and fall out of sync.
  const palettes = {"herta-paper":["#171021","#f6f1f7"],"herta-ink":["#f3ecf9","#2e2140"],"herta-muted":["#b9a6d2","#6f5e82"],"herta-surface":["rgba(30,21,44,.82)","rgba(255,252,255,.86)"],"herta-line":["rgba(217,185,110,.22)","rgba(107,63,160,.18)"],"herta-accent":["#d9b96e","#6b3fa0"],"herta-violet":["#b58ce8","#8a6a2f"],"herta-code":["#120d1b","#ece2f2"],"herta-read":["rgba(20,14,30,.86)","rgba(250,246,252,.9)"],"herta-gold":["#d9b96e","#957643"],"herta-shell-color":["#21182d","#f3eef8"],"herta-shell-ink":["#f3ecf9","#39294b"],"dsw-alias-button-primary-fill":["#d9b96e","#6b3fa0"],"dsw-alias-button-primary-invert":["#1b1424","#ffffff"],"dsw-alias-button-primary-hover":["#e6c983","#7d4dbb"],"dsw-alias-button-elevated-fill":["#a98a4a","#6b3fa0"],"dsw-alias-button-primary-dimmed":["#a98a4a","#6b3fa0"],"dsw-alias-label-tertiary":["#9c89b8","#705f86"],"dsw-alias-label-caption":["#9c89b8","#705f86"],"dsw-alias-markdown-code-block":["rgba(20,14,30,.86)","rgba(255,253,255,.92)"],"dsw-alias-markdown-code-block-banner":["#120d1b","#ece2f2"],"dsw-alias-interactive-bg-hover":["rgba(217,185,110,.14)","rgba(107,63,160,.10)"]};
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
  const nativeThemeDark = body.hasAttribute('data-ds-dark-theme');
  if (settings.theme === 'light' || settings.theme === 'dark') body.toggleAttribute('data-ds-dark-theme', settings.theme === 'dark');
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
  for (const [value, text] of [['auto', '随页面切换'], ['home', '星穹 · 天才书房'], ['chat', '课间 · 星间漫游'], ['settings', '私室 · 天才的房间']]) {
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
  version.textContent = 'v0.4.0-beta.11 · Kshine';
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
    if (decodedArtwork.has(file)) return decodedArtwork.get(file).ready;
    const image = new doc.defaultView.Image(); image.src = base + file;
    const ready = image.decode ? image.decode().catch(() => {}) : Promise.resolve();
    decodedArtwork.set(file, { image, ready });
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
    const activeArt=layers.get(current+'-'+tone);
    idleMotion.update({enabled:settings.motion==='dynamic',ambient:true,suspended:body.hasAttribute('data-herta-transition'),manifestUrl:base+'motion-manifest.json',scene:current,opacity:settings.opacity});
    themeButton.textContent = nativeDark ? '☀' : '☾';
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
    const surfaceElements = doc.querySelectorAll('[data-slot="composer"],[data-slot="chat-input"],form:has(textarea),.composer,[data-conversation-scroll] pre,[data-slot="settings"]');
    for (const surface of surfaceElements) {
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
      if (!surface.isConnected) { trim.remove(); decoratedSurfaces.delete(surface); }
    }
    const frameEl = sidebar?.closest('[class*="_frame"]');
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
    patchCopy(doc, copyChanges, placeholderChanges, sloganChanges);
  }

  function save() {
    try { storage.setItem(KEY, JSON.stringify(settings)); } catch {}
    sync();
  }
  function setTheme(mode) {
    const request = ++themeRequest;
    const dark = mode === 'auto' ? nativeThemeDark : mode === 'dark';
    themeTransition?.skipTransition(); clearTimeout(themeCleanup);
    const update = () => {
      settings.theme = mode;
      body.toggleAttribute('data-ds-dark-theme', dark);
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

  const observer = new doc.defaultView.MutationObserver((records) => {
    if (records.length && records.every(r => r.target === body && r.attributeName === 'data-ds-dark-theme')) { syncAppearance(); return; }
    if (records.some((r) => !stage.contains(r.target) && !controls.contains(r.target) && !mirror.root.contains(r.target)
      && !(r.target instanceof doc.defaultView.Element && r.target.closest('.xterm')))) schedule();
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
  themeButton.onclick = () => setTheme(body.hasAttribute('data-ds-dark-theme') ? 'light' : 'dark');
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
    for (const [node, change] of copyChanges) if (node.nodeValue === change.after) node.nodeValue = change.before;
    for (const [slogan, original] of sloganChanges) if (slogan.parentNode) slogan.parentNode.replaceChild(original, slogan);
    sloganChanges.clear();
    for (const [input, change] of placeholderChanges) if (input.getAttribute('placeholder') === change.after) input.setAttribute('placeholder', change.before);
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
    delete body.dataset.hertaReading;
  };
}

export function apply(ctx) {
  ctx.effect(() => mount(), 'herta-atelier: presentation');
}

const CSS = `
@media(max-width:850px){#herta-atelier-stage .herta-motion-video{object-position:90% 50%!important}}
@font-face{font-family:'Herta Serif';src:url("__HERTA_ASSETS__herta-serif-title.ttf") format('truetype');font-weight:800;font-style:normal;font-display:swap}
body[data-herta-atelier]{--herta-paper:#171021;--herta-ink:#f3ecf9;--herta-muted:#b9a6d2;--herta-surface:rgba(30,21,44,.82);--herta-line:rgba(217,185,110,.22);--herta-accent:#d9b96e;--herta-violet:#b58ce8;--herta-code:#120d1b;--herta-read:rgba(20,14,30,.86);
--herta-gold:#d9b96e;--herta-corner:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80' fill='none' stroke='%23bca16b' stroke-width='.8'%3E%3Cpath d='M7 70V7h63M13 51V13h38M7 43C43 43 43 7 43 7M13 32C28 32 32 28 32 13M7 60c17-7 29-20 39-36M60 7c-7 17-20 29-36 39'/%3E%3Cpath d='m49 27 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z'/%3E%3Ccircle cx='13' cy='13' r='2'/%3E%3C/svg%3E");
isolation:isolate;background:var(--herta-paper);color:var(--herta-ink);
--dsw-alias-bg-base:transparent!important;--dsw-alias-bg-layer-1:transparent!important;--dsw-alias-bg-layer-2:transparent!important;--dsw-alias-bg-layer-3:transparent!important;--dsw-alias-bg-overlay:var(--herta-paper)!important;--dsw-alias-bg-module-platform:var(--herta-surface)!important;
--dsw-alias-label-primary:var(--herta-ink)!important;--dsw-alias-label-secondary:var(--herta-muted)!important;--dsw-alias-label-tertiary:#9c89b8!important;--dsw-alias-label-caption:#9c89b8!important;--dsw-alias-label-primary-dimmed:var(--herta-ink)!important;--dsw-alias-label-primary-bluish:var(--herta-ink)!important;
--dsw-alias-brand-primary:var(--herta-accent)!important;--dsw-alias-brand-text:var(--herta-accent)!important;
--dsw-specific-sidebar-fill:var(--herta-surface)!important;--dsw-specific-input-major:var(--herta-surface)!important;--dsw-specific-bubble:var(--herta-surface)!important;--dsw-specific-menu:var(--herta-paper)!important;--dsw-specific-selector:var(--herta-paper)!important;
--dsw-alias-border-l1:var(--herta-line)!important;--dsw-alias-button-primary-fill:var(--herta-accent)!important;--dsw-alias-button-primary-invert:#1b1424!important;--dsw-alias-button-primary-hover:#e6c983!important;--dsw-alias-button-elevated-fill:#a98a4a!important;--dsw-alias-button-primary-dimmed:#a98a4a!important;--dsw-alias-interactive-bg-hover:rgba(217,185,110,.14)!important;
--dsw-alias-markdown-inline-code:var(--herta-code)!important;--dsw-alias-markdown-code-block:var(--herta-read)!important;--dsw-alias-markdown-code-block-banner:var(--herta-code)!important;}

body[data-herta-atelier][data-herta-tone=light]{--herta-paper:#f6f1f7;--herta-ink:#2e2140;--herta-muted:#6f5e82;--herta-surface:rgba(255,252,255,.86);--herta-line:rgba(107,63,160,.18);--herta-accent:#6b3fa0;--herta-violet:#8a6a2f;--herta-code:#ece2f2;--herta-read:rgba(250,246,252,.9);}
body[data-herta-atelier][data-herta-tone=light]{--herta-gold:#957643}
/* 0.4.x compat: the host composer seat now paints its scrim with
   --dsw-alias-bg-base, which this skin forces to transparent. Restore the
   docked-composer scrim locally and hook the current composer DOM. */
body[data-herta-atelier] [data-composer-seat]{--dsw-alias-bg-base:var(--herta-paper)!important;z-index:7}
body[data-herta-atelier] [data-conversation-region=composer]{--dsw-alias-bg-base:var(--herta-paper)!important}
body[data-herta-atelier] [data-composer-card]{border-color:var(--herta-gold)!important;box-shadow:inset 0 0 0 4px rgba(217,185,110,.03),0 12px 40px rgba(10,5,20,.14)!important}
body[data-herta-atelier][data-herta-tone=light]{--dsw-alias-button-primary-fill:#6b3fa0!important;--dsw-alias-button-primary-invert:#fff!important;--dsw-alias-button-primary-hover:#7d4dbb!important;--dsw-alias-button-elevated-fill:#6b3fa0!important;--dsw-alias-label-tertiary:#705f86!important;--dsw-alias-label-caption:#705f86!important;--dsw-alias-markdown-code-block:rgba(255,253,255,.92)!important;--dsw-alias-markdown-code-block-banner:#ece2f2!important;--dsw-alias-interactive-bg-hover:rgba(107,63,160,.10)!important;}

#herta-atelier-stage{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:var(--herta-paper)}
#herta-atelier-stage:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,11,26,.7),rgba(17,11,26,.2) 46%,transparent 74%),linear-gradient(0deg,rgba(17,11,26,.3),transparent 35%)}
body[data-herta-tone=light] #herta-atelier-stage:after{background:linear-gradient(90deg,rgba(246,241,247,.8),rgba(246,241,247,.25) 46%,transparent 74%)}
.herta-art{position:absolute;inset:0;background-size:cover;background-position:left center;opacity:0;transition:opacity .6s ease;}
.herta-art-chat-dark,.herta-art-chat-light,.herta-art-settings-dark,.herta-art-settings-light{background-position:center;}
body[data-herta-scene=home][data-herta-tone=dark] .herta-art-home-dark,
body[data-herta-scene=home][data-herta-tone=light] .herta-art-home-light,
body[data-herta-scene=chat][data-herta-tone=dark] .herta-art-chat-dark,
body[data-herta-scene=chat][data-herta-tone=light] .herta-art-chat-light,
body[data-herta-scene=settings][data-herta-tone=dark] .herta-art-settings-dark,
body[data-herta-scene=settings][data-herta-tone=light] .herta-art-settings-light{opacity:var(--herta-art-opacity)}

body[data-herta-atelier] [data-slot=sidebar]{background:var(--herta-surface)!important;border-right:1px solid var(--herta-line);backdrop-filter:blur(14px)}
body[data-herta-atelier] [data-slot=sidebar]{background-image:radial-gradient(ellipse at 50% 0,rgba(217,185,110,.07),transparent 46%),repeating-linear-gradient(135deg,transparent 0 23px,rgba(185,150,215,.025) 23px 24px,transparent 24px 47px)!important;box-shadow:inset -1px 0 rgba(217,185,110,.06)}
body[data-herta-atelier] [data-slot=sidebar]:before,body[data-herta-atelier] [data-slot=sidebar]:after{content:'';position:absolute;width:74px;height:74px;background:var(--herta-corner) center/contain no-repeat;opacity:.48;pointer-events:none}
body[data-herta-atelier] [data-slot=sidebar]:before{left:8px;top:8px}
body[data-herta-atelier] [data-slot=sidebar]:after{right:8px;bottom:8px;transform:rotate(180deg)}
body[data-herta-atelier] [data-slot=sidebar] :where(button,a)[aria-current=page]{border-inline-start:2px solid var(--herta-gold);background:rgba(185,150,215,.1)}
body[data-herta-atelier] [data-slot=sidebar] :where(h2,h3){color:var(--herta-muted);letter-spacing:.08em}
body[data-herta-atelier] [data-herta-frame]{background:transparent!important;}
body[data-herta-atelier] :where(textarea,[contenteditable=true]){color:var(--herta-ink)!important;caret-color:var(--herta-accent)}
body[data-herta-atelier] :where([role=dialog],[role=menu],[role=listbox]){background:var(--herta-paper)!important;color:var(--herta-ink)!important;border-color:var(--herta-line)!important;}
body[data-herta-atelier] :where([class*="_header"],[class*="_Header"]){background-color:var(--herta-surface)!important;color:var(--herta-ink)!important;}
body[data-herta-atelier] :where(pre){background:var(--herta-read);border:1px solid var(--herta-line);border-radius:12px}
body[data-herta-atelier] [data-conversation-scroll] :where(pre,blockquote){box-shadow:inset 0 1px rgba(217,185,110,.28)}
body[data-herta-atelier] [data-conversation-scroll] blockquote{margin-inline:0;padding:12px 20px;border-inline-start:2px solid var(--herta-gold);background:var(--herta-surface);border-radius:0 12px 12px 0;color:var(--herta-muted)}
body[data-herta-atelier] [data-conversation-scroll] table{border-collapse:collapse;background:var(--herta-read)}
body[data-herta-atelier] [data-conversation-scroll] :where(th,td){padding:10px 15px;border:1px solid var(--herta-line)}
body[data-herta-atelier] [data-conversation-scroll] th{color:var(--herta-gold);font-weight:500}
body[data-herta-atelier] [data-conversation-scroll] hr{border:0;height:1px;background:linear-gradient(90deg,transparent,var(--herta-gold),transparent);opacity:.45}
body[data-herta-atelier] :where([data-slot=composer],[data-slot=chat-input],.composer){border-color:var(--herta-gold)!important;box-shadow:inset 0 0 0 4px rgba(217,185,110,.025),0 12px 40px rgba(10,5,20,.14)}
body[data-herta-atelier] :where(button,a,input,select,textarea,[contenteditable=true]):focus-visible{outline:2px solid var(--herta-gold);outline-offset:3px}
body[data-herta-atelier] ::-webkit-scrollbar{width:7px;height:7px}
body[data-herta-atelier] ::-webkit-scrollbar-thumb{background:var(--herta-line);border:1px solid var(--herta-gold);border-radius:8px}
body[data-herta-atelier] :where(code){color:var(--herta-ink)!important;background:var(--herta-code)!important;}
body[data-herta-atelier] pre code{background:transparent!important;}
body[data-herta-atelier][data-herta-tone=dark] [data-conversation-scroll] :where(p,li,h1,h2,h3){text-shadow:0 1px 3px rgba(6,3,12,.85)}
body[data-herta-atelier][data-herta-tone=light] [data-conversation-scroll] :where(p,li,h1,h2,h3){text-shadow:0 1px 2px rgba(255,252,255,.9)}
body[data-herta-atelier] :where(a,[role=link]){color:var(--herta-accent)}

#herta-atelier-controls{position:fixed;top:58px;right:18px;z-index:90;display:flex;gap:8px;align-items:flex-start;font:13px 'Microsoft YaHei UI',sans-serif;color:var(--herta-ink)}
#herta-atelier-controls>button{box-sizing:border-box;width:32px;height:32px;min-width:32px;min-height:32px;flex:0 0 32px;display:grid;place-items:center;padding:0;appearance:none;border-radius:50%;border:1px solid var(--herta-line);background:var(--herta-surface);color:var(--herta-accent);cursor:pointer;font-size:22px;line-height:1;vertical-align:top}
#herta-atelier-theme{font:18px/1 'Segoe UI Symbol',sans-serif}
#herta-atelier-controls>button img{width:22px;height:22px;display:block;margin:0}
#herta-atelier-controls strong img{width:140px;height:auto;display:block}
#herta-atelier-settings .herta-panel-light{display:none}
body[data-herta-tone=light] #herta-atelier-settings .herta-panel-dark{display:none}
body[data-herta-tone=light] #herta-atelier-settings .herta-panel-light{display:block;filter:none}
#herta-atelier-controls section{position:absolute;right:0;top:42px;width:280px;padding:20px;border:1px solid var(--herta-line);border-radius:16px;background:var(--herta-paper);box-shadow:0 12px 40px #0007;}
#herta-atelier-controls section{max-width:calc(100vw - 28px);box-shadow:inset 0 0 0 5px rgba(217,185,110,.035),0 18px 60px #0006;padding:26px 22px}
#herta-atelier-controls section:before,#herta-atelier-controls section:after{content:'';position:absolute;pointer-events:none;width:50px;height:50px;background:var(--herta-corner) center/contain no-repeat;opacity:.65}
#herta-atelier-controls section:before{left:6px;top:6px}
#herta-atelier-controls section:after{right:6px;bottom:6px;transform:rotate(180deg)}
#herta-atelier-controls strong{display:block;margin-bottom:16px}
#herta-atelier-controls label{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:14px 0}
#herta-atelier-controls input[type=range]{width:120px;accent-color:var(--herta-accent)}
#herta-atelier-controls input[type=checkbox]{width:16px;height:16px;accent-color:var(--herta-accent)}
#herta-atelier-controls select{max-width:158px;background:var(--herta-surface);color:var(--herta-ink);border:1px solid var(--herta-line);padding:4px;border-radius:6px}
#herta-atelier-controls small{display:block;white-space:pre-line;line-height:1.7;color:var(--herta-muted);margin:18px 0 12px}
#herta-atelier-controls section>button{padding:6px 16px;border:1px solid var(--herta-line);border-radius:8px;background:var(--herta-surface);color:var(--herta-ink);cursor:pointer}
#herta-atelier-controls [hidden]{display:none!important;}

#herta-atelier-brand{padding:8px 0;flex-shrink:0;pointer-events:none}
#herta-atelier-brand{filter:drop-shadow(0 0 10px rgba(217,185,110,.08))}
#herta-atelier-brand img{width:135px;max-width:100%;height:auto;display:block}
#herta-atelier-brand .herta-wm-light{display:none}
body[data-herta-tone=light] #herta-atelier-brand .herta-wm-dark{display:none}
body[data-herta-tone=light] #herta-atelier-brand .herta-wm-light{display:block}
body[data-herta-atelier] [data-herta-native-brand]{display:none!important}
body[data-herta-atelier] [data-herta-hero-native]{display:none!important}
.herta-hero-symbol{display:inline-block;vertical-align:middle;object-fit:contain;pointer-events:none}
body[data-herta-atelier] button[data-herta-brand-button]{background:transparent!important;border:0!important;padding:10px 16px;justify-content:flex-start;}

body[data-herta-atelier] [data-slot=sidebar] button[aria-label="新建会话"]:not([data-herta-brand-button]){background:var(--herta-accent)!important;color:#1b1424!important;}
body[data-herta-atelier] [data-slot=sidebar] button[aria-label="新建会话"]:not([data-herta-brand-button]){border:1px solid var(--herta-gold)!important;box-shadow:inset 0 0 0 3px rgba(255,255,255,.09);transition:filter .2s ease,box-shadow .2s ease}
body[data-herta-atelier] [data-slot=sidebar] button[aria-label="新建会话"]:hover{filter:brightness(1.08);box-shadow:0 0 20px rgba(217,185,110,.12)}
body[data-herta-atelier][data-herta-tone=light] [data-slot=sidebar] button[aria-label="新建会话"]:not([data-herta-brand-button]){color:#fff!important;}
body[data-herta-atelier] [data-slot=sidebar] button[aria-label="新建会话"]:not([data-herta-brand-button]) span{color:inherit!important;}


@media(max-width:850px){.herta-art{background-position:70% center}#herta-atelier-controls{right:10px}#herta-atelier-brand img{width:48px}body[data-herta-atelier] [data-slot=sidebar]:before,body[data-herta-atelier] [data-slot=sidebar]:after{width:40px;height:40px}#herta-atelier-stage:after{background:linear-gradient(90deg,rgba(17,11,26,.72),rgba(17,11,26,.22) 70%)}body[data-herta-tone=light] #herta-atelier-stage:after{background:linear-gradient(90deg,rgba(246,241,247,.84),rgba(246,241,247,.25) 70%)}}
@media(prefers-reduced-motion:reduce){.herta-art,body[data-herta-atelier] button{transition:none!important}}

/* Costume-inspired maximalism: silver arabesques over violet damask, with
   champagne-gold settings, clematis and faceted gemstone accents. */
body[data-herta-atelier]{
 --herta-silver:#cbbddf;--herta-gold:#d9bc82;--herta-line:rgba(211,185,139,.4);
 --herta-surface:rgba(31,20,46,.94);--herta-read:rgba(24,16,36,.94);
 --herta-scroll:url('__HERTA_ASSETS__ornament-corner.svg');
 --herta-crest:url('__HERTA_ASSETS__ornament-crest.svg');
 --herta-divider:url('__HERTA_ASSETS__ornament-divider.svg');
 --herta-damask:url('__HERTA_ASSETS__ornament-damask.svg');
 --herta-key:url('__HERTA_ASSETS__ornament-key.svg');
}
body[data-herta-atelier][data-herta-tone=light]{--herta-silver:#796288;--herta-gold:#96723c;--herta-line:rgba(132,102,63,.4);--herta-surface:rgba(250,246,255,.96);--herta-read:rgba(252,249,255,.96)}
body[data-herta-atelier] [data-herta-static]{position:relative}
body[data-herta-atelier] [data-slot=sidebar]{
 background-color:var(--herta-surface)!important;
 background-image:var(--herta-damask),linear-gradient(90deg,rgba(137,85,178,.13),transparent 22%,transparent 78%,rgba(137,85,178,.13))!important;
 background-size:76px 106px,100% 100%!important;
 box-shadow:inset 5px 0 rgba(22,12,36,.35),inset 6px 0 rgba(217,188,130,.32),inset -6px 0 rgba(22,12,36,.35),inset -7px 0 rgba(217,188,130,.4),10px 0 35px #10091d44;
 border-right:1px solid var(--herta-gold);
}
body[data-herta-atelier] [data-slot=sidebar]:before,body[data-herta-atelier] [data-slot=sidebar]:after{width:108px;height:108px;background-image:var(--herta-scroll);opacity:.9;z-index:1}
body[data-herta-atelier] [data-slot=sidebar]:before{left:7px;top:7px}
body[data-herta-atelier] [data-slot=sidebar]:after{right:7px;bottom:7px}
body[data-herta-atelier] button[data-herta-brand-button]{width:100%;justify-content:center;padding:3px 0 8px;min-height:180px;position:relative}
#herta-atelier-brand{width:100%;min-width:0;max-width:230px;position:relative;padding:92px 10px 35px;text-align:center;background:var(--herta-crest) center -12px/228px auto no-repeat}
#herta-atelier-brand img{width:157px;margin:auto;filter:drop-shadow(0 1px 6px #130a2380)}
#herta-atelier-brand:after{content:'';position:absolute;bottom:0;left:3%;right:3%;height:42px;background:var(--herta-divider) center/100% 100% no-repeat;pointer-events:none}
.herta-brand-caption{display:block;font-size:9px;letter-spacing:3px;color:var(--herta-silver);margin:8px -4px 0;white-space:nowrap}
body[data-herta-atelier] [data-slot=sidebar]>:where(small,h2,h3){text-align:center;letter-spacing:.2em;border-top:1px solid var(--herta-line);border-bottom:1px solid var(--herta-line);padding:9px 0;background:linear-gradient(90deg,transparent,rgba(179,131,224,.12),transparent)}
body[data-herta-atelier] [data-slot=sidebar]>button:not([data-herta-brand-button]){position:relative;border:1px solid var(--herta-line);border-radius:5px 15px 5px 15px;background-image:linear-gradient(120deg,rgba(165,119,201,.1),transparent 55%);box-shadow:inset 0 0 0 3px rgba(207,184,229,.025),inset 0 1px rgba(226,204,246,.09);padding-inline:18px 28px}
body[data-herta-atelier] [data-slot=sidebar]>button:not([data-herta-brand-button]):after{content:'◆';position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:9px;color:var(--herta-gold);text-shadow:0 0 7px #b477e9;pointer-events:none}
body[data-herta-atelier] [data-slot=sidebar] button[aria-label="新建会话"]:not([data-herta-brand-button]){background:linear-gradient(120deg,#5b397e,#352145 60%,#6a467c)!important;color:#f5e7cb!important;border:1px solid #d5b67d!important;box-shadow:inset 0 0 0 3px #c7a7de13,inset 0 0 0 4px #d9bc8233,0 4px 15px #12091e55;letter-spacing:.14em;min-height:46px}
body[data-herta-atelier] [data-slot=sidebar]>button[aria-current=page]{border-color:var(--herta-gold);background:linear-gradient(90deg,rgba(166,118,203,.26),rgba(166,118,203,.07));box-shadow:inset 3px 0 var(--herta-gold),inset 0 0 0 4px rgba(217,188,130,.07)}
#herta-atelier-frame{position:fixed;inset:14px 14px 14px 266px;z-index:1;border:1px solid rgba(217,188,130,.35);outline:1px solid rgba(210,185,237,.16);outline-offset:-5px;pointer-events:none;background:var(--herta-scroll) left top/140px 140px no-repeat,var(--herta-divider) center top/350px 70px no-repeat}
#herta-atelier-frame:before,#herta-atelier-frame:after{content:'';position:absolute;width:140px;height:140px;background:var(--herta-scroll) center/contain;pointer-events:none}
#herta-atelier-frame:before{right:0;top:0;transform:rotate(90deg)}
#herta-atelier-frame:after{right:0;bottom:0;transform:rotate(180deg)}
.herta-surface-trim{position:absolute;inset:3px;pointer-events:none;z-index:1;border:1px solid rgba(217,188,130,.22);border-radius:inherit;background:var(--herta-scroll) left top/64px 64px no-repeat;opacity:.9}
.herta-surface-trim:before,.herta-surface-trim:after{content:'';position:absolute;width:64px;height:64px;background:var(--herta-scroll) center/contain no-repeat;pointer-events:none}
.herta-surface-trim:before{right:0;top:0;transform:rotate(90deg)}
.herta-surface-trim:after{right:0;bottom:0;transform:rotate(180deg)}
body[data-herta-atelier] :where([data-slot=composer],[data-slot=chat-input],.composer){border-radius:8px 24px 8px 24px;border:1px solid var(--herta-gold)!important;padding:23px 27px 17px;background-color:var(--herta-surface);background-image:var(--herta-key),linear-gradient(120deg,rgba(174,114,219,.07),transparent 48%);background-position:calc(100% - 70px) bottom,left top;background-size:27px 48px,100% 100%;background-repeat:no-repeat;box-shadow:inset 0 0 0 6px rgba(217,188,130,.025),0 14px 45px #10091d55}
body[data-herta-atelier] :where([data-slot=composer],[data-slot=chat-input],.composer) textarea{padding:8px 26px;box-sizing:border-box}
body[data-herta-atelier] :where([data-slot=composer],[data-slot=chat-input],.composer) .herta-surface-trim{background-size:52px 52px}
body[data-herta-atelier] :where([data-slot=composer],[data-slot=chat-input],.composer) .herta-surface-trim:before,body[data-herta-atelier] :where([data-slot=composer],[data-slot=chat-input],.composer) .herta-surface-trim:after{width:52px;height:52px}
body[data-herta-atelier] :where(.composer,[data-slot=composer]) button[aria-label*="发送"]{width:40px;height:40px;border-radius:50%;border:1px solid #d9bc82;background:radial-gradient(circle at 35% 25%,#a47ac7,#583175 65%,#29163c);color:#f0dba7;box-shadow:inset 0 0 0 3px #d9bc8229,0 0 12px #a174c733}
body[data-herta-atelier] [data-conversation-scroll]{border-color:var(--herta-line);border-radius:8px 25px 8px 25px;box-shadow:inset 0 0 0 4px rgba(213,185,130,.035)}
body[data-herta-atelier] [data-conversation-scroll] pre{border-radius:5px 15px 5px 15px;padding:48px 64px 34px;border-color:var(--herta-line);background:var(--herta-read);box-shadow:inset 0 0 0 5px rgba(217,188,130,.035)}
body[data-herta-atelier] [data-conversation-scroll] pre .herta-surface-trim{background:var(--herta-scroll) left top/64px 64px no-repeat,var(--herta-divider) center top/190px 42px no-repeat}
body[data-herta-atelier] [data-conversation-scroll] blockquote{border:1px solid var(--herta-line);border-inline-start:3px solid var(--herta-gold);border-radius:2px 15px 2px 15px;background-image:var(--herta-damask);background-size:70px 98px;padding:17px 24px}
body[data-herta-atelier] [data-conversation-scroll] th{background:linear-gradient(120deg,rgba(149,99,190,.2),rgba(217,188,130,.08));border-bottom-color:var(--herta-gold)}
body[data-herta-atelier] [data-phase=hero] h1{color:var(--herta-ink);text-shadow:0 2px 14px #09050f55}
.herta-slogan{display:inline-block;font-family:'Herta Serif','Noto Serif SC',Georgia,serif!important;font-weight:800!important;letter-spacing:.07em;line-height:1.08;background:linear-gradient(180deg,#fff7d9 0%,#efd69c 44%,#c79a52 100%);-webkit-background-clip:text;background-clip:text;color:transparent!important;text-shadow:none!important;filter:drop-shadow(0 2px 0 #2a163a) drop-shadow(0 0 16px #d9b96e3d)}
body[data-herta-atelier][data-herta-tone=light] .herta-slogan{background:linear-gradient(180deg,#5b3474 0%,#3a2150 52%,#1f1230 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 1px 0 #ffffffaa) drop-shadow(0 0 12px #6b3fa022)}
body[data-herta-atelier] [data-phase=hero] h1:after{content:'';display:block;height:65px;max-width:390px;background:var(--herta-divider) center/contain no-repeat;margin:0 -12px -10px;pointer-events:none}
body[data-herta-atelier][data-herta-tone=light] [data-phase=hero] h1{text-shadow:0 2px 14px #fffcffb0}
#herta-atelier-controls{top:36px;right:35px;gap:12px}
#herta-atelier-controls>button{width:36px;height:36px;flex-basis:36px;background:radial-gradient(ellipse at 35% 20%,#654679,#2b193f 75%);color:#eddbba;border-color:#d2b57d;box-shadow:inset 0 0 0 3px #d9bc8220,0 0 0 3px #2b193f88}
#herta-atelier-controls section{width:310px;border-radius:4px 24px 4px 24px;border:1px solid var(--herta-gold);padding:80px 25px 27px;background-image:var(--herta-crest),var(--herta-damask);background-position:center -20px,left top;background-size:240px auto,80px 112px;background-repeat:no-repeat,repeat;box-shadow:inset 0 0 0 5px #d9bc820a,inset 0 0 0 6px #d9bc8233,0 20px 70px #10081f99}
#herta-atelier-controls section:before,#herta-atelier-controls section:after{width:88px;height:88px;background-image:var(--herta-scroll);opacity:1}
#herta-atelier-controls strong img{margin:0 auto;width:150px}
#herta-atelier-controls strong img{width:230px;max-width:100%;height:auto}
#herta-atelier-brand img{width:185px;max-width:100%;filter:drop-shadow(0 2px 5px #130a2340)}
/* Real shell: keep the native workspace tabs and window controls clear. */
body[data-herta-atelier]:has([data-slot="sidebar.brand.name"]) button[data-herta-brand-button],
body[data-herta-shell=real] button[data-herta-brand-button]{width:100%!important;min-height:0!important;padding:6px 12px!important;justify-content:flex-start!important}
body[data-herta-atelier]:has([data-slot="sidebar.brand.name"]) #herta-atelier-brand,
body[data-herta-shell=real] #herta-atelier-brand{width:auto!important;max-width:150px!important;padding:0!important;background:none!important;text-align:left!important}
body[data-herta-atelier]:has([data-slot="sidebar.brand.name"]) #herta-atelier-brand img,
body[data-herta-shell=real] #herta-atelier-brand img{width:128px!important;margin:0!important}
body[data-herta-atelier]:has([data-slot="sidebar.brand.name"]) .herta-brand-caption,
body[data-herta-shell=real] .herta-brand-caption{display:none!important}
body[data-herta-atelier]:has([data-slot="sidebar.brand.name"]) #herta-atelier-brand:after,
body[data-herta-shell=real] #herta-atelier-brand:after{display:none!important}
body[data-herta-atelier]:has([data-slot="sidebar.brand.name"]) #herta-atelier-controls,
body[data-herta-shell=real] #herta-atelier-controls{top:76px!important;right:20px!important;z-index:130!important}
body[data-herta-atelier]:has([data-slot="sidebar.brand.name"]) #herta-atelier-frame,
body[data-herta-shell=real] #herta-atelier-frame{top:58px!important}
body[data-herta-atelier]:has([data-slot="sidebar.brand.name"]) #herta-atelier-frame:before,
body[data-herta-shell=real] #herta-atelier-frame:before{display:none!important}
body[data-herta-shell=real] [data-slot=sidebar]:before{display:none!important}
/* Real SlotOutlet anchors are display:contents: never decorate their pseudo
   elements, or position the content frame from their zero-sized rectangle. */
body[data-herta-shell=real] [data-slot=sidebar]:before,
body[data-herta-shell=real] [data-slot=sidebar]:after{display:none!important;content:none!important}
body[data-herta-shell=real] [data-herta-sidebar-host]{position:relative;background-color:var(--herta-surface)!important;background-image:var(--herta-damask)!important;background-size:76px 106px;border-right:1px solid var(--herta-line)}
body[data-herta-shell=real] [data-herta-sidebar-host]:before{content:''!important;display:block!important;position:absolute;left:4px;top:4px;width:18px;height:18px;border-left:1px solid var(--herta-gold);border-top:1px solid var(--herta-gold);opacity:.8;pointer-events:none}
body[data-herta-shell=real] [data-herta-sidebar-host]:after{content:'';position:absolute;inset:5px;border:1px solid var(--herta-line);border-radius:4px;opacity:.6;pointer-events:none}
body[data-herta-shell=real] #herta-atelier-frame{background-image:var(--herta-scroll)!important;background-position:left top!important;background-size:72px 72px!important;background-repeat:no-repeat!important}
body[data-herta-shell=real] #herta-atelier-frame:before,
body[data-herta-shell=real] #herta-atelier-frame:after{display:none!important;content:none!important}
/* Compact fallbacks are overridden inside the measured, reserved native brand row. */
button[data-herta-brand-button]{width:100%!important;min-height:0!important;padding:6px 12px!important;justify-content:flex-start!important}
#herta-atelier-brand{width:auto!important;max-width:150px!important;padding:0!important;background:none!important;text-align:left!important}
#herta-atelier-brand img{width:128px!important;margin:0!important}
.herta-brand-caption{display:none!important}
#herta-atelier-brand:after{display:none!important}
#herta-atelier-controls{top:76px!important;right:20px!important;z-index:130!important}
#herta-atelier-frame{top:58px!important}
#herta-atelier-frame:before{display:none!important}
/* Local preview harness keeps the original ornate presentation. */
body[data-herta-preview] button[data-herta-brand-button]{min-height:180px!important;padding:3px 0 8px!important;justify-content:center!important}
body[data-herta-preview] #herta-atelier-brand{width:100%!important;max-width:230px!important;padding:92px 10px 35px!important;background:var(--herta-crest) center -12px/228px auto no-repeat!important;text-align:center!important}
body[data-herta-preview] #herta-atelier-brand img{width:157px!important;margin:auto!important}
body[data-herta-preview] .herta-brand-caption{display:block!important}
body[data-herta-preview] #herta-atelier-brand:after{display:block!important}
body[data-herta-preview] #herta-atelier-controls{top:36px!important;right:35px!important}
body[data-herta-preview] #herta-atelier-frame{top:14px!important}
body[data-herta-preview] #herta-atelier-frame:before{display:block!important}
#herta-atelier-controls label{padding:10px 0;margin:0;border-bottom:1px solid var(--herta-line)}
#herta-atelier-controls section>button{display:block;margin:20px auto 0;min-width:115px;background:linear-gradient(120deg,#644280,#382046);color:#f5e7ce;border-color:#c5a66c;border-radius:3px 12px 3px 12px;box-shadow:inset 0 0 0 3px #c5a66c19}
#herta-atelier-controls section{max-height:calc(100dvh - 110px);overflow-y:auto;box-sizing:border-box}
.herta-build{display:block;text-align:center;font-size:9px;letter-spacing:.12em;color:var(--herta-muted);margin-top:10px;opacity:.7}
/* The gallery lives in the shared toolbar; its portrait is shown on demand. */
#herta-atelier-mirror{position:relative;z-index:95;color:var(--herta-ink);font:13px 'Microsoft YaHei UI',sans-serif}
#herta-atelier-mirror [hidden]{display:none!important}
#herta-atelier-mirror button{cursor:pointer;color:var(--herta-ink);font:inherit}
body[data-herta-atelier] .herta-mirror-panel[role=dialog]{position:fixed;right:22px;top:50%;transform:translateY(-50%);width:min(420px,calc(100vw - 32px));max-height:calc(100dvh - 32px);box-sizing:border-box;padding:16px;background:var(--herta-glass)!important;border:1px solid var(--herta-material-line);border-radius:22px;box-shadow:var(--herta-material-shadow);backdrop-filter:blur(14px) saturate(1.06);-webkit-backdrop-filter:blur(14px) saturate(1.06);overflow:auto;opacity:1}
.herta-mirror-panel[data-open]{animation:herta-mirror-show .2s ease-out both}
@keyframes herta-mirror-show{from{opacity:0;transform:translateY(calc(-50% + 8px))}to{opacity:1;transform:translateY(-50%)}}
.herta-mirror-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:0 2px;color:var(--herta-ink)}
.herta-mirror-heading strong{font:600 14px 'Microsoft YaHei UI',sans-serif;letter-spacing:.12em}
.herta-mirror-close{position:static;display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;padding:0;border:1px solid var(--herta-material-line);border-radius:10px;background:var(--herta-glass-soft);font-size:20px!important}
.herta-mirror-glass{width:100%;aspect-ratio:3/4;max-height:calc(100dvh - 168px);border-radius:47% 47% 43% 43%;overflow:hidden;border:3px double var(--herta-gold);outline:1px solid var(--herta-material-line);outline-offset:4px;background:var(--herta-glass-solid);box-shadow:inset 0 0 26px #10081f22;position:relative;display:grid;place-items:center;margin:0;cursor:pointer}
.herta-mirror-glass img{display:block;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .2s ease;position:relative;z-index:2}
.herta-mirror-glass:before{content:'';position:absolute;left:0;right:0;top:-14px;height:54px;background:var(--herta-crest) center/145px auto no-repeat;z-index:3;pointer-events:none;opacity:.72}
.herta-mirror-glass:after{content:'';position:absolute;left:0;right:0;bottom:-8px;height:38px;background:var(--herta-divider) center/160px auto no-repeat;z-index:3;pointer-events:none;opacity:.72}
.herta-mirror-glass span{text-align:center;line-height:1.8;color:var(--herta-muted);padding:24px;font-size:13px;z-index:2}
.herta-mirror-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:14px;color:var(--herta-muted);font-size:12px}
.herta-mirror-footer button{width:32px;height:30px;display:grid;place-items:center;padding:0;border:1px solid var(--herta-material-line);border-radius:10px;background:var(--herta-glass-soft)}
.herta-mirror-footer button:disabled{opacity:.38;cursor:default!important}
@media(prefers-reduced-motion:reduce){.herta-mirror-panel[data-open]{animation:none}.herta-mirror-glass img{transition:none;opacity:1}}
body[data-herta-atelier][data-herta-tone=light] #herta-atelier-controls>button{background:radial-gradient(ellipse at 35% 20%,#fff9ff,#e5d4f0 75%);color:#69438b}
@media(max-width:850px){
 body[data-herta-shell=real] #herta-atelier-frame{background-size:48px 48px!important}
 body[data-herta-atelier] .herta-mirror-panel[role=dialog]{right:16px;width:min(440px,calc(100vw - 32px))}
 .herta-art{background-position:90% center}
 body[data-herta-atelier] button[data-herta-brand-button]{min-height:98px;padding:0}
 #herta-atelier-brand{padding:58px 0 20px;background-size:115px auto;background-position:center -5px}
 #herta-atelier-brand img{width:49px;filter:none}
 .herta-brand-caption{display:none}
 #herta-atelier-brand:after{height:25px;left:0;right:0}
 body[data-herta-atelier] [data-slot=sidebar]:before,body[data-herta-atelier] [data-slot=sidebar]:after{width:55px;height:55px}
 body[data-herta-atelier] [data-slot=sidebar]>button:not([data-herta-brand-button]){padding:10px 5px;font-size:11px}
 body[data-herta-atelier] [data-slot=sidebar]>button:not([data-herta-brand-button]):after{display:none}
 #herta-atelier-frame,#herta-atelier-frame:before,#herta-atelier-frame:after{background-size:90px 90px}
 #herta-atelier-frame{inset:8px 8px 8px 84px;background:var(--herta-scroll) left top/90px 90px no-repeat}
 #herta-atelier-frame:before,#herta-atelier-frame:after{width:90px;height:90px}
 #herta-atelier-controls{top:23px;right:23px;gap:8px}
 #herta-atelier-controls section{max-height:calc(100dvh - 100px);overflow-y:auto}
 body[data-herta-atelier] [data-phase=hero] h1:after{height:48px}
 .herta-surface-trim{background-size:48px 48px}.herta-surface-trim:before,.herta-surface-trim:after{width:48px;height:48px}
}

/* 0.2.9: full crest in a real sidebar layout row, below the native menu bar. */
body[data-herta-shell=real] [data-herta-brand-row] #herta-atelier-brand:after{display:block!important;height:24px;bottom:0}
body[data-herta-shell=real] [data-herta-brand-row] .herta-brand-caption{display:block!important;font-size:9px;letter-spacing:2px;margin:4px 0 0}
body[data-herta-shell=real][data-herta-scene=settings] .herta-art{background-position:70% center}
body[data-herta-tone=light] .herta-art-chat-light{filter:brightness(1.15) saturate(.85)}
@media(max-height:650px){body[data-herta-shell=real] [data-herta-brand-row]{zoom:.8}}

/* One compositor timeline blends the entire shell, including titlebar controls. */
html:has(body[data-herta-atelier])::view-transition-group(root){animation-duration:${THEME_TRANSITION_MS}ms;animation-timing-function:ease-in-out}
html:has(body[data-herta-atelier])::view-transition-old(root){animation:herta-theme-out ${THEME_TRANSITION_MS}ms ease-in-out both;mix-blend-mode:normal}
html:has(body[data-herta-atelier])::view-transition-new(root){animation:herta-theme-in ${THEME_TRANSITION_MS}ms ease-in-out both;mix-blend-mode:normal}
@keyframes herta-theme-out{from{opacity:1}to{opacity:0}}
@keyframes herta-theme-in{from{opacity:0}to{opacity:1}}
#herta-atelier-stage:before{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(246,241,247,.8),rgba(246,241,247,.25) 46%,transparent 74%);opacity:0}
#herta-atelier-stage:after{z-index:1;background:linear-gradient(90deg,rgba(17,11,26,.7),rgba(17,11,26,.2) 46%,transparent 74%),linear-gradient(0deg,rgba(17,11,26,.3),transparent 35%)!important;opacity:1}
@media(prefers-reduced-motion:reduce){html:has(body[data-herta-atelier])::view-transition-group(root),html:has(body[data-herta-atelier])::view-transition-old(root),html:has(body[data-herta-atelier])::view-transition-new(root){animation:none!important}}

/* 0.3.1: a single palette for native caption, sidebar, and titlebar. */
body[data-herta-atelier]{--dsw-specific-sidebar-fill:var(--herta-shell-color,#21182d)!important;--dsw-desktop-window-tint:var(--herta-shell-color,#21182d)!important}
body[data-herta-atelier]>span[style*="--dsw-specific-sidebar-fill"]{background-color:var(--herta-shell-color)!important;color:var(--herta-shell-ink)!important;transition:none!important}
body[data-herta-atelier] [data-herta-sidebar-host]{background-color:var(--herta-shell-color)!important;transition-property:border-color,box-shadow!important}
body[data-herta-atelier] .BynINW_frame:before,body[data-herta-atelier] .fixture-chrome{background:var(--herta-shell-color)!important;color:var(--herta-shell-ink)!important;transition:none!important}
body[data-herta-atelier] .BynINW_centerCol{border-radius:20px 20px 0 0!important;background:transparent!important}
body[data-herta-atelier] [data-herta-sidebar-host] ._9lTDKa_fade{display:none!important}
body[data-herta-atelier] [data-herta-sidebar-host]:after{border-radius:12px!important}
body[data-herta-atelier] #herta-atelier-frame{border-radius:18px}
body[data-herta-atelier] :where(.composer,[data-slot=composer],[data-slot=chat-input]){border-radius:22px!important}
body[data-herta-atelier] [data-conversation-scroll]{border-radius:20px}
body[data-herta-atelier] [data-conversation-scroll] :where(pre,blockquote){border-radius:14px}
body[data-herta-atelier] #herta-atelier-controls section{border-radius:22px}
body[data-herta-atelier] #herta-atelier-controls :where(select,section>button){border-radius:12px}
body[data-herta-atelier] [data-herta-sidebar-host] :where(._2H3hWW_newSession,._2H3hWW_panelRow){border-radius:13px!important}

/* Native caption background stays transparent; the shared titlebar beneath
   supplies the color, avoiding a delayed native rectangle during the fade. */
body[data-herta-atelier]:not(:has(.dshba))>span[style*="--dsw-specific-sidebar-fill"]{background-color:rgba(0,0,0,0)!important;color:var(--herta-shell-ink)!important;transition:none!important}
body[data-herta-transition],body[data-herta-transition] *,body[data-herta-transition] *:before,body[data-herta-transition] *:after{transition:none!important}
#herta-atelier-stage:before{opacity:var(--herta-theme-mix,0)!important;transition:none!important}
#herta-atelier-stage:after{opacity:calc(1 - var(--herta-theme-mix,0))!important;transition:none!important}
body[data-herta-scene=home] .herta-art-home-light,body[data-herta-scene=chat] .herta-art-chat-light,body[data-herta-scene=settings] .herta-art-settings-light{opacity:calc(var(--herta-theme-mix,0) * var(--herta-art-opacity))!important}
body[data-herta-scene=home] .herta-art-home-dark,body[data-herta-scene=chat] .herta-art-chat-dark,body[data-herta-scene=settings] .herta-art-settings-dark{opacity:calc((1 - var(--herta-theme-mix,0)) * var(--herta-art-opacity))!important}
body[data-herta-atelier] [data-herta-header],body[data-herta-atelier] [data-herta-header] :where(div,nav,[role=tablist]){background:transparent!important;box-shadow:none!important;backdrop-filter:none!important}

/* A compact translucent settings sheet leaves more of the portrait visible. */
body[data-herta-atelier] #herta-atelier-controls section{width:min(260px,calc(100vw - 36px));max-height:calc(100dvh - 156px);overflow-y:auto;box-sizing:border-box;padding:50px 16px 16px;background-color:color-mix(in srgb,var(--herta-paper) 42%,transparent)!important;background-image:var(--herta-crest)!important;background-position:center -26px;background-size:200px auto;background-repeat:no-repeat;backdrop-filter:blur(9px) saturate(1.12);-webkit-backdrop-filter:blur(9px) saturate(1.12);border:1px solid color-mix(in srgb,var(--herta-gold) 65%,transparent);border-radius:20px;box-shadow:inset 0 0 0 4px #d9bc8208,0 10px 36px #10081f40}
body[data-herta-atelier] #herta-atelier-controls section>strong{margin:0 auto 12px;max-width:180px}
body[data-herta-atelier] #herta-atelier-controls section>strong img{max-width:100%;height:auto}
body[data-herta-atelier] #herta-atelier-controls section>label{padding:9px 0;font-size:12px;gap:8px}
body[data-herta-atelier] #herta-atelier-controls section :where(select,input){font-size:12px;max-width:146px;background-color:color-mix(in srgb,var(--herta-paper) 50%,transparent)}
body[data-herta-atelier] #herta-atelier-controls section>small{font-size:10px;line-height:1.6}
body[data-herta-atelier] #herta-atelier-controls section:before,body[data-herta-atelier] #herta-atelier-controls section:after{opacity:.55}
@supports not (backdrop-filter:blur(9px)){body[data-herta-atelier] #herta-atelier-controls section{background-color:color-mix(in srgb,var(--herta-paper) 78%,transparent)!important}}

/* Shared plum glass: one palette, edge and elevation family. These rules
   paint existing boxes; the native host keeps all text/composer geometry. */
body[data-herta-atelier]{--herta-glass:color-mix(in srgb,var(--herta-paper) 82%,transparent);--herta-glass-soft:color-mix(in srgb,var(--herta-paper) 56%,transparent);--herta-glass-solid:color-mix(in srgb,var(--herta-paper) 94%,transparent);--herta-material-line:color-mix(in srgb,var(--herta-gold) 36%,transparent);--herta-material-shadow:inset 0 1px color-mix(in srgb,var(--herta-ink) 7%,transparent),0 10px 30px #10081f24;--herta-focus-surface:color-mix(in srgb,var(--herta-paper) 88%,transparent)}
body[data-herta-atelier] [data-conversation-scroll]{background:color-mix(in srgb,var(--herta-paper) 10%,transparent)!important;box-shadow:none!important}
body[data-herta-atelier] [data-conversation-scroll] [data-chat-flow]:not([data-chat-flow] [data-chat-flow]){border-radius:16px;transition:background-color .24s ease,box-shadow .24s ease}
body[data-herta-atelier][data-herta-view=focus] [data-conversation-scroll] [data-chat-flow]:not([data-chat-flow] [data-chat-flow]){background:var(--herta-focus-surface);box-shadow:0 0 22px 14px var(--herta-focus-surface)}
body[data-herta-atelier] [data-chat-flow-key]{color:var(--herta-ink)}
body[data-herta-atelier][data-herta-view=focus] [data-chat-flow-key] :where(p,li,h1,h2,h3,strong){text-shadow:none!important}
body[data-herta-atelier] [data-chat-flow-key] :where(pre,blockquote) .herta-surface-trim{visibility:hidden}
body[data-herta-atelier] #herta-atelier-controls{gap:6px;padding:5px;border:1px solid var(--herta-material-line);border-radius:18px;background:var(--herta-glass-soft);box-shadow:var(--herta-material-shadow);backdrop-filter:none;-webkit-backdrop-filter:none}
body[data-herta-atelier] #herta-atelier-controls>button{width:36px;height:36px;min-width:36px;min-height:36px;flex:0 0 36px;border:1px solid var(--herta-material-line);border-radius:12px;background:var(--herta-glass)!important;color:var(--herta-gold);box-shadow:inset 0 1px color-mix(in srgb,var(--herta-ink) 6%,transparent);filter:none;transform:none}
body[data-herta-atelier] #herta-atelier-controls>button:where(:hover,[aria-expanded=true],[aria-pressed=true]){background:var(--herta-glass-solid)!important;border-color:var(--herta-gold)}
body[data-herta-atelier] #herta-atelier-controls>button img{width:23px;height:23px;object-fit:contain}
body[data-herta-atelier] #herta-atelier-controls section{background-color:var(--herta-glass)!important;border-color:var(--herta-material-line);border-radius:22px;box-shadow:var(--herta-material-shadow);backdrop-filter:blur(14px) saturate(1.06)}
body[data-herta-atelier] #herta-atelier-controls section :where(select,input){background-color:var(--herta-glass-soft);border-color:var(--herta-material-line)}
body[data-herta-atelier] [data-herta-header]:not([data-herta-header] [data-herta-header]){background:var(--herta-glass-soft)!important;backdrop-filter:none!important}
body[data-herta-atelier] :where([data-composer-card],[data-slot=composer],[data-slot=chat-input],.composer){background-color:var(--herta-glass)!important;background-image:none!important;border-color:var(--herta-material-line)!important;border-radius:20px!important;box-shadow:var(--herta-material-shadow)!important}
body[data-herta-atelier] [data-conversation-scroll] :where(pre,blockquote){background:var(--herta-glass-solid)!important;background-image:none;border:1px solid var(--herta-material-line);border-radius:14px;box-shadow:inset 0 1px color-mix(in srgb,var(--herta-ink) 5%,transparent)}
body[data-herta-atelier] [data-conversation-scroll] table{background:var(--herta-glass-solid)}
@supports not (backdrop-filter:blur(10px)){body[data-herta-atelier] #herta-atelier-controls section,body[data-herta-atelier] .herta-mirror-panel[role=dialog]{background:var(--herta-glass-solid)!important}}
@media(prefers-reduced-motion:reduce){body[data-herta-atelier] [data-chat-flow]{transition:none!important}}
#herta-atelier-stage .herta-motion-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:0% 50%;pointer-events:none;filter:saturate(.96)}
body[data-herta-scene=chat][data-herta-tone=light] .herta-motion-video{filter:saturate(.94)}
#herta-atelier-stage .herta-motion-video[hidden]{display:none!important}
body #herta-atelier-stage[data-herta-motion=ready] .herta-art{visibility:hidden}

/* Wide content always scrolls locally. A CSS table does not
   establish an overflow viewport until it becomes a block box. */
body[data-herta-atelier] [data-conversation-scroll] :where(pre,table){box-sizing:border-box;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain}
body[data-herta-atelier] [data-conversation-scroll] .md-table-wide{width:100%;max-width:100%;min-width:0;margin-inline:0;padding-inline:0}
body[data-herta-atelier] [data-conversation-scroll] table{display:block}
body[data-herta-atelier] [data-conversation-scroll] pre{padding:16px 20px!important}
body[data-herta-atelier] [data-chat-flow-key] img{max-width:100%;height:auto}
body[data-herta-atelier] .herta-art{filter:saturate(.96)}
body[data-herta-tone=light] .herta-art-chat-light{filter:saturate(.94)}
`;
