import { useState } from 'react';
import type { Language } from '../demo/words';
import { copy } from './data';
import { widgetNumber } from './widget-format';
import { MoneyAmount } from '../MoneyAmount.tsx';
import './events.css';

type WidgetKind = 'portfolio' | 'market';
type WidgetLayout = 'compact' | 'detailed';
type Props = Readonly<{ language: Language; hidden: boolean }>;
type PreviewProps = Props & Readonly<{ kind: WidgetKind; layout: WidgetLayout; changes: boolean }>;

export function WidgetPreview(props: Props) {
  const [kind, setKind] = useState<WidgetKind>('portfolio');
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
          <WidgetOptions
            language={props.language}
            kind={kind}
            layout={layout}
            onKind={setKind}
            onLayout={setLayout}
          />
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
        <WidgetCanvas {...props} kind={kind} layout={layout} changes={changes} />
      </div>
      <WidgetAnnouncement language={props.language} kind={kind} layout={layout} changes={changes} />
    </section>
  );
}

function WidgetCanvas(props: PreviewProps) {
  const text = copy(props.language);
  return (
    <div id="widget-preview" className={`widget-canvas widget-${props.layout}`}>
      <p className="quiet">{text('Учебный снимок · USD', 'Sample snapshot · USD')}</p>
      <h3>
        {props.kind === 'portfolio'
          ? text('Учебный портфель', 'Sample portfolio')
          : text('Учебный рынок', 'Sample market')}
      </h3>
      {props.kind === 'portfolio' ? <PortfolioWidget {...props} /> : <MarketWidget {...props} />}
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
          <dt>{text('Учебные акции', 'Sample stocks')}</dt>
          <dd>{masked(props.hidden, `${widgetNumber(props.language, 7488)} USD`)}</dd>
          <dt>{text('Учебные фонды', 'Sample funds')}</dt>
          <dd>{masked(props.hidden, `${widgetNumber(props.language, 3744)} USD`)}</dd>
          <dt>{text('Учебные цифровые активы', 'Sample digital assets')}</dt>
          <dd>{masked(props.hidden, `${widgetNumber(props.language, 1248)} USD`)}</dd>
        </dl>
      )}
    </>
  );
}

function MarketWidget(props: PreviewProps) {
  const text = copy(props.language);
  return (
    <>
      <dl className="widget-breakdown">
        <dt>LUMA</dt>
        <dd>
          {masked(props.hidden, `${widgetNumber(props.language, 48)} USD`)}{' '}
          {props.changes && (
            <span className="positive">
              {masked(props.hidden, `${widgetNumber(props.language, 2.1, true)}%`)}
            </span>
          )}
        </dd>
        {props.layout === 'detailed' && (
          <>
            <dt>NOMA</dt>
            <dd>
              {masked(props.hidden, `${widgetNumber(props.language, 32)} USD`)}{' '}
              {props.changes && (
                <span className="negative">
                  {masked(props.hidden, `${widgetNumber(props.language, -0.8, true)}%`)}
                </span>
              )}
            </dd>
            <dt>ORBIT</dt>
            <dd>
              {masked(props.hidden, `${widgetNumber(props.language, 6)} USD`)}{' '}
              {props.changes && (
                <span className="positive">
                  {masked(props.hidden, `${widgetNumber(props.language, 0.4, true)}%`)}
                </span>
              )}
            </dd>
          </>
        )}
      </dl>
      <p className="quiet">
        {text(
          'Вымышленные символы, без торговых действий.',
          'Fictional symbols, no trading actions.',
        )}
      </p>
    </>
  );
}

function WidgetOptions({
  language,
  kind,
  layout,
  onKind,
  onLayout,
}: Readonly<{
  language: Language;
  kind: WidgetKind;
  layout: WidgetLayout;
  onKind: (kind: WidgetKind) => void;
  onLayout: (layout: WidgetLayout) => void;
}>) {
  const text = copy(language);
  return (
    <div className="widget-options">
      <label htmlFor="widget-kind">
        {text('Что показывать', 'Content')}
        <select
          id="widget-kind"
          value={kind}
          onChange={(event) => onKind(event.target.value === 'market' ? 'market' : 'portfolio')}
        >
          <option value="portfolio">{text('Портфель', 'Portfolio')}</option>
          <option value="market">{text('Рынок', 'Market')}</option>
        </select>
      </label>
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
  kind,
  layout,
  changes,
}: Readonly<{ language: Language; kind: WidgetKind; layout: WidgetLayout; changes: boolean }>) {
  const text = copy(language);
  return (
    <p className="visually-hidden" role="status">
      {text('Предпросмотр', 'Preview')}:{' '}
      {kind === 'portfolio' ? text('портфель', 'portfolio') : text('рынок', 'market')},{' '}
      {layout === 'compact' ? text('компактный', 'compact') : text('подробный', 'detailed')},{' '}
      {changes
        ? text('с изменением за день', 'with daily change')
        : text('без изменения за день', 'without daily change')}
      .
    </p>
  );
}
