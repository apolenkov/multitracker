import { useState } from 'react';
import { DemoModal } from './modal';
import { ConnectionForm } from './connection-form';
import { demoState } from '../model/portfolio';
import { accountLabel } from '../forms/accounts';
import { Icon } from '../Icon.tsx';
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
  const save = (value: Connection) => {
    setConfigured([...configured.filter((item) => item.provider !== value.provider), value]);
    setEditing(null);
    notify(t.saved);
  };
  // Отключение сразу; «Отменить» в сообщении возвращает прежние настройки источника.
  const disconnect = (value: Connection) => {
    setConfigured((current) => current.filter((item) => item.provider !== value.provider));
    notify(t.removed, () => setConfigured((current) => [...current, value]));
  };
  return (
    <div className="demo-panel connection-list">
      {providers.map((provider) => (
        <ConnectionCard
          key={provider}
          provider={provider}
          {...localeProps}
          value={configured.find((item) => item.provider === provider)}
          edit={() => setEditing(provider)}
          remove={disconnect}
        />
      ))}
      <ConnectionPrivacy language={language} t={t} />
      {editing !== null && (
        <EditConnection
          {...localeProps}
          provider={editing}
          initial={configured.find((item) => item.provider === editing)}
          save={save}
          close={() => setEditing(null)}
        />
      )}
    </div>
  );
}
function ConnectionPrivacy({
  language,
  t,
}: Readonly<{ language: 'ru' | 'en'; t: ConnectionWords }>) {
  return (
    <>
      <p className="demo-note">{t.onlyDemo}</p>
      <details className="connection-privacy">
        <summary>{language === 'ru' ? 'Приватность подключений' : 'Connection privacy'}</summary>
        <p>{t.privacy}</p>
      </details>
    </>
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
  remove: (value: Connection) => void;
}>) {
  const portfolio = demoState.portfolios.find((item) => item.id === value?.portfolio);
  return (
    <article className="connection-row">
      <ProviderLogo provider={provider} />
      <div className="connection-summary">
        <h2>{providerLabel(provider, t)}</h2>
        <p>{value ? t.configured : t.disconnected}</p>
        {value && (
          <p>
            {t.destination}: {portfolio?.name} · {accountLabel(value.account, language)} ·{' '}
            {t.history}: {value.start}
          </p>
        )}
      </div>
      <div className="connection-actions">
        <button onClick={edit}>{value ? t.edit : t.configure}</button>
        {value && (
          <button
            className="danger"
            aria-label={`${t.disconnect}: ${providerLabel(provider, t)}`}
            onClick={() => remove(value)}
          >
            {t.disconnect}
          </button>
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
function ProviderLogo({ provider }: Readonly<{ provider: string }>) {
  const mark = new Map([
    ['Tradernet', 'T'],
    ['Binance', 'BN'],
    ['Bybit', 'BY'],
  ]).get(provider);
  return (
    <span className="provider-logo" data-provider={provider} aria-hidden="true">
      {mark ?? <Icon name={provider === 'wallet' ? 'portfolios' : 'connections'} />}
    </span>
  );
}
