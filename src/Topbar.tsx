import type { AppView } from './App.tsx';
import { getLabels } from './i18n.ts';

type Props = Readonly<{ view: AppView }>;

export function Topbar({ view }: Props) {
  return (
    <header className="topbar">
      <span className="demo-badge">
        <span aria-hidden="true" />
        {view.language === 'ru' ? 'Макет · учебные данные' : 'Demo · sample data'}
      </span>
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
      {getLabels(view.language).language}
      <select
        id="topbar-language"
        value={view.language}
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'ru' || next === 'en') view.setLanguage(next);
        }}
      >
        <option value="ru">Русский</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}

function ThemeControl({ view }: Props) {
  return (
    <label htmlFor="topbar-theme">
      {view.language === 'ru' ? 'Оформление' : 'Theme'}
      <select
        id="topbar-theme"
        value={view.theme}
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'dark' || next === 'light' || next === 'system') view.setTheme(next);
        }}
      >
        <option value="dark">{view.language === 'ru' ? 'Тёмная' : 'Dark'}</option>
        <option value="light">{view.language === 'ru' ? 'Светлая' : 'Light'}</option>
        <option value="system">{view.language === 'ru' ? 'Системная' : 'System'}</option>
      </select>
    </label>
  );
}

function DisplayCurrencyControl({ view }: Props) {
  return (
    <label htmlFor="topbar-currency">
      {view.language === 'ru' ? 'Валюта' : 'Currency'}
      <select
        id="topbar-currency"
        aria-label={view.language === 'ru' ? 'Валюта отображения' : 'Display currency'}
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
