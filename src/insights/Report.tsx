import { useEffect, useRef, useState } from 'react';
import { date, money, type Language } from '../i18n.ts';
import { assessmentDate, totals, type Buy, type Currency } from '../model/portfolio.ts';
import { cancelOnEscape } from './ManualValuation.tsx';
import { insightWords } from './words.ts';

type Props = Readonly<{
  buys: readonly Buy[];
  currency: Currency;
  language: Language;
  hidden: boolean;
}>;

export function Report(props: Props) {
  const words = insightWords(props.language);
  const [period, setPeriod] = useState('all');
  const [currency, setCurrency] = useState<Currency | ''>('');
  const displayCurrency = currency || props.currency;
  const result = totals(props.buys, displayCurrency);
  const start = period === 'quarter' ? '2026-07-01' : '2026-01-01';
  const count = props.buys.filter((buy) => period === 'all' || buy.date >= start).length;
  return (
    <details className="portfolio-report">
      <summary>{words.report}</summary>
      <div className="report-toolbar">
        <label>
          {props.language === 'ru' ? 'Валюта отчёта' : 'Report currency'}
          <select
            value={displayCurrency}
            onChange={(event) => setCurrency(event.target.value === 'RUB' ? 'RUB' : 'USD')}
          >
            <option>RUB</option>
            <option>USD</option>
          </select>
        </label>
        <Export language={props.language} />
      </div>
      <p className="quiet">{words.reportNote}</p>
      <h3>
        {words.positions} {date(assessmentDate, props.language)} · {displayCurrency}
      </h3>
      <ReportValues result={result} {...props} currency={displayCurrency} />
      <section className="report-transactions">
        <ReportPeriod language={props.language} period={period} onChange={setPeriod} />
        <p>
          {words.periodRows}: {props.hidden ? '••••' : count}
        </p>
        <ReportHistory
          {...props}
          currency={displayCurrency}
          start={period === 'all' ? '2000-01-01' : start}
        />
      </section>
    </details>
  );
}

function ReportValues({
  result,
  currency,
  language,
  hidden,
}: Props & Readonly<{ result: ReturnType<typeof totals> }>) {
  const words = insightWords(language);
  const rows = [
    [words.current, result.value],
    [words.cost, result.basis],
    [words.unrealized, result.profit],
    [words.realized, 0],
    [words.income, 0],
  ] as const;
  return (
    <dl className="effects">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{hidden ? '••••' : money(value, currency, language)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Export({ language }: Readonly<{ language: Language }>) {
  const words = insightWords(language);
  const [editing, setEditing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const finish = () => setEditing(false);
  useEffect(() => {
    if (!editing) trigger.current?.focus();
  }, [editing]);
  const [event, setEvent] = useState(0);
  return (
    <div>
      {!editing && (
        <button type="button" ref={trigger} onClick={() => setEditing(true)}>
          {words.export}
        </button>
      )}
      {editing && (
        <ExportForm
          language={language}
          onCancel={finish}
          onSave={() => {
            finish();
            setEvent((previous) => previous + 1);
          }}
        />
      )}
      {event > 0 && (
        <p key={event} role="status">
          {words.exported}
        </p>
      )}
    </div>
  );
}

function ExportForm({
  language,
  onCancel,
  onSave,
}: Readonly<{
  language: Language;
  onCancel: () => void;
  onSave: () => void;
}>) {
  const words = insightWords(language);
  const formatInput = useRef<HTMLSelectElement>(null);
  useEffect(() => formatInput.current?.focus(), []);
  return (
    <form
      className="asset-price-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <p className="quiet">{words.exportNote}</p>
      <label>
        {words.format}
        <select ref={formatInput} defaultValue="CSV" onKeyDown={cancelOnEscape(onCancel)}>
          <option>CSV</option>
          <option>PDF</option>
        </select>
      </label>
      <div className="form-actions">
        <button type="button" onClick={onCancel} onKeyDown={cancelOnEscape(onCancel)}>
          {words.cancel}
        </button>
        <button type="submit" className="primary" onKeyDown={cancelOnEscape(onCancel)}>
          {words.showExport}
        </button>
      </div>
    </form>
  );
}

function ReportHistory({
  buys,
  start,
  currency,
  language,
  hidden,
}: Props & Readonly<{ start: string }>) {
  const words = insightWords(language);
  return (
    <div
      className="asset-timeline table-scroll"
      tabIndex={0}
      role="region"
      aria-label={words.transactions}
    >
      <table>
        <caption>{words.periodRows}</caption>
        <thead>
          <tr>
            <th scope="col">{words.date}</th>
            <th scope="col">{language === 'ru' ? 'Актив' : 'Asset'}</th>
            <th scope="col">{words.cost}</th>
          </tr>
        </thead>
        <tbody>
          {buys
            .filter((buy) => buy.date >= start)
            .map((buy) => (
              <tr key={buy.id}>
                <td>{date(buy.date, language)}</td>
                <td>{buy.asset}</td>
                <td>
                  {hidden ? '••••' : money(totals([buy], currency).basis, currency, language)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportPeriod({
  language,
  period,
  onChange,
}: Readonly<{
  language: Language;
  period: string;
  onChange: (period: string) => void;
}>) {
  const words = insightWords(language);
  return (
    <div className="insight-controls">
      <h3>{words.transactions}</h3>
      <label>
        {words.period}
        <select value={period} onChange={(event) => onChange(event.target.value)}>
          <option value="all">{words.all}</option>
          <option value="year">{words.year}</option>
          <option value="quarter">{words.quarter}</option>
        </select>
      </label>
    </div>
  );
}
