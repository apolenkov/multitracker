import { useState } from 'react';
import type { Language } from './words';
import { MoneyAmount } from '../MoneyAmount.tsx';
import { widgetNumber } from './widget-format.ts';
import './widget.css';

type WidgetLayout = 'compact' | 'detailed';
type Props = Readonly<{ language: Language; hidden: boolean }>;
type PreviewProps = Props & Readonly<{ layout: WidgetLayout; changes: boolean }>;
const copy = (language: Language) => (ru: string, en: string) => (language === 'ru' ? ru : en);

export function WidgetPreview(props: Props) {
  const [layout, setLayout] = useState<WidgetLayout>('compact');
  const [changes, setChanges] = useState(true);
  const text = copy(props.language);
  return (
    <section className="widget-settings" aria-labelledby="widget-title">
      <h2 id="widget-title">{text('Предпросмотр виджета', 'Widget preview')}</h2>
      <p className="quiet">
        {text(
          'Независимый учебный снимок в USD. Виджет в систему не устанавливается.',
          'Independent sample snapshot in USD. No system widget is installed.',
        )}
      </p>
      <div className="widget-workspace">
        <div className="widget-controls">
          <WidgetOptions language={props.language} layout={layout} onLayout={setLayout} />
          <label className="check-row">
            <input
              id="widget-changes"
              type="checkbox"
              checked={changes}
              onChange={(event) => setChanges(event.target.checked)}
            />
            {text('Показывать изменение за день', 'Show daily change')}
          </label>
        </div>
        <WidgetCanvas {...props} layout={layout} changes={changes} />
      </div>
      <WidgetAnnouncement language={props.language} layout={layout} changes={changes} />
    </section>
  );
}

function WidgetCanvas(props: PreviewProps) {
  const text = copy(props.language);
  return (
    <div id="widget-preview" className={`widget-canvas widget-${props.layout}`}>
      <p className="quiet">{text('Снимок · USD', 'Snapshot · USD')}</p>
      <h3>{text('Портфель', 'Portfolio')}</h3>
      <PortfolioWidget {...props} />
      <p className="quiet">
        {text(
          'Снимок на 30 сентября 2026. Данные вымышлены.',
          'Snapshot: 30 September 2026. Fictional data.',
        )}
      </p>
    </div>
  );
}

function PortfolioWidget(props: PreviewProps) {
  const text = copy(props.language);
  return (
    <>
      <p className="widget-value">
        <MoneyAmount
          value={12480}
          currency="USD"
          language={props.language}
          hidden={props.hidden}
          currencySuffix
        />
      </p>
      {props.changes && (
        <p>
          {text('Изменение за день', 'Daily change')}:{' '}
          <span className="positive">
            {masked(
              props.hidden,
              `${widgetNumber(props.language, 180, true)} USD (${widgetNumber(props.language, 1.46, true)}%)`,
            )}
          </span>
        </p>
      )}
      {props.layout === 'detailed' && (
        <dl className="widget-breakdown">
          <dt>{text('Акции', 'Stocks')}</dt>
          <dd>{masked(props.hidden, `${widgetNumber(props.language, 7488)} USD`)}</dd>
          <dt>{text('Фонды', 'Funds')}</dt>
          <dd>{masked(props.hidden, `${widgetNumber(props.language, 3744)} USD`)}</dd>
          <dt>{text('Цифровые активы', 'Digital assets')}</dt>
          <dd>{masked(props.hidden, `${widgetNumber(props.language, 1248)} USD`)}</dd>
        </dl>
      )}
    </>
  );
}

function WidgetOptions({
  language,
  layout,
  onLayout,
}: Readonly<{
  language: Language;
  layout: WidgetLayout;
  onLayout: (layout: WidgetLayout) => void;
}>) {
  const text = copy(language);
  return (
    <div className="widget-options">
      <label htmlFor="widget-layout">
        {text('Размер', 'Layout')}
        <select
          id="widget-layout"
          value={layout}
          onChange={(event) => onLayout(event.target.value === 'detailed' ? 'detailed' : 'compact')}
        >
          <option value="compact">{text('Компактный', 'Compact')}</option>
          <option value="detailed">{text('Подробный', 'Detailed')}</option>
        </select>
      </label>
    </div>
  );
}

function masked(hidden: boolean, value: string) {
  return hidden ? '••••' : value;
}

function WidgetAnnouncement({
  language,
  layout,
  changes,
}: Readonly<{ language: Language; layout: WidgetLayout; changes: boolean }>) {
  const text = copy(language);
  return (
    <p className="visually-hidden" role="status">
      {text('Предпросмотр', 'Preview')}: {text('портфель', 'portfolio')},{' '}
      {layout === 'compact' ? text('компактный', 'compact') : text('подробный', 'detailed')},{' '}
      {changes
        ? text('с изменением за день', 'with daily change')
        : text('без изменения за день', 'without daily change')}
      .
    </p>
  );
}
