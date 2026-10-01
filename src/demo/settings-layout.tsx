import type { ReactNode } from 'react';
import { Icon } from '../Icon.tsx';
import { CurrencySettings, LocaleSettings, type SettingText } from './settings-display';
import type { Kind } from './settings-panel';
import type { Props } from './words';

type GroupProps = Props &
  Readonly<{
    text: SettingText;
    open: (kind: Kind) => void;
    lockStatus: ReactNode;
    recoveryStatus: ReactNode;
  }>;

export function SettingsGroups(props: GroupProps) {
  return (
    <div className="settings-groups">
      <section className="settings-group">
        <h2>{props.text('Оформление', 'Appearance')}</h2>
        <LocaleSettings {...props} />
        <SettingLink kind="display" {...props} />
      </section>
      <section className="settings-group">
        <h2>{props.text('Валюты', 'Currencies')}</h2>
        <CurrencySettings {...props} />
      </section>
      <section className="settings-group">
        <h2>{props.text('Данные и устройства', 'Data and devices')}</h2>
        <p className="demo-note">
          {props.text('Только примеры: файлы не создаются.', 'Samples only: no files are created.')}
        </p>
        {(['notifications', 'backup', 'export'] as const).map((kind) => (
          <SettingLink key={kind} kind={kind} {...props} />
        ))}
      </section>
      <section className="settings-group">
        <h2>{props.text('Приватность', 'Privacy')}</h2>
        <HiddenSetting {...props} />
        <SettingLink kind="privacy" {...props}>
          {props.lockStatus}
        </SettingLink>
        <SettingLink kind="recovery" {...props}>
          {props.recoveryStatus}
        </SettingLink>
        <SettingLink kind="delete" {...props} />
      </section>
    </div>
  );
}

function SettingLink({
  kind,
  text,
  open,
  children,
}: Pick<GroupProps, 'text' | 'open'> & Readonly<{ kind: Kind; children?: ReactNode }>) {
  return (
    <div className="setting-row">
      <button id={`settings-open-${kind}`} className="setting-link" onClick={() => open(kind)}>
        <span>{settingName(text, kind)}</span>
        <Icon name="chevron" />
      </button>
      {children}
    </div>
  );
}

function HiddenSetting(props: Props & Readonly<{ text: SettingText }>) {
  return (
    <label className="check-row">
      <input
        id="settings-hidden"
        type="checkbox"
        checked={props.hidden}
        onChange={(event) => props.onHidden(event.target.checked)}
      />
      {props.text('Скрыть суммы', 'Hide balances')}
    </label>
  );
}

export function settingName(text: SettingText, kind: Kind) {
  if (kind === 'display') return text('Плотность интерфейса', 'Interface density');
  if (kind === 'notifications') return text('Уведомления', 'Notifications');
  if (kind === 'privacy') return text('Блокировка примера', 'Sample lock');
  if (kind === 'recovery') return text('Ключ восстановления', 'Recovery key');
  if (kind === 'backup') return text('Резервная копия и восстановление', 'Backup and restore');
  if (kind === 'export') return text('Экспорт данных', 'Export data');
  return text('Удаление данных', 'Delete data');
}
