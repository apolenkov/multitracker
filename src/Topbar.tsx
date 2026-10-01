import type { AppView } from './App.tsx';
import { getLabels } from './i18n.ts';

type Props = Readonly<{ view: AppView }>;

export function Topbar({ view }: Props) {
  return (
    <header className="topbar">
      <div className="utility-controls">
        <LanguageControl view={view} />
        <ThemeControl view={view} />
        <DisplayCurrencyControl view={view} />
      </div>
    </header>
  );
}

function LanguageControl({ view }: Props) {
  return (
    <label htmlFor="topbar-language">
      <span className="visually-hidden">{getLabels(view.language).language}</span>
      <select
        id="topbar-language"
        title={getLabels(view.language).language}
        value={view.language}
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'ru' || next === 'en') view.setLanguage(next);
        }}
      >
        <option value="ru">RU</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}

function ThemeControl({ view }: Props) {
  return (
    <label htmlFor="topbar-theme">
      <span className="visually-hidden">{view.language === 'ru' ? 'Оформление' : 'Theme'}</span>
      <select
        id="topbar-theme"
        title={view.language === 'ru' ? 'Оформление' : 'Theme'}
        value={view.theme}
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'dark' || next === 'light' || next === 'system') view.setTheme(next);
        }}
      >
        <option value="dark">{view.language === 'ru' ? 'Тёмная' : 'Dark'}</option>
        <option value="light">{view.language === 'ru' ? 'Светлая' : 'Light'}</option>
        <option value="system">{view.language === 'ru' ? 'Авто' : 'Auto'}</option>
      </select>
    </label>
  );
}

function DisplayCurrencyControl({ view }: Props) {
  return (
    <label htmlFor="topbar-currency">
      <span className="visually-hidden">
        {view.language === 'ru' ? 'Валюта показа' : 'Display currency'}
      </span>
      <select
        id="topbar-currency"
        title={view.language === 'ru' ? 'Валюта показа' : 'Display currency'}
        value={view.currency}
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'RUB' || next === 'USD') view.setCurrency(next);
        }}
      >
        <option value="RUB">RUB</option>
        <option value="USD">USD</option>
      </select>
    </label>
  );
}
