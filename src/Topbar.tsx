import type { AppView } from './App.tsx';
import { getLabels } from './i18n.ts';
export function Topbar({ view }: Readonly<{ view: AppView }>) {
  const labels = getLabels(view.language);
  return (
    <header className="topbar">
      <span className="demo-badge">
        <span aria-hidden="true" />
        {labels.demo}
      </span>
      <div className="utility-controls">
        <label>
          {labels.language}
          <select
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
        <label>
          {labels.show}
          <select
            value={view.currency}
            onChange={(event) => {
              const next = event.target.value;
              if (next === 'RUB' || next === 'USD') view.setCurrency(next);
            }}
          >
            <option>RUB</option>
            <option>USD</option>
          </select>
        </label>
      </div>
    </header>
  );
}
