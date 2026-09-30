import type { Screen } from './i18n.ts';

const paths = {
  overview: 'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
  portfolios: 'M4 7h16v14H4zM8 7V4h8v3M4 12h16M10 12v3h4v-3',
  history: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
  import: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  connections:
    'M9 15 15 9M7 17H5a4 4 0 0 1-4-4v-2a4 4 0 0 1 4-4h2m10 0h2a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-2',
  sync: 'M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5m-3 9a9 9 0 0 0 15 2l3-3m0 5v-5h-5',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M8 15v6',
  more: 'M4 12h.01M12 12h.01M20 12h.01',
  brand: 'M3 19V5l9 8 9-8v14M3 5h18',
};
const pathByName = new Map(Object.entries(paths));

export function NavigationIcon({ name }: Readonly<{ name: Screen | 'more' | 'brand' }>) {
  return (
    <svg className="navigation-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
