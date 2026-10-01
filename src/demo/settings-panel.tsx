import { useState } from 'react';
import { WidgetPreview } from '../events/WidgetPreview.tsx';
import { DemoModal } from './modal';
import { DemoStateSettings } from './settings-display';
import { SettingsGroups, settingName } from './settings-layout';
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
      <SettingsGroups
        {...props}
        text={text}
        open={setKind}
        lockStatus={
          <LockStatus
            locked={value.locked}
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
        }
        recoveryStatus={<RecoveryStatus recorded={value.recorded} text={text} />}
      />
      <details className="demo-scenarios">
        <summary>{text('Сценарии макета', 'Mockup scenarios')}</summary>
        <DemoStateSettings {...props} text={text} />
      </details>
      <WidgetPreview language={props.language} hidden={props.hidden} />
      {kind && (
        <SettingsDialog
          {...props}
          kind={kind}
          text={text}
          value={value}
          update={update}
          onClose={() => setKind(null)}
        />
      )}
    </div>
  );
}

function SettingsDialog(props: ModalProps) {
  return (
    <DemoModal
      id="settings-dialog"
      title={settingName(props.text, props.kind)}
      language={props.language}
      onClose={props.onClose}
    >
      <SettingsModalBody {...props} />
    </DemoModal>
  );
}

function LockStatus({
  locked,
  text,
  unlock,
}: Readonly<{ locked: boolean; text: SettingText; unlock: () => void }>) {
  return locked ? (
    <LockExample text={text} unlock={unlock} />
  ) : (
    <p className="demo-note">
      {text('Пример открыт · защиты нет.', 'Sample unlocked · no protection.')}
    </p>
  );
}

function RecoveryStatus({ recorded, text }: Readonly<{ recorded: boolean; text: SettingText }>) {
  return (
    <p className="demo-note">
      {recorded
        ? text(
            'Запись ключа подтверждена в примере.',
            'Recording the key is confirmed in this sample.',
          )
        : text(
            'Ключ восстановления ещё не отмечен как записанный.',
            'The recovery key is not marked as recorded.',
          )}
    </p>
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
        {text('Разблокировать', 'Unlock')}
      </button>
    </section>
  );
}
