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
import './base.css';
import './layout.css';
import './finance.css';
import './records.css';
import './finance-responsive.css';

export type AppView = ReturnType<typeof useAppView>;
export function App() {
  const view = useAppView();
  const labels = getLabels(view.language);
  return (
    <div className="app-shell" data-density={view.density} data-theme={view.theme}>
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
  const [notice, setNotice] = useState({ sequence: 0, message: '' });
  const demo = useDemoView();
  useDocumentMetadata(preferences.language, navigation.screen);
  const navigate = (next: Screen) => {
    navigation.navigate(next);
    setNotice((current) => ({ ...current, message: '' }));
  };
  const selectPortfolio = (id: string) => {
    setPortfolioId(id);
    navigate('overview');
  };
  const onSaved = (message: string) =>
    setNotice((current) => ({ sequence: current.sequence + 1, message }));
  return {
    ...demo,
    ...preferences,
    ...navigation,
    navigate,
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
  const [theme, setTheme] = useState<Theme>('dark');
  const [hidden, setHidden] = useState(false);
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
