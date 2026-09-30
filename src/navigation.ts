import { useEffect, useState } from 'react';
import type { Screen } from './i18n.ts';

type DemoScreen = 'import' | 'connections' | 'sync' | 'settings';
export type Route = Readonly<{ screen: Screen; demoScreen: DemoScreen }>;

export function parseScreen(hash: string): Screen {
  switch (hash) {
    case '#portfolios':
      return 'portfolios';
    case '#history':
      return 'history';
    case '#import':
      return 'import';
    case '#connections':
      return 'connections';
    case '#sync':
      return 'sync';
    case '#settings':
      return 'settings';
    default:
      return 'overview';
  }
}
export function isDemoScreen(screen: Screen): screen is DemoScreen {
  return (
    screen === 'import' || screen === 'connections' || screen === 'sync' || screen === 'settings'
  );
}
export function routeFor(current: Route, screen: Screen): Route {
  return { screen, demoScreen: isDemoScreen(screen) ? screen : current.demoScreen };
}
export function focusMain(options?: FocusOptions) {
  document.getElementById('main')?.focus(options);
}
function focusPage() {
  focusMain({ preventScroll: true });
  window.scrollTo(0, 0);
}
function closeOpenDialogs() {
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((dialog) => dialog.close());
}
function restoreVisibleFocus() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && active.checkVisibility()) return;
  focusMain({ preventScroll: true });
}
export function useNavigation() {
  const [route, setRoute] = useState<Route>(() => {
    const screen = parseScreen(window.location.hash);
    return routeFor({ screen: 'overview', demoScreen: 'import' }, screen);
  });
  useEffect(() => {
    const readAddress = () => {
      const screen = parseScreen(window.location.hash);
      if (window.location.hash !== `#${screen}`) {
        window.history.replaceState(null, '', `#${screen}`);
      }
      closeOpenDialogs();
      focusPage();
      setRoute((current) => routeFor(current, screen));
    };
    readAddress();
    const dialogClosed = () => requestAnimationFrame(restoreVisibleFocus);
    window.addEventListener('hashchange', readAddress);
    document.addEventListener('close', dialogClosed, true);
    return () => {
      window.removeEventListener('hashchange', readAddress);
      document.removeEventListener('close', dialogClosed, true);
    };
  }, []);
  const navigate = (screen: Screen) => {
    if (window.location.hash !== `#${screen}`) {
      window.location.assign(`#${screen}`);
      return;
    }
    closeOpenDialogs();
    focusPage();
  };
  return { ...route, navigate };
}
