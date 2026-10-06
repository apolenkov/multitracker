import type { Screen } from './i18n.ts';

const paths = {
  overview: 'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
  portfolios: 'M4 7h16v14H4zM8 7V4h8v3M4 12h16M10 12v3h4v-3',
  history: 'M9 5h12M9 12h12M9 19h12M3 5h2M3 12h2M3 19h2',
  import: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  connections: 'M9 8H7a4 4 0 0 0 0 8h2M15 8h2a4 4 0 0 1 0 8h-2M8 12h8',
  sync: 'M20 9a8 8 0 0 0-13-4L3 9M3 4v5h5M4 15a8 8 0 0 0 13 4l4-4m0 5v-5h-5',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M8 15v6',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13ZM15 15l6 6',
  check: 'M4 12l5 5L20 6',
  chevron: 'm9 5 7 7-7 7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  menu: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  incoming: 'M12 4v16m-6-6 6 6 6-6',
  outgoing: 'M12 20V4m-6 6 6-6 6 6',
  transfer: 'M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4',
  warning: 'M12 3 2 21h20L12 3zm0 7v5m0 3.5v.5',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-14v5m0 3.5v.5',
  brand: 'M3 19V5l9 8 9-8v14M3 5h18',
};
const pathByName = new Map(Object.entries(paths));

type Name =
  | Screen
  | 'edit'
  | 'trash'
  | 'menu'
  | 'brand'
  | 'close'
  | 'search'
  | 'check'
  | 'chevron'
  | 'incoming'
  | 'outgoing'
  | 'transfer'
  | 'warning'
  | 'info';
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
