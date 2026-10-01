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
      <fieldset className="conflict-choices">
        <legend>{t.choose}</legend>
        <table className="conflict-table">
          <thead>
            <tr>
              <td>
                <span className="visually-hidden">{t.field}</span>
              </td>
              <VersionHead
                version="local"
                label={t.local}
                time={t.localTime}
                {...{ chosen, setChosen }}
              />
              <VersionHead
                version="remote"
                label={t.remote}
                time={t.remoteTime}
                {...{ chosen, setChosen }}
              />
            </tr>
          </thead>
          <ConflictRows t={t} />
        </table>
      </fieldset>
      <div className="dialog-actions">
        <button className="quiet" onClick={close}>
          {t.cancel}
        </button>
        <button className="primary" onClick={() => confirm(chosen)}>
          {t.confirm}
        </button>
      </div>
    </DemoModal>
  );
}
function ConflictRows({ t }: Readonly<{ t: SyncWords }>) {
  return (
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
  );
}
function VersionHead({
  version,
  label,
  time,
  chosen,
  setChosen,
}: Readonly<{
  version: Version;
  label: string;
  time: string;
  chosen: Version;
  setChosen: (version: Version) => void;
}>) {
  return (
    <th scope="col">
      <label className="check-row">
        <input
          type="radio"
          name="conflict-version"
          value={version}
          checked={chosen === version}
          onChange={() => setChosen(version)}
        />
        {label}
      </label>
      <span>{time}</span>
    </th>
  );
}
