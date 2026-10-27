import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const SCREEN=readFileSync(new URL('../src/boot-screen.js',import.meta.url),'utf8');
function matches(element, selector) {
  if (selector.startsWith('.')) return element.className.split(/\s+/).includes(selector.slice(1))
  if (selector.startsWith('[')) return element.attrs[selector.slice(1, -1)] !== undefined
  return element.tagName === selector.toUpperCase()
}

function find(element, selector) {
  if (element === null || element === undefined) return null
  if (element.matches(selector)) return element
  for (const child of element.children) {
    const hit = find(child, selector)
    if (hit !== null) return hit
  }
  return null
}

class Element {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase()
    this.children = []
    this.parentNode = null
    this.attrs = {}
    this.listeners = {}
    this.style = {}
    this.className = ''
    this.textContent = ''
    // Media element state the screen reads.
    this.muted = false
    this.readyState = 0
    this.currentTime = 0
    this.duration = 8
    this.paused = true
    this.ended = false
    this.loop = false
    this.playsInline = false
    this.preload = ''
    this.src = ''
    this.error = null
    /** Every play() this element was asked for, by the `muted` it was asked with. */
    this.playCalls = []
    /**
     * The document's autoplay state, shared by every element it creates: the
     * browser's rule plus whether the page has seen a user gesture yet. See play().
     */
    this.activation = { policy: 'allow', gesture: false }
  }

  setAttribute(name, value) { this.attrs[name] = String(value) }
  getAttribute(name) { return name in this.attrs ? this.attrs[name] : null }
  appendChild(node) { node.parentNode = this; this.children.push(node); return node }
  replaceChild(next, old) {
    const index = this.children.indexOf(old)
    if (index >= 0) this.children[index] = next
    next.parentNode = this
    old.parentNode = null
    return old
  }
  removeChild(node) {
    const index = this.children.indexOf(node)
    if (index >= 0) this.children.splice(index, 1)
    node.parentNode = null
    return node
  }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler) }
  removeEventListener() {}
  dispatch(type, event) {
    // A pointer press is the user gesture Chromium records before it runs any
    // handler, which is exactly why the screen's retry can succeed where the
    // unattended unmuted attempt could not.
    if (type === 'pointerdown') this.activation.gesture = true
    for (const handler of this.listeners[type] ?? []) handler(event ?? {})
  }
  matches(selector) { return matches(this, selector) }
  closest(selector) {
    let node = this
    while (node !== null && node !== undefined) {
      if (node.matches(selector)) return node
      node = node.parentNode
    }
    return null
  }
  querySelector(selector) { return find(this, selector) }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 } }
  play() {
    this.playCalls.push(this.muted)
    // 'refuse-unmuted' is Chromium on an origin it has not seen a gesture from:
    // the unattended unmuted attempt is refused, and the press that follows is the
    // activation that lets the very same call through. 'refuse-always' is the
    // stubborn policy that keeps saying no — the only way to reach the refusal
    // note on the button.
    const { policy, gesture } = this.activation
    const refused = this.muted === false
      && (policy === 'refuse-always' || (policy === 'refuse-unmuted' && !gesture))
    if (refused) {
      return Promise.reject(Object.assign(new Error('play() failed'), { name: 'NotAllowedError' }))
    }
    this.paused = false
    return Promise.resolve()
  }
  pause() { this.paused = true }
  requestVideoFrameCallback(handler) { this.frameHandler = handler }
}

function makeDocument(playPolicy) {
  // One activation record per document: the gesture the page has seen belongs to
  // the page, not to the element that happened to be pressed.
  const activation = { policy: playPolicy ?? 'allow', gesture: false }
  const make = (tag) => {
    const element = new Element(tag)
    element.activation = activation
    return element
  }
  const doc = {
    head: make('head'),
    body: make('body'),
    documentElement: make('html'),
    createElement: (tag) => make(tag),
    querySelector: (selector) => find(doc.body, selector),
    getElementById: () => null,
    addEventListener: () => {},
  }
  return doc
}

/**
 * Mount one instance of the screen with a given config.
 *
 * `playPolicy` models the browser: 'refuse-unmuted' is Chromium on an origin
 * without media engagement, which is the case the two-step press exists for.
 */
function mount(cfg, options = {}) {
  const doc = makeDocument(options.playPolicy)
  const timers = []
  const keyboard = []
  const sandbox = {
    __DSH_BOOT_ANIM_CFG__: { manifest: '/clips.json', holdMs: 15000, ...cfg },
    document: doc,
    location: { search: options.search ?? '' },
    sessionStorage: { getItem: () => null, setItem: () => {} },
    fetch: () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        clips: [{ name: 'clip.mp4', src: '/clip/clip.mp4', enabled: true }],
      }),
    }),
    // Captured, never fired: the hold window, the tail loop, the fade and the
    // skip-advance watchdog are all wall-clock behaviour, and the assertions here
    // are about decisions the screen makes before any of them could run.
    setTimeout: (handler, ms) => { timers.push({ handler, ms }); return timers.length },
    clearTimeout: () => {},
    setInterval: (handler, ms) => { timers.push({ handler, ms }); return timers.length },
    clearInterval: () => {},
    addEventListener: (type,handler) => { if(type === 'keydown') keyboard.push(handler) },
    console,
  }
  vm.createContext(sandbox)
  vm.runInContext(SCREEN, sandbox, { filename: 'boot-screen.js' })
  return { sandbox, doc, timers, keyboard }
}

/** Let the manifest fetch, the clip pick and the play() chain settle. */
async function settle() {
  for (let turn = 0; turn < 40; turn++) await Promise.resolve()
}

const video = (bundle) => find(bundle.doc.body, 'video')
const overlay = (bundle) => bundle.sandbox.__DSH_BOOT_ANIM__
const state = (bundle) => overlay(bundle).el.getAttribute('data-state')
const press = (bundle) => video(bundle).parentNode.dispatch('pointerdown', { target: overlay(bundle).el })


export {matches,find,Element,makeDocument,mount,settle,video,overlay,state,press};
