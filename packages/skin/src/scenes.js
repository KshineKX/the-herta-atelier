// One frontend scene table owns labels, portrait variants and action sequences.
export const SCENE_DEFINITIONS = {
  home: {
    label: '星穹 · 天才书房',
    artwork: { dark: 'art-home-dark-soft.webp', light: 'art-home-light-soft.webp' },
    motion: { idle: 'home-idle', actions: { leave: { label: '离席', clips: ['home-rise', 'home-exit'], end: 'away' }, return: { label: '回来', clips: ['home-enter', 'home-sit'] } } },
  },
  chat: {
    label: '课间 · 星间漫游',
    artwork: { dark: 'art-campus-soft.webp', light: 'art-campus-soft.webp' },
    motion: { idle: 'campus-idle', actions: { greet: { label: '回头回应', clips: ['campus-greet', 'campus-reset'], holdAfter: 0 } } },
  },
  settings: {
    label: '私室 · 天才的房间',
    artwork: { dark: 'art-room-soft.webp', light: 'art-room-soft.webp' },
    motion: { idle: 'room-idle', actions: { roll: { label: '仰躺看你', clips: ['room-roll', 'room-roll-reset'], holdAfter: 0 }, tilt: { label: '歪头看你', clips: ['room-tilt', 'room-tilt-reset'], holdAfter: 0 } } },
  },
};
