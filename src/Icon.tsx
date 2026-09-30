import type { Screen } from './i18n.ts';

const paths = {
  overview: 'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
  portfolios: 'M4 7h16v14H4zM8 7V4h8v3M4 12h16M10 12v3h4v-3',
  markets: 'M3 20h18M5 16l4-5 4 3 6-9M16 5h3v3',
  following: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
  analytics: 'M4 21V11h4v10M10 21V4h4v17M16 21v-7h4v7',
  events: 'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 4h2',
  history: 'M9 5h12M9 12h12M9 19h12M3 5h2M3 12h2M3 19h2',
  import: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  connections: 'M9 8H7a4 4 0 0 0 0 8h2M15 8h2a4 4 0 0 1 0 8h-2M8 12h8',
  sync: 'M20 9a8 8 0 0 0-13-4L3 9M3 4v5h5M4 15a8 8 0 0 0 13 4l4-4m0 5v-5h-5',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M8 15v6',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13ZM15 15l6 6',
  check: 'M4 12l5 5L20 6',
  chevron: 'm9 5 7 7-7 7',
  more: 'M4 12h1M11.5 12h1M19 12h1',
  brand: 'M3 19V5l9 8 9-8v14M3 5h18',
};
const pathByName = new Map(Object.entries(paths));

type Name = Screen | 'more' | 'brand' | 'close' | 'search' | 'check' | 'chevron';
export function Icon({ name }: Readonly<{ name: Name }>) {
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={pathByName.get(name)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
