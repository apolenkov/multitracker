import { useEffect, useState } from 'react';
import type { Screen } from './i18n.ts';
import { demoScreens, type Screen as DemoScreen } from './demo/words.ts';

export type Route = Readonly<{ screen: Screen; demoScreen: DemoScreen }>;

const screens: readonly Screen[] = ['overview', 'portfolios', 'history', ...demoScreens];

export function parseScreen(hash: string): Screen {
  return screens.find((screen) => hash === `#${screen}`) ?? 'overview';
}
export function isDemoScreen(screen: Screen): screen is DemoScreen {
  return demoScreens.some((item) => item === screen);
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
    const readAddress = (focus = true) => {
      const screen = parseScreen(window.location.hash);
      if (window.location.hash !== `#${screen}`) {
        window.history.replaceState(null, '', `#${screen}`);
      }
      closeOpenDialogs();
      if (focus) focusPage();
      setRoute((current) => routeFor(current, screen));
    };
    readAddress(false);
    const onHashChange = () => readAddress();
    const dialogClosed = () => requestAnimationFrame(restoreVisibleFocus);
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('close', dialogClosed, true);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
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
