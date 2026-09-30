import { useState } from 'react';
import { DemoModal } from './modal';
import { SyncConflict } from './sync-conflict';
import { syncText, type SyncWords, type Version } from './sync-text';
import type { ConnectionProps } from './connection-text';

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
    <div className="demo-panel">
      <p className="demo-note">{t.onlyDemo}</p>
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
      <SyncDevices language={language} t={t} notify={notify} />
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
      <details>
        <summary>{t.more}</summary>
        <label className="check-row">
          <input
            type="checkbox"
            checked={error}
            onChange={(event) => setError(event.target.checked)}
          />
          {t.simulate}
        </label>
      </details>
      <button id="sync-run" onClick={() => run(error)}>
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
    </div>
  );
}
function SyncDevices({
  language,
  t,
  notify,
}: Readonly<{
  language: 'ru' | 'en';
  t: SyncWords;
  notify: (message: string) => void;
}>) {
  const [revoked, setRevoked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const revoke = () => {
    setRevoked(true);
    setConfirmOpen(false);
    notify(t.revoked);
  };
  return (
    <section className="sync-devices">
      <h2>{t.devices}</h2>
      <article>
        <h3>{t.desktop}</h3>
        <p>{t.current}</p>
        <p>{t.activity}</p>
      </article>
      <article>
        <h3>{t.mobile}</h3>
        <p>{revoked ? t.revoked : t.activity}</p>
        {!revoked && (
          <details>
            <summary>{t.more}</summary>
            <button className="quiet" onClick={() => setConfirmOpen(true)}>
              {t.revoke}
            </button>
          </details>
        )}
      </article>
      {confirmOpen && (
        <RevokeDevice
          language={language}
          t={t}
          close={() => setConfirmOpen(false)}
          revoke={revoke}
        />
      )}
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
    <>
      <label className="check-row">
        <input
          type="checkbox"
          checked={automatic}
          onChange={(event) => toggle(event.target.checked)}
        />
        {t.automatic}
      </label>
      <p>
        {t.last}: {lastSync ?? t.never}
      </p>
      <p role="status">{text}</p>
    </>
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
function RevokeDevice({
  language,
  t,
  close,
  revoke,
}: Readonly<{
  language: 'ru' | 'en';
  t: SyncWords;
  close: () => void;
  revoke: () => void;
}>) {
  return (
    <DemoModal id="sync-revoke" title={t.revokeTitle} language={language} onClose={close}>
      <p>{t.revokeInfo}</p>
      <div className="dialog-actions">
        <button className="quiet" onClick={close}>
          {t.cancel}
        </button>
        <button onClick={revoke}>{t.revoke}</button>
      </div>
    </DemoModal>
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
