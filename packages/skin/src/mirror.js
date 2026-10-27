const MIRROR_DB = 'herta-atelier-mirror:v1';
const MIRROR_BUILTINS = [];

// Gallery files are kept in the browser, not sent to the host or a remote site.
export function createMirror(doc, { base, onOpen = () => {}, onInfo = () => {} } = {}) {
  let disposed = false, opened = false, loaded = false, index = 0, dbPromise, openRequest = 0;
  let album = MIRROR_BUILTINS.map(item => ({ ...item, src: base + item.file }));
  const objectURLs = new Set();
  const root = doc.createElement('div'); root.id = 'herta-atelier-mirror';
  const trigger = doc.createElement('button'); trigger.type = 'button'; trigger.className = 'herta-mirror-trigger';
  trigger.setAttribute('aria-label', '打开大黑塔的藏镜'); trigger.setAttribute('aria-expanded', 'false'); trigger.title='打开藏镜';
  const icon = doc.createElement('img'); icon.src = base + 'herta-mirror-mark.svg'; icon.alt = ''; trigger.append(icon);
  const panel = doc.createElement('section'); panel.className = 'herta-mirror-panel'; panel.hidden = true;
  panel.id='herta-mirror-gallery';trigger.setAttribute('aria-controls',panel.id);
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '大黑塔的藏镜'); panel.setAttribute('aria-modal', 'false');
  const glass = doc.createElement('button'); glass.type='button'; glass.className = 'herta-mirror-glass';glass.setAttribute('aria-label','随机切换藏镜图片');
  const picture = doc.createElement('img'); picture.alt = ''; picture.draggable = false;
  const fallback = doc.createElement('span'); fallback.textContent = '图库为空，打开设置查看本机图库路径'; fallback.style.cssText = 'font-size:13px;line-height:1.8;white-space:pre-line;text-align:center;padding:30px;overflow-wrap:anywhere'; fallback.hidden = true;
  glass.append(picture, fallback);
  const close = doc.createElement('button'); close.type = 'button'; close.className = 'herta-mirror-close';
  close.setAttribute('aria-label', '收起藏镜'); close.textContent = '×';
  const picker = doc.createElement('input'); picker.type = 'file'; picker.multiple = true; picker.hidden = true;
  picker.accept = 'image/png,image/jpeg,image/webp,image/avif';
  const heading=doc.createElement('header');heading.className='herta-mirror-heading';
  const title=doc.createElement('strong');title.textContent='私人藏镜';heading.append(title,close);
  const footer=doc.createElement('footer');footer.className='herta-mirror-footer';
  const previous=doc.createElement('button');previous.type='button';previous.textContent='‹';previous.setAttribute('aria-label','上一张藏镜图片');
  const next=doc.createElement('button');next.type='button';next.textContent='›';next.setAttribute('aria-label','下一张藏镜图片');
  const counter=doc.createElement('span');counter.setAttribute('aria-live','polite');counter.textContent='点击镜面换一幅';footer.append(previous,counter,next);
  const importButton=doc.createElement('button');importButton.type='button';importButton.textContent='＋';importButton.setAttribute('aria-label','导入本地图片');importButton.title='导入本地图片';footer.append(importButton);
  panel.append(heading, glass, footer, picker);
  root.append(trigger, panel); doc.body.append(root);

  function database() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = doc.defaultView.indexedDB.open(MIRROR_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id' });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { if (disposed) { request.result.close(); reject(new Error('Mirror disposed')); } else resolve(request.result); };
      request.onblocked = () => reject(new Error('Gallery storage is busy'));
    });
    return dbPromise;
  }
  async function readStored() {
    const db = await database();
    return new Promise((resolve, reject) => { const request = db.transaction('images').objectStore('images').getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  }
  async function writeStored(operation, value) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite'); transaction.objectStore('images')[operation](value);
      transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error || new Error('Gallery write cancelled'));
    });
  }
  function localItem(row) {
    const src = doc.defaultView.URL.createObjectURL(row.blob); objectURLs.add(src);
    return { id: row.id, title: row.name, src, local: true, fit: 'contain' };
  }
  let directory = '';
  async function refreshInfo() {
    try { const response = await doc.defaultView.fetch(base+'mirror-gallery.json',{cache:'no-store'});if(!response.ok)throw Error();const info=await response.json();directory=info.directory;onInfo(info);fallback.textContent=info.status==='unavailable'?'图库暂时无法读取，请检查文件夹权限':'将图片放入\n'+directory+'\n重新打开藏镜刷新';return info; } catch { fallback.textContent='图库接口暂不可用，请重新打开 DSH';return {images:[]}; }
  }
  let hydration;
  function hydrate() {
    if (hydration) return hydration;
    hydration = (async () => {
      try { const rows = await readStored(); if (!disposed) album.push(...rows.sort((a,b) => a.createdAt-b.createdAt).map(localItem)); }
      catch { /* storage unavailable: built-ins still work */ }
      loaded = true;
    })();
    return hydration;
  }
  function render() {
    if (disposed) return;
    previous.disabled=next.disabled=album.length<2;
    counter.textContent=album.length ? (index%album.length+album.length)%album.length+1+' / '+album.length : '本地图库';
    if (!album.length) { picture.hidden = true; fallback.hidden = false; return; }
    index = ((index % album.length) + album.length) % album.length;
    const item = album[index];
    fallback.hidden = true; picture.hidden = false;
    picture.style.opacity = '0';
    const reveal = () => { if (!disposed) picture.style.opacity = '1'; };
    picture.src = item.src; picture.alt = item.title || '';
    if (picture.complete) doc.defaultView.requestAnimationFrame(reveal);
    else picture.onload = reveal;
  }
  function hide(restoreFocus = false) {
    ++openRequest;
    opened = false; panel.hidden = true; panel.removeAttribute('data-open');
    trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-label', '打开大黑塔的藏镜');
    if (restoreFocus) trigger.focus();
  }
  async function show() {
    if (disposed) return;
    const request=++openRequest;
    onOpen(); opened = true; panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true'); trigger.setAttribute('aria-label', '收起大黑塔的藏镜');
    panel.removeAttribute('data-open'); void panel.offsetWidth; panel.setAttribute('data-open', '');
    if (!loaded) await hydrate();
    if(disposed||!opened||request!==openRequest)return;
    try {
      const data = await refreshInfo();
      if (disposed || !opened || request!==openRequest) return;
      album = [...data.images.map(item => ({...item, folder:true})), ...album.filter(item => item.local)];
    } catch { album = album.filter(item => item.local); }
    if (opened && !disposed && request===openRequest) { render(); close.focus(); }
  }
  function random() {
    if (album.length < 2) return;
    let next = index;
    while (next === index) next = Math.floor(Math.random() * album.length);
    index = next; render();
  }
  async function addFiles(files) {
    const accepted = files.filter((file) => ['image/png','image/jpeg','image/webp','image/avif'].includes(file.type) && file.size <= 20*1024*1024).slice(0, 24);
    if (!accepted.length) return;
    await hydrate();
    for (const file of accepted) {
      if (disposed) return;
      const row = { id: doc.defaultView.crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ''), blob: file, createdAt: Date.now() };
      try { await writeStored('put', row); } catch { /* current session only */ }
      if (disposed) return;
      album.push(localItem(row));
    }
    index = album.length - 1; render();
  }
  picture.onerror = () => { picture.hidden = true; fallback.textContent='这张图片无法读取，点击镜面切换下一张'; fallback.hidden = false; };
  trigger.onclick = () => { if (opened) hide(); else void show(); };
  close.onclick = (event) => { event.stopPropagation(); hide(true); };
  glass.onclick = () => random();
  previous.onclick=event=>{event.stopPropagation();index--;render();};
  next.onclick=event=>{event.stopPropagation();index++;render();};
  importButton.onclick=()=>picker.click();
  picker.onchange = async () => { const files = [...picker.files]; picker.value = ''; await addFiles(files); };
  panel.addEventListener('dragover', (event) => { event.preventDefault(); });
  panel.addEventListener('drop', async (event) => { event.preventDefault(); await addFiles([...event.dataTransfer.files]); });
  glass.ondblclick = (event) => { event.stopPropagation(); picker.click(); };
  function keydown(event) {
    if (!opened) return;
    if (event.key === 'Escape') { event.preventDefault(); hide(true); }
    else if (['ArrowLeft','ArrowRight'].includes(event.key) && panel.contains(doc.activeElement) && !event.altKey && !event.ctrlKey && !event.metaKey && !event.target.closest?.('input,textarea,select,[contenteditable=true]')) { event.preventDefault(); index += event.key === 'ArrowLeft' ? -1 : 1; render(); }
  }
  function outside(event){if(opened&&!event.composedPath().includes(root)&&!event.composedPath().includes(trigger))hide();}
  doc.addEventListener('keydown', keydown);
  doc.addEventListener('pointerdown',outside,true);
  return {
    root, trigger, close: hide, refreshInfo,
    setEnabled(enabled) { if (trigger.hidden !== !enabled) trigger.hidden = !enabled; if (!enabled && opened) hide(); },
    dispose() { disposed = true; doc.removeEventListener('keydown', keydown); doc.removeEventListener('pointerdown',outside,true);trigger.remove();root.remove(); objectURLs.forEach(url => doc.defaultView.URL.revokeObjectURL(url)); objectURLs.clear(); dbPromise?.then(db => db.close()).catch(() => {}); },
  };
}
