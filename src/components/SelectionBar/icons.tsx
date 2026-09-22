/** Stroke icons for the selection bar and inspector footer: 20px grid, currentColor, decorative (the button names them). */
const paths = {
  move: 'M10 2.5v15M2.5 10h15M10 2.5 7.8 4.7M10 2.5l2.2 2.2M10 17.5l-2.2-2.2M10 17.5l2.2-2.2M2.5 10l2.2-2.2M2.5 10l2.2 2.2M17.5 10l-2.2-2.2M17.5 10l-2.2 2.2',
  rotateLeft: 'M4.5 8.5A6 6 0 1 1 5.7 14M4.5 8.5V4.3M4.5 8.5h4.2',
  rotateRight: 'M15.5 8.5A6 6 0 1 0 14.3 14M15.5 8.5V4.3M15.5 8.5h-4.2',
  flip: 'M10 3v14M7 6 3.5 10 7 14M13 6l3.5 4-3.5 4',
  duplicate: 'M7 7h9.5v9.5H7zM13 7V3.5H3.5V13H7',
  swap: 'M4 7h11.5M12.5 4l3 3-3 3M16 13H4.5M7.5 10l-3 3 3 3',
  pair: 'M8.2 11.8l3.6-3.6M7 9.4 5.3 11a2.6 2.6 0 0 0 3.7 3.7l1.6-1.7M13 10.6l1.7-1.6A2.6 2.6 0 0 0 11 5.3L9.4 7',
  unpair: 'M7 9.4 5.3 11a2.6 2.6 0 0 0 3.7 3.7l1.6-1.7M13 10.6l1.7-1.6A2.6 2.6 0 0 0 11 5.3L9.4 7M3.5 3.5l13 13',
  focus: 'M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4M10 8v4M8 10h4',
  delete: 'M3.5 5.5h13M8 5.5V3.5h4v2M5.3 5.5l.8 11h7.8l.8-11M8.4 8.5v5.5M11.6 8.5v5.5',
  close: 'M5 5l10 10M15 5 5 15',
  reset: 'M4.5 8A6 6 0 1 1 4 11.5M4.5 8V4M4.5 8h4',
  chevron: 'M6 8l4 4 4-4',
  lock: 'M5 9h10v8H5zM7 9V6.5a3 3 0 0 1 6 0V9M10 12v2',
  unlock: 'M5 9h10v8H5zM7 9V6.5a3 3 0 0 1 5.8-1.1M10 12v2',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg className="sb-icon" viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false">
    <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
