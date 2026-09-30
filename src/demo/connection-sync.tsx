import { useState } from 'react';
import { DemoModal } from './modal';
import { ConnectionForm } from './connection-form';
import { demoState } from '../model/portfolio';
import { accountLabel } from '../forms/accounts';
import {
  connectionText,
  providerLabel,
  providers,
  type Connection,
  type ConnectionProps,
  type ConnectionWords,
} from './connection-text';
export { SyncPanel } from './sync-panel';

export function ConnectionsPanel({ language, notify }: ConnectionProps) {
  const t = language === 'ru' ? connectionText.ru : connectionText.en;
  const localeProps = { language, t };
  const [configured, setConfigured] = useState<readonly Connection[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const save = (value: Connection) => {
    setConfigured([...configured.filter((item) => item.provider !== value.provider), value]);
    setEditing(null);
    notify(t.saved);
  };
  const disconnect = () => {
    setConfigured(configured.filter((item) => item.provider !== removing));
    setRemoving(null);
    notify(t.removed);
  };
  return (
    <div className="demo-panel connection-list">
      <p className="demo-note">{t.onlyDemo}</p>
      {providers.map((provider) => (
        <ConnectionCard
          key={provider}
          provider={provider}
          {...localeProps}
          value={configured.find((item) => item.provider === provider)}
          edit={() => setEditing(provider)}
          remove={() => setRemoving(provider)}
        />
      ))}
      <p className="demo-note">{t.privacy}</p>
      {editing !== null && (
        <EditConnection
          {...localeProps}
          provider={editing}
          initial={configured.find((item) => item.provider === editing)}
          save={save}
          close={() => setEditing(null)}
        />
      )}
      {removing !== null && (
        <RemoveConnection
          {...localeProps}
          provider={removing}
          disconnect={disconnect}
          close={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
function ConnectionCard({
  provider,
  language,
  value,
  t,
  edit,
  remove,
}: Readonly<{
  provider: string;
  language: 'ru' | 'en';
  value: Connection | undefined;
  t: ConnectionWords;
  edit: () => void;
  remove: () => void;
}>) {
  const portfolio = demoState.portfolios.find((item) => item.id === value?.portfolio);
  return (
    <article>
      <div className="connection-summary">
        <h2>{providerLabel(provider, t)}</h2>
        <p>{value ? t.configured : t.disconnected}</p>
        {value && (
          <p>
            {t.destination}: {portfolio?.name} · {accountLabel(value.account, language)} ·{' '}
            {t.history}: {value.start}
          </p>
        )}
        <p>{t.rights}</p>
      </div>
      <div className="sync-actions">
        <button onClick={edit}>{value ? t.edit : t.configure}</button>
        {value && (
          <details>
            <summary>{t.more}</summary>
            <button className="quiet" onClick={remove}>
              {t.disconnect}
            </button>
          </details>
        )}
      </div>
    </article>
  );
}

type ModalProps = Readonly<{
  language: 'ru' | 'en';
  t: ConnectionWords;
  provider: string;
  close: () => void;
}>;
function EditConnection({
  language,
  t,
  provider,
  close,
  initial,
  save,
}: ModalProps &
  Readonly<{
    initial: Connection | undefined;
    save: (value: Connection) => void;
  }>) {
  return (
    <DemoModal
      id="connection-config"
      language={language}
      title={providerLabel(provider, t)}
      onClose={close}
    >
      <ConnectionForm
        provider={provider}
        language={language}
        t={t}
        onSave={save}
        onCancel={close}
        initial={initial}
      />
    </DemoModal>
  );
}
function RemoveConnection({
  language,
  t,
  provider,
  close,
  disconnect,
}: ModalProps &
  Readonly<{
    disconnect: () => void;
  }>) {
  return (
    <DemoModal id="connection-remove" language={language} title={t.disconnectTitle} onClose={close}>
      <p>
        {providerLabel(provider, t)} — {t.disconnectInfo}
      </p>
      <div className="dialog-actions">
        <button className="quiet" onClick={close}>
          {t.cancel}
        </button>
        <button onClick={disconnect}>{t.disconnect}</button>
      </div>
    </DemoModal>
  );
}
