const paths = {
  ceiling: 'M3 11l9-7 9 7 M5 11v9h14v-9 M8 15h8 M8 18h8',
  map: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',
  folder: 'M3 6h7l2 2h9v12H3z M3 6V4h7l2 2h7v2',
  waterDepth: 'M3 6c3-3 6 3 9 0s6 3 9 0 M3 12c3-3 6 3 9 0s6 3 9 0 M5 18c3-3 5 3 8 0s4 2 6 0 M9 22h6',
  brush: 'M14 4l6-2 2 2-8 10-4-4z M10 10l4 4 M9 13c-4 0-3 6-7 7 6 3 12-1 10-5z',
  landmass: 'M3 3h10l-2 4 3 3-5 2 1 4-7 3z M15 14c2-2 4 2 6 0 M13 19c3-2 5 2 8 0', terrain: 'M2 20L9 5l4 8 3-5 6 12z M6 11l3 3 3-3',
  place: 'M12 21s7-7 7-12a7 7 0 00-14 0c0 5 7 12 7 12z M10 7h4v4h-4z',
  label: 'M4 5h16 M12 5v15 M8 20h8', legend: 'M4 5h3v3H4z M11 6h9 M4 12h3v3H4z M11 13h9 M4 19h16',
  compass: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z M12 2v10l10 0 M12 12v10 M12 12H2', path: 'M3 19C3 3 21 21 21 5 M2 18h3v3H2z M19 3h3v3h-3z',
  route: 'M5 21l4-7-2-5 5-6 M14 21l4-7-2-5 5-6', area: 'M3 8l8-5 10 7-5 11-12-4z',
  wall: 'M3 5h18v14H3z M3 12h18 M10 5v7 M16 12v7', opening: 'M3 4h7v16H3 M21 4h-4v16h4 M10 4a13 13 0 0113 13 M10 4l7 13',
  scatter: 'M4 4h4v4H4z M15 3h3v3h-3z M11 11h5v5h-5z M3 17h3v3H3z M19 19h2v2h-2z',
  measure: 'M3 16L16 3l5 5L8 21z M8 11l3 3 M12 7l3 3 M4 15l3 3',
  focus: 'M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5',

  select: 'M5 3l13 10-7 1-3 7z', stamp: 'M9 3h6v5l3 5v4H6v-4l3-5z M4 21h16', pattern: 'M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18',
  layers: 'M3 8l9-5 9 5-9 5z M3 12l9 5 9-5 M3 16l9 5 9-5', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M10 10h4v4h-4z', hidden: 'M3 3l18 18 M3 12s3-6 9-6c4 0 7 3 9 6 M3 12c2 4 5 6 9 6',
  lock: 'M7 10V7a5 5 0 0110 0v3 M5 10h14v11H5z M12 14v3', unlock: 'M7 10V7a5 5 0 0110 0 M5 10h14v11H5z M12 14v3',
  up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6', more: 'M5 11v2 M12 11v2 M19 11v2', close: 'M6 6l12 12 M18 6L6 18', undo: 'M9 5L3 11l6 6 M3 11h12a6 6 0 016 6', redo: 'M15 5l6 6-6 6 M21 11H9a6 6 0 00-6 6',
  fit: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M8 8h8v8H8z', plus: 'M12 5v14 M5 12h14', minus: 'M5 12h14', snap: 'M5 4v9a7 7 0 0014 0V4h-5v9a2 2 0 01-4 0V4z',
} as const
export type IconName = keyof typeof paths
export function Icon({ name }: { name: IconName }) { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg> }
