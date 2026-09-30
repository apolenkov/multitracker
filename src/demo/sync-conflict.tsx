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
      <p>{t.warning}</p>
      <ConflictPreview t={t} />
      <fieldset>
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
    <div
      className="conflict-preview table-scroll"
      tabIndex={0}
      role="region"
      aria-label={t.conflict}
    >
      <table>
        <caption>{t.conflict}</caption>
        <thead>
          <tr>
            <th scope="col">{t.field}</th>
            <th scope="col">
              {t.local}
              <br />
              {t.localTime}
            </th>
            <th scope="col">
              {t.remote}
              <br />
              {t.remoteTime}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{t.name}</th>
            <td>{t.localName}</td>
            <td>{t.remoteName}</td>
          </tr>
          <tr>
            <th scope="row">{t.label}</th>
            <td>{t.localLabel}</td>
            <td>{t.remoteLabel}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
