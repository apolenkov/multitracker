import { useState } from 'react';
import { SyncConflict } from './sync-conflict';
import { syncText, type SyncWords, type Version } from './sync-text';
import type { ConnectionProps } from './connection-text';
import { RowNotice, undoneText } from '../RowActions.tsx';
import { focusMain } from '../navigation.ts';

type ConflictState = Readonly<{ open: boolean; selected: Version | null }>;

export function SyncPanel({ language, notify }: ConnectionProps) {
  const t = language === 'ru' ? syncText.ru : syncText.en;
  const [automatic, setAutomatic] = useState(false);
  const [simulateError, setSimulateError] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState>({ open: false, selected: null });
  const run = (error: boolean) => {
    setStatus(error ? 'error' : 'success');
    if (!error) setLastSync('2026-09-30 10:30 UTC');
    notify(error ? t.error : t.success);
  };
  const confirm = (version: Version) => {
    setConflict({ open: false, selected: version });
    notify(t.resolved);
  };
  return (
    <div className="demo-panel sync-panel">
      <SyncStatus
        t={t}
        automatic={automatic}
        lastSync={lastSync}
        status={status}
        toggle={(value) => {
          setAutomatic(value);
          notify(value ? t.enabled : t.disabled);
        }}
      />
      <SyncActions
        t={t}
        error={simulateError}
        setError={setSimulateError}
        status={status}
        run={run}
      />
      <SyncDevices t={t} language={language} notify={notify} />
      <SyncConflictArea
        language={language}
        t={t}
        conflict={conflict}
        update={setConflict}
        confirm={confirm}
      />
    </div>
  );
}
function SyncActions({
  t,
  error,
  setError,
  status,
  run,
}: Readonly<{
  t: SyncWords;
  error: boolean;
  setError: (value: boolean) => void;
  status: 'idle' | 'success' | 'error';
  run: (error: boolean) => void;
}>) {
  return (
    <div className="sync-actions">
      <button className="primary" id="sync-run" onClick={() => run(error)}>
        {t.manual}
      </button>
      {status === 'error' && (
        <button
          className="quiet"
          onClick={() => {
            setError(false);
            run(false);
            document.getElementById('sync-run')?.focus();
          }}
        >
          {t.retry}
        </button>
      )}
      <details>
        <summary>{t.mode}</summary>
        <label className="check-row">
          <input
            type="checkbox"
            checked={error}
            onChange={(event) => setError(event.target.checked)}
          />
          {t.simulate}
        </label>
      </details>
      <p className="demo-note">{t.onlyDemo}</p>
    </div>
  );
}
function SyncDevices({
  t,
  language,
  notify,
}: Readonly<{
  t: SyncWords;
  language: 'ru' | 'en';
  notify: (message: string) => void;
}>) {
  const [revoked, setRevoked] = useState(false);
  // Отзыв выполняется сразу: строка остаётся под встроенным «Отменить», которое возвращает доступ.
  const revoke = () => {
    setRevoked(true);
    notify(t.revoked);
  };
  const restore = () => {
    setRevoked(false);
    notify(undoneText(language));
    focusMain({ preventScroll: true });
  };
  return (
    <section className="sync-devices">
      <h2>{t.devices}</h2>
      <article>
        <h3>{t.desktop}</h3>
        <p>{t.current}</p>
        <p>{t.activity}</p>
      </article>
      <article className={revoked ? 'row-removed' : undefined}>
        <h3>{t.mobile}</h3>
        <p>{t.activity}</p>
        <button
          type="button"
          className="danger"
          id="sync-revoke-mobile"
          aria-label={`${t.revoke}: ${t.mobile}`}
          onClick={revoke}
        >
          {t.revoke}
        </button>
        {revoked && <RowNotice text={t.revoked} language={language} onUndo={restore} />}
      </article>
    </section>
  );
}
function SyncStatus({
  t,
  automatic,
  lastSync,
  status,
  toggle,
}: Readonly<{
  t: SyncWords;
  automatic: boolean;
  lastSync: string | null;
  status: 'idle' | 'success' | 'error';
  toggle: (value: boolean) => void;
}>) {
  const text = status === 'idle' ? t.idle : status === 'error' ? t.error : t.success;
  return (
    <div className="sync-status">
      <p role="status" className={`sync-state sync-state-${status}`}>
        {text}
      </p>
      <p className="demo-note">
        {t.last}: {lastSync ?? t.never}
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={automatic}
          onChange={(event) => toggle(event.target.checked)}
        />
        {t.automatic}
      </label>
    </div>
  );
}
function ConflictSummary({
  t,
  selected,
  open,
}: Readonly<{
  t: SyncWords;
  selected: Version | null;
  open: () => void;
}>) {
  return (
    <section className="sync-actions">
      <h2>{t.conflict}</h2>
      {selected !== null && (
        <p>
          {t.resolved} {t.selected}: {selected === 'local' ? t.local : t.remote}
        </p>
      )}
      <button className="quiet" onClick={open}>
        {t.compare}
      </button>
    </section>
  );
}
function SyncConflictArea({
  language,
  t,
  conflict,
  update,
  confirm,
}: Readonly<{
  language: 'ru' | 'en';
  t: SyncWords;
  conflict: ConflictState;
  update: (value: ConflictState) => void;
  confirm: (version: Version) => void;
}>) {
  return (
    <>
      <ConflictSummary
        t={t}
        selected={conflict.selected}
        open={() => update({ ...conflict, open: true })}
      />
      {conflict.open && (
        <SyncConflict
          language={language}
          t={t}
          close={() => update({ ...conflict, open: false })}
          confirm={confirm}
        />
      )}
    </>
  );
}
