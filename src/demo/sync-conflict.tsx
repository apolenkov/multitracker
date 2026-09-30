import { useState } from 'react';
import { DemoModal } from './modal';
import type { SyncWords, Version } from './sync-text';

type Props = Readonly<{
  language: 'ru' | 'en';
  t: SyncWords;
  close: () => void;
  confirm: (version: Version) => void;
}>;
export function SyncConflict({ language, t, close, confirm }: Props) {
  const [chosen, setChosen] = useState<Version>('local');
  return (
    <DemoModal id="sync-conflict" title={t.conflict} language={language} onClose={close}>
      <p className="demo-note">{t.warning}</p>
      <ConflictPreview t={t} />
      <fieldset className="conflict-choices">
        <legend>{t.choose}</legend>
        <label className="check-row">
          <input
            type="radio"
            name="conflict-version"
            value="local"
            checked={chosen === 'local'}
            onChange={() => setChosen('local')}
          />
          {t.local}
        </label>
        <label className="check-row">
          <input
            type="radio"
            name="conflict-version"
            value="remote"
            checked={chosen === 'remote'}
            onChange={() => setChosen('remote')}
          />
          {t.remote}
        </label>
      </fieldset>
      <p>
        {t.selected}: {chosen === 'local' ? t.local : t.remote}
      </p>
      <div className="dialog-actions">
        <button className="quiet" onClick={close}>
          {t.cancel}
        </button>
        <button onClick={() => confirm(chosen)}>{t.confirm}</button>
      </div>
    </DemoModal>
  );
}
function ConflictPreview({ t }: Readonly<{ t: SyncWords }>) {
  return (
    <section className="conflict-preview" aria-label={t.conflict}>
      <div className="conflict-times">
        <p>
          <strong>{t.local}</strong>
          <span>{t.localTime}</span>
        </p>
        <p>
          <strong>{t.remote}</strong>
          <span>{t.remoteTime}</span>
        </p>
      </div>
      <ConflictField name={t.name} local={t.localName} remote={t.remoteName} t={t} />
      <ConflictField name={t.label} local={t.localLabel} remote={t.remoteLabel} t={t} />
    </section>
  );
}
function ConflictField({
  name,
  local,
  remote,
  t,
}: Readonly<{
  name: string;
  local: string;
  remote: string;
  t: SyncWords;
}>) {
  return (
    <div className="conflict-field">
      <h3>{name}</h3>
      <dl>
        <div>
          <dt>{t.local}</dt>
          <dd>{local}</dd>
        </div>
        <div>
          <dt>{t.remote}</dt>
          <dd>{remote}</dd>
        </div>
      </dl>
    </div>
  );
}
