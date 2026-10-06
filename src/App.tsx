import { useEffect, useState } from 'react';
import { getLabels } from './i18n.ts';
import type { Language, Screen } from './i18n.ts';
import { demoState } from './model/portfolio.ts';
import type { Currency } from './model/portfolio.ts';
import { Navigation } from './Navigation.tsx';
import { BuyForm, PortfolioForm, PrivacyDialog } from './Forms.tsx';
import { Workspace } from './Workspace.tsx';
import type { DemoState, Density, Theme } from './demo/words.ts';
import { focusMain, useNavigation } from './navigation.ts';
import { useDialogPointerGuard } from './dialog-pointer-guard.ts';

export type Notice = Readonly<{ sequence: number; message: string }>;
import './base.css';
import './skip-link.css';
import './appearance.css';
import './layout.css';
import './finance.css';
import './records.css';
import './finance-responsive.css';
import './disclosure.css';
import './dialog-layout.css';

export type AppView = ReturnType<typeof useAppView>;
export function App() {
  useDialogPointerGuard();
  const view = useAppView();
  const labels = getLabels(view.language);
  return (
    <div
      className="app-shell"
      data-density={view.density}
      data-theme={view.theme}
      data-monochrome={view.monochrome}
    >
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          focusMain();
        }}
      >
        {labels.skip}
      </a>
      <Navigation screen={view.screen} onScreen={view.navigate} labels={labels} />
      <Workspace view={view} />
      <AppDialogs view={view} />
    </div>
  );
}
function useAppView() {
  const preferences = usePreferences();
  const navigation = useNavigation();
  const [portfolioId, setPortfolioId] = useState('all');
  const [notice, setNotice] = useState<Notice>({ sequence: 0, message: '' });
  const demo = useDemoView();
  useDocumentMetadata(preferences.language, navigation.screen);
  useDocumentTheme(preferences.theme);
  useEffect(() => {
    setNotice((current) =>
      current.message ? { sequence: current.sequence, message: '' } : current,
    );
  }, [navigation.screen]);
  const navigate = (next: Screen) => {
    navigation.navigate(next);
    setNotice((current) => ({ sequence: current.sequence, message: '' }));
  };
  const selectPortfolio = (id: string) => {
    setPortfolioId(id);
    navigate('overview');
  };
  const onSaved = (message: string) => {
    setNotice((current) => ({ sequence: current.sequence + 1, message }));
  };
  const dismissNotice = () => {
    setNotice((current) => ({ sequence: current.sequence, message: '' }));
  };
  const setLanguage = (value: Language) => {
    preferences.setLanguage(value);
    dismissNotice();
  };
  return {
    ...demo,
    ...preferences,
    ...navigation,
    navigate,
    setLanguage,
    dismissNotice,
    portfolioId,
    setPortfolioId,
    selectPortfolio,
    notice,
    onSaved,
  };
}
function usePreferences() {
  const [language, setLanguage] = useState<Language>('ru');
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [baseCurrency, setBaseCurrency] = useState<Currency>('RUB');
  const [theme, setTheme] = useState<Theme>('light');
  const [hidden, setHidden] = useState(false);
  const [monochrome, setMonochrome] = useState(false);
  return {
    language,
    setLanguage,
    currency,
    setCurrency,
    baseCurrency,
    setBaseCurrency,
    theme,
    setTheme,
    hidden,
    setHidden,
    monochrome,
    setMonochrome,
  };
}
function useDemoView() {
  const [density, setDensity] = useState<Density>('comfortable');
  const [demoState, setDemoState] = useState<DemoState>('ready');
  return { density, setDensity, demoState, setDemoState };
}
function useDocumentMetadata(language: Language, screen: Screen) {
  const title = new Map(Object.entries(getLabels(language))).get(screen) ?? screen;
  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document
      .querySelector('title')
      ?.replaceChildren(document.createTextNode(`MultiTracker — ${title}`));
  }, [language, title]);
}
function useDocumentTheme(theme: Theme) {
  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      document.documentElement.setAttribute('data-theme', theme);
      const canvas = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim();
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', canvas);
    };
    update();
    if (theme !== 'system') return;
    system.addEventListener('change', update);
    return () => system.removeEventListener('change', update);
  }, [theme]);
}
function AppDialogs({ view }: Readonly<{ view: AppView }>) {
  return (
    <>
      <PortfolioForm language={view.language} onSaved={view.onSaved} />
      <BuyForm
        key={view.portfolioId}
        language={view.language}
        onSaved={view.onSaved}
        state={demoState}
        portfolioId={
          view.portfolioId === 'all' ? 'tradernet' : (view.portfolioId.split(',')[0] ?? 'tradernet')
        }
      />
      <PrivacyDialog language={view.language} />
    </>
  );
}
