import { useState } from 'react';
import { DemoModal } from './modal';
import { ConnectionForm } from './connection-form';
import { demoState } from '../model/portfolio';
import { accountLabel } from '../forms/accounts';
import { Icon } from '../Icon.tsx';
import { RowNotice, undoneText } from '../RowActions.tsx';
import { focusMain } from '../navigation.ts';
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
  const { configured, dropped, editing, setEditing, save, disconnect, restore } = useConnections(
    language,
    t,
    notify,
  );
  return (
    <div className="demo-panel connection-list">
      {providers.map((provider) => (
        <ConnectionCard
          key={provider}
          provider={provider}
          {...localeProps}
          value={dropped.get(provider) ?? configured.find((item) => item.provider === provider)}
          dropped={dropped.has(provider)}
          edit={() => setEditing(provider)}
          remove={disconnect}
          restore={() => restore(provider)}
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

function useConnections(
  language: 'ru' | 'en',
  t: ConnectionWords,
  notify: (message: string) => void,
) {
  const [configured, setConfigured] = useState<readonly Connection[]>([]);
  const [dropped, setDropped] = useState<ReadonlyMap<string, Connection>>(new Map());
  const [editing, setEditing] = useState<string | null>(null);
  const save = (value: Connection) => {
    setConfigured([...configured.filter((item) => item.provider !== value.provider), value]);
    setEditing(null);
    notify(t.saved);
  };
  // Отключение сразу: строка остаётся под встроенным «Отменить», которое возвращает настройки.
  const disconnect = (value: Connection) => {
    setConfigured((current) => current.filter((item) => item.provider !== value.provider));
    setDropped((current) => new Map([...current, [value.provider, value]]));
    notify(t.removed);
  };
  const restore = (provider: string) => {
    const value = dropped.get(provider);
    if (value) setConfigured((current) => [...current, value]);
    setDropped((current) => new Map([...current].filter(([key]) => key !== provider)));
    notify(undoneText(language));
    focusMain({ preventScroll: true });
  };
  return { configured, dropped, editing, setEditing, save, disconnect, restore };
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
  dropped,
  t,
  edit,
  remove,
  restore,
}: Readonly<{
  provider: string;
  language: 'ru' | 'en';
  value: Connection | undefined;
  dropped: boolean;
  t: ConnectionWords;
  edit: () => void;
  remove: (value: Connection) => void;
  restore: () => void;
}>) {
  const portfolio = demoState.portfolios.find((item) => item.id === value?.portfolio);
  return (
    <article className={dropped ? 'connection-row row-removed' : 'connection-row'}>
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
      {dropped && <RowNotice text={t.removedRow} language={language} onUndo={restore} />}
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
