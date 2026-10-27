import { THEME_ICON_CSS } from './theme-icon.js';
import { PALETTES } from './palette.js';
export const THEME_TRANSITION_MS=700;
const paletteRules=['dark','light'].map((tone,index)=>'body[data-herta-atelier][data-herta-tone='+tone+']{'+Object.entries(PALETTES).map(([name,values])=>'--'+name+':'+values[index]+';').join('')+'}').join('\n');
export const CSS=`${THEME_ICON_CSS}
${paletteRules}
@media(max-width:850px){#herta-atelier-stage .herta-motion-video{object-position:90% 50%!important}}
@font-face{font-family:'Herta Serif';src:url("__HERTA_ASSETS__herta-serif-title.ttf") format('truetype');font-weight:800;font-style:normal;font-display:swap}
body[data-herta-atelier]{
--herta-corner:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80' fill='none' stroke='%23bca16b' stroke-width='.8'%3E%3Cpath d='M7 70V7h63M13 51V13h38M7 43C43 43 43 7 43 7M13 32C28 32 32 28 32 13M7 60c17-7 29-20 39-36M60 7c-7 17-20 29-36 39'/%3E%3Cpath d='m49 27 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z'/%3E%3Ccircle cx='13' cy='13' r='2'/%3E%3C/svg%3E");
isolation:isolate;background:var(--herta-paper);color:var(--herta-ink);color-scheme:var(--herta-color-scheme);
--dsw-alias-bg-base:transparent!important;--dsw-alias-bg-layer-1:transparent!important;--dsw-alias-bg-layer-2:transparent!important;--dsw-alias-bg-layer-3:transparent!important;--dsw-alias-bg-overlay:var(--herta-paper)!important;--dsw-alias-bg-module-platform:var(--herta-surface)!important;
--dsw-alias-label-primary:var(--herta-ink)!important;--dsw-alias-label-secondary:var(--herta-muted)!important;--dsw-alias-label-primary-dimmed:var(--herta-ink)!important;--dsw-alias-label-primary-bluish:var(--herta-ink)!important;
--dsw-alias-brand-primary:var(--herta-accent)!important;--dsw-alias-brand-text:var(--herta-accent)!important;
--dsw-specific-sidebar-fill:var(--herta-surface)!important;--dsw-specific-input-major:var(--herta-surface)!important;--dsw-specific-bubble:var(--herta-surface)!important;--dsw-specific-menu:var(--herta-paper)!important;--dsw-specific-selector:var(--herta-paper)!important;
--dsw-alias-border-l1:var(--herta-line)!important;
--dsw-alias-markdown-inline-code:var(--herta-code)!important;}

/* 0.4.x compat: the host composer seat now paints its scrim with
   --dsw-alias-bg-base, which this skin forces to transparent. Restore the
   docked-composer scrim locally and hook the current composer DOM. */
body[data-herta-atelier] [data-composer-seat]{--dsw-alias-bg-base:var(--herta-paper)!important;z-index:7}
body[data-herta-atelier] [data-conversation-region=composer]{--dsw-alias-bg-base:var(--herta-paper)!important}
body[data-herta-atelier] [data-composer-card]{border-color:var(--herta-gold)!important;box-shadow:inset 0 0 0 4px rgba(217,185,110,.03),0 12px 40px rgba(10,5,20,.14)!important}

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
body[data-herta-atelier] :where(pre){background:var(--herta-read);border:1px solid var(--herta-line);border-radius:12px}
body[data-herta-atelier] [data-conversation-scroll] :where(pre,blockquote){box-shadow:inset 0 1px rgba(217,185,110,.28)}
body[data-herta-atelier] [data-conversation-scroll] blockquote{margin-inline:0;padding:12px 20px;border-inline-start:2px solid var(--herta-gold);background:var(--herta-surface);border-radius:0 12px 12px 0;color:var(--herta-muted)}
body[data-herta-atelier] [data-conversation-scroll] table{border-collapse:collapse;background:var(--herta-read)}
body[data-herta-atelier] [data-conversation-scroll] :where(th,td){padding:10px 15px;border:1px solid var(--herta-line)}
body[data-herta-atelier] [data-conversation-scroll] th{color:var(--herta-table-ink);font-weight:600}
body[data-herta-atelier] [data-conversation-scroll] hr{border:0;height:1px;background:linear-gradient(90deg,transparent,var(--herta-gold),transparent);opacity:.45}
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
 --herta-silver:#cbbddf;

 --herta-scroll:url('__HERTA_ASSETS__ornament-corner.svg');
 --herta-crest:url('__HERTA_ASSETS__ornament-crest.svg');
 --herta-divider:url('__HERTA_ASSETS__ornament-divider.svg');
 --herta-damask:url('__HERTA_ASSETS__ornament-damask.svg');
 --herta-key:url('__HERTA_ASSETS__ornament-key.svg');
}
body[data-herta-atelier][data-herta-tone=light]{--herta-silver:#796288;}
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
body[data-herta-atelier] [data-conversation-scroll]{border-color:var(--herta-line);border-radius:8px 25px 8px 25px;box-shadow:inset 0 0 0 4px rgba(213,185,130,.035)}
body[data-herta-atelier] [data-conversation-scroll] pre{border-radius:5px 15px 5px 15px;padding:48px 64px 34px;border-color:var(--herta-line);background:var(--herta-read);box-shadow:inset 0 0 0 5px rgba(217,188,130,.035)}
body[data-herta-atelier] [data-conversation-scroll] pre .herta-surface-trim{background:var(--herta-scroll) left top/64px 64px no-repeat,var(--herta-divider) center top/190px 42px no-repeat}
body[data-herta-atelier] [data-conversation-scroll] blockquote{border:1px solid var(--herta-line);border-inline-start:3px solid var(--herta-gold);border-radius:2px 15px 2px 15px;background-image:var(--herta-damask);background-size:70px 98px;padding:17px 24px}
body[data-herta-atelier] [data-conversation-scroll] th{background:var(--herta-table-surface);border-bottom-color:var(--herta-gold)}
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
.herta-mirror-glass{appearance:none;padding:0;color:inherit;font:inherit;width:100%;aspect-ratio:3/4;max-height:calc(100dvh - 168px);border-radius:47% 47% 43% 43%;overflow:hidden;border:3px double var(--herta-gold);outline:1px solid var(--herta-material-line);outline-offset:4px;background:var(--herta-glass-solid);box-shadow:inset 0 0 26px #10081f22;position:relative;display:grid;place-items:center;margin:0;cursor:pointer}
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
body[data-herta-atelier] [data-herta-frame]:before,body[data-herta-atelier] .fixture-chrome{background:var(--herta-shell-color)!important;color:var(--herta-shell-ink)!important;transition:none!important}
body[data-herta-atelier] [data-conversation-region]{border-radius:20px 20px 0 0!important;background:transparent!important}
body[data-herta-atelier] [data-herta-sidebar-host]:after{border-radius:12px!important}
body[data-herta-atelier] #herta-atelier-frame{border-radius:18px}
body[data-herta-atelier] [data-conversation-scroll]{border-radius:20px}
body[data-herta-atelier] [data-conversation-scroll] :where(pre,blockquote){border-radius:14px}
body[data-herta-atelier] #herta-atelier-controls section{border-radius:22px}
body[data-herta-atelier] #herta-atelier-controls :where(select,section>button){border-radius:12px}

/* Native caption background stays transparent; the shared titlebar beneath
   supplies the color, avoiding a delayed native rectangle during the fade. */
body[data-herta-atelier]:not(:has(.dshba))>span[style*="--dsw-specific-sidebar-fill"]{background-color:rgba(0,0,0,0)!important;color:var(--herta-shell-ink)!important;transition:none!important}
body[data-herta-transition],body[data-herta-transition] *:not(.herta-theme-part),body[data-herta-transition] *:before,body[data-herta-transition] *:after{transition:none!important}
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
body[data-herta-atelier] [data-composer-card]{background-color:var(--herta-glass)!important;background-image:none!important;border-color:var(--herta-material-line)!important;border-radius:20px!important;box-shadow:var(--herta-material-shadow)!important}
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
