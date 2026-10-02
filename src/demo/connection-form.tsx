import { useState, type FormEvent } from 'react';
import { demoState } from '../model/portfolio';
import { accountSamples, firstAccount, accountLabel } from '../forms/accounts';
import type { Connection, ConnectionWords } from './connection-text';

type Props = Readonly<{
  provider: string;
  language: 'ru' | 'en';
  initial: Connection | undefined;
  t: ConnectionWords;
  onSave: (value: Connection) => void;
  onCancel: () => void;
}>;
export function ConnectionForm({ provider, language, initial, t, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<Connection>(
    initial ?? {
      provider,
      portfolio: 'tradernet',
      account: 'tradernet-main',
      start: '2026-01-01',
    },
  );
  const [result, setResult] = useState<'idle' | 'passed' | 'failed'>('idle');
  const [testError, setTestError] = useState(false);
  const update = (value: Connection) => {
    setDraft(value);
    setResult('idle');
  };
  // «Сохранить» сама выполняет проверку: при успехе сохраняет, при ошибке показывает её у кнопки.
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const outcome = result === 'passed' || !testError ? 'passed' : 'failed';
    setResult(outcome);
    if (outcome === 'passed') onSave(draft);
  };
  return (
    <form onSubmit={save}>
      <ConnectionFields draft={draft} update={update} t={t} language={language} />
      <ConnectionAccess t={t} />
      <ConnectionTest
        t={t}
        result={result}
        setResult={setResult}
        testError={testError}
        setTestError={setTestError}
      />
      <p className="demo-note">{t.onlyDemo}</p>
      <div className="dialog-actions">
        <button type="button" className="quiet" onClick={onCancel}>
          {t.cancel}
        </button>
        <button type="submit" className="primary">
          {t.save}
        </button>
      </div>
    </form>
  );
}
function ConnectionFields({
  draft,
  update,
  t,
  language,
}: Readonly<{
  draft: Connection;
  update: (value: Connection) => void;
  t: ConnectionWords;
  language: 'ru' | 'en';
}>) {
  return (
    <fieldset className="demo-field-group">
      <legend>{t.destination}</legend>
      <label>
        {t.destination}
        <select
          value={draft.portfolio}
          onChange={(event) =>
            update({
              ...draft,
              portfolio: event.target.value,
              account: firstAccount(event.target.value),
            })
          }
        >
          {demoState.portfolios.map((portfolio) => (
            <option key={portfolio.id} value={portfolio.id}>
              {portfolio.name}
            </option>
          ))}
        </select>
      </label>
      <ConnectionAccount draft={draft} update={update} t={t} language={language} />
      <ConnectionDate draft={draft} update={update} t={t} />
    </fieldset>
  );
}
function ConnectionResult({
  result,
  t,
  retry,
}: Readonly<{
  result: 'idle' | 'passed' | 'failed';
  t: ConnectionWords;
  retry: () => void;
}>) {
  if (result === 'idle') return null;
  return (
    <div role="status">
      <p>{result === 'passed' ? t.passed : t.failed}</p>
      {result === 'failed' && (
        <button type="button" onClick={retry}>
          {t.retry}
        </button>
      )}
    </div>
  );
}

type FieldProps = Readonly<{
  draft: Connection;
  update: (value: Connection) => void;
  t: ConnectionWords;
}>;
function ConnectionAccount({
  draft,
  update,
  t,
  language,
}: FieldProps & Readonly<{ language: 'ru' | 'en' }>) {
  return (
    <label>
      {t.account}
      <select
        value={draft.account}
        onChange={(event) => update({ ...draft, account: event.target.value })}
      >
        {accountSamples
          .filter((item) => item.portfolioId === draft.portfolio)
          .map((account) => (
            <option key={account.id} value={account.id}>
              {accountLabel(account.id, language)}
            </option>
          ))}
      </select>
    </label>
  );
}
function ConnectionDate({ draft, update, t }: FieldProps) {
  const [invalid, setInvalid] = useState(false);
  return (
    <label>
      {t.start}
      <input
        type="date"
        required
        min="2000-01-01"
        max="2026-09-30"
        value={draft.start}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'connection-date-error' : undefined}
        onInvalid={(event) => {
          setInvalid(true);
          event.currentTarget.focus();
        }}
        onChange={(event) => {
          setInvalid(false);
          update({ ...draft, start: event.target.value });
        }}
      />
      {invalid && (
        <span id="connection-date-error" role="alert">
          {t.dateError}
        </span>
      )}
    </label>
  );
}
function ConnectionTest({
  t,
  result,
  setResult,
  testError,
  setTestError,
}: Readonly<{
  t: ConnectionWords;
  result: 'idle' | 'passed' | 'failed';
  setResult: (value: 'idle' | 'passed' | 'failed') => void;
  testError: boolean;
  setTestError: (value: boolean) => void;
}>) {
  const retry = () => {
    setTestError(false);
    setResult('passed');
    document.getElementById('connection-test')?.focus();
  };
  return (
    <>
      <button
        id="connection-test"
        type="button"
        className="quiet"
        onClick={() => setResult(testError ? 'failed' : 'passed')}
      >
        {t.test}
      </button>
      <ConnectionResult result={result} t={t} retry={retry} />
      <details className="demo-scenarios">
        <summary>{t.result}</summary>
        <label>
          {t.result}
          <select
            value={testError ? 'error' : 'success'}
            onChange={(event) => {
              setTestError(event.target.value === 'error');
              setResult('idle');
            }}
          >
            <option value="success">{t.success}</option>
            <option value="error">{t.error}</option>
          </select>
        </label>
      </details>
    </>
  );
}

function ConnectionAccess({ t }: Readonly<{ t: ConnectionWords }>) {
  return (
    <div className="demo-field-group">
      <p className="demo-note">{t.rights}</p>
      <label>
        {t.token}
        <input readOnly value="demo-token-••••••••" />
      </label>
    </div>
  );
}
