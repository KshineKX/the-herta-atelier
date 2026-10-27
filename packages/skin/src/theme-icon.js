// Original vector artwork adapted from the user's local sun/moon button study.
// Only the small icon moves; text and surface colors commit together.
export function createThemeIcon(doc) {
  const ns='http://www.w3.org/2000/svg';
  const element=(tag,attributes={})=>{const node=doc.createElementNS(ns,tag);for(const[name,value]of Object.entries(attributes))node.setAttribute(name,String(value));return node};
  const svg=element('svg',{viewBox:'0 0 32 32',fill:'none','aria-hidden':'true',focusable:'false',class:'herta-theme-icon'});
  const rays=element('g',{class:'herta-theme-part herta-sun-rays',stroke:'currentColor','stroke-width':1.6,'stroke-linecap':'round'});
  rays.append(element('path',{d:'M16 3v3m0 20v3M3 16h3m20 0h3M6.8 6.8l2.1 2.1m14.2 14.2 2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1'}));
  svg.append(rays,element('circle',{class:'herta-theme-part herta-sun-disc',cx:16,cy:16,r:6.3,fill:'currentColor','fill-opacity':.2,stroke:'currentColor','stroke-width':1.6}),element('path',{class:'herta-theme-part herta-moon',d:'M22.8 20.8A10 10 0 0 1 11.2 7a10 10 0 1 0 11.6 13.8Z',fill:'currentColor','fill-opacity':.2,stroke:'currentColor','stroke-width':1.6,'stroke-linejoin':'round'}),element('path',{class:'herta-theme-part herta-moon-star',d:'m23 4 .9 2.5L26.5 7l-2.6 1-.9 2.5-.9-2.5-2.6-1 2.6-.5Z',fill:'currentColor'}));
  return svg;
}

export const THEME_ICON_CSS=`
#herta-atelier-theme .herta-theme-icon{width:26px;height:26px;pointer-events:none;overflow:visible;color:var(--herta-violet)}
#herta-atelier-theme[data-tone=light] .herta-theme-icon{color:var(--herta-gold)}
#herta-atelier-theme .herta-theme-part{transform-origin:16px 16px;transition:transform .24s ease,opacity .2s ease}
#herta-atelier-theme .herta-moon,#herta-atelier-theme .herta-moon-star{opacity:0;transform:rotate(-35deg) scale(.45)}
#herta-atelier-theme[data-tone=dark] :where(.herta-sun-rays,.herta-sun-disc){opacity:0;transform:rotate(80deg) scale(.35)}
#herta-atelier-theme[data-tone=dark] :where(.herta-moon,.herta-moon-star){opacity:1;transform:rotate(0) scale(1)}
#herta-atelier-theme[data-tone=light]:hover .herta-sun-rays{transform:rotate(35deg)}
#herta-atelier-theme[data-tone=dark]:hover .herta-moon-star{transform:rotate(12deg) scale(1.12)}
@media(prefers-reduced-motion:reduce){#herta-atelier-theme .herta-theme-part{transition:none!important}}
`;
