import { useState } from 'react';
import { DemoModal } from './modal';
import { DemoStateSettings, LocaleSettings } from './settings-display';
import type { Notifications, SettingText } from './settings-display';
import { SettingsModalBody } from './settings-dialogs';
import type { Density, Props } from './words';

export type Kind =
  'display' | 'notifications' | 'privacy' | 'recovery' | 'backup' | 'export' | 'delete';
export type Preferences = Readonly<{
  notifications: Notifications;
  locked: boolean;
  recorded: boolean;
  reminder: boolean;
}>;
type SettingsProps = Props &
  Readonly<{
    density: Density;
    onDensity: (value: Density) => void;
    notify: (message: string) => void;
  }>;
export type ModalProps = SettingsProps &
  Readonly<{
    kind: Kind;
    text: SettingText;
    value: Preferences;
    onClose: () => void;
    update: (patch: Partial<Preferences>) => void;
  }>;

export function SettingsPanel(props: SettingsProps) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [value, setValue] = usePreferences();
  const text: SettingText = (ru, en) => (props.language === 'ru' ? ru : en);
  const update = (patch: Partial<Preferences>) => setValue((current) => ({ ...current, ...patch }));
  return (
    <div className="demo-panel settings-panel">
      <LocaleSettings {...props} text={text} />
      <p>
        {text(
          'Настройки действуют в этой вкладке. Данные никуда не отправляются.',
          'Preferences last in this tab. No data is sent anywhere.',
        )}
      </p>
      <SettingLinks text={text} open={setKind} />
      <PrivacyStatus
        value={value}
        text={text}
        unlock={() => {
          document.getElementById('settings-open-privacy')?.focus();
          update({ locked: false });
          props.notify(
            text(
              'Учебный экран разблокирован без проверки личности.',
              'Sample screen unlocked without an identity check.',
            ),
          );
        }}
      />
      <DemoStateSettings {...props} text={text} />
      {kind && (
        <DemoModal
          id="settings-dialog"
          title={settingName(text, kind)}
          language={props.language}
          onClose={() => setKind(null)}
        >
          <SettingsModalBody
            {...props}
            kind={kind}
            text={text}
            value={value}
            update={update}
            onClose={() => setKind(null)}
          />
        </DemoModal>
      )}
    </div>
  );
}

function SettingLinks({ text, open }: Readonly<{ text: SettingText; open: (kind: Kind) => void }>) {
  return (
    <div className="option-links">
      {(
        ['display', 'notifications', 'privacy', 'recovery', 'backup', 'export', 'delete'] as const
      ).map((kind) => (
        <button
          id={`settings-open-${kind}`}
          className="quiet"
          key={kind}
          onClick={() => open(kind)}
        >
          {settingName(text, kind)}
        </button>
      ))}
    </div>
  );
}

function settingName(text: SettingText, kind: Kind) {
  if (kind === 'display') return text('Отображение', 'Display');
  if (kind === 'notifications') return text('Уведомления', 'Notifications');
  if (kind === 'privacy') return text('Блокировка примера', 'Sample lock');
  if (kind === 'recovery') return text('Ключ восстановления', 'Recovery key');
  if (kind === 'backup') return text('Резервная копия и восстановление', 'Backup and restore');
  if (kind === 'export') return text('Экспорт данных', 'Export data');
  return text('Удаление данных', 'Delete data');
}

function PrivacyStatus({
  value,
  text,
  unlock,
}: Readonly<{ value: Preferences; text: SettingText; unlock: () => void }>) {
  return (
    <section>
      {value.locked ? (
        <LockExample text={text} unlock={unlock} />
      ) : (
        <p>{text('Учебный экран открыт.', 'Sample screen unlocked.')}</p>
      )}
      <p>
        {value.recorded
          ? text(
              'Запись ключа подтверждена в примере.',
              'Recording the key is confirmed in this sample.',
            )
          : text(
              'Ключ восстановления ещё не отмечен как записанный.',
              'The recovery key is not marked as recorded.',
            )}
      </p>
    </section>
  );
}

function usePreferences() {
  return useState<Preferences>({
    notifications: { price: false, sync: true, backup: true, channel: 'app' },
    locked: false,
    recorded: false,
    reminder: true,
  });
}

function LockExample({ text, unlock }: Readonly<{ text: SettingText; unlock: () => void }>) {
  return (
    <section className="demo-note settings-lock-preview" aria-labelledby="settings-lock-title">
      <h2 id="settings-lock-title">
        {text('Пример заблокированного экрана', 'Locked screen sample')}
      </h2>
      <p>
        {text(
          'Ваши портфели скрыты на этом учебном экране. Весь макет остаётся доступным: настоящей защиты здесь нет.',
          'Portfolios are hidden in this sample screen. The rest of the mockup remains accessible: no real protection is provided.',
        )}
      </p>
      <button className="primary" onClick={unlock}>
        {text('Разблокировать пример', 'Unlock sample')}
      </button>
    </section>
  );
}
