import { BackupSettings, DeleteSettings, ExportSettings } from './settings-data';
import { DisplaySettings, NotificationSettings } from './settings-display';
import { PrivacySettings, RecoverySettings } from './settings-privacy';
import type { ModalProps } from './settings-panel';

export function SettingsModalBody(props: ModalProps) {
  const complete = (message: string) => {
    props.notify(message);
    props.onClose();
  };
  const saved = () =>
    complete(
      props.text(
        'Настройки примера применены в этой вкладке.',
        'Sample preferences applied in this tab.',
      ),
    );
  if (props.kind === 'display' || props.kind === 'notifications')
    return <AppearanceBody {...props} saved={saved} />;
  if (props.kind === 'privacy' || props.kind === 'recovery')
    return <PrivacyBody {...props} saved={saved} />;
  return <DataBody {...props} complete={complete} />;
}

function AppearanceBody(props: ModalProps & Readonly<{ saved: () => void }>) {
  const saved = props.saved;
  if (props.kind === 'display')
    return (
      <DisplaySettings
        {...props}
        onSave={(density) => {
          props.onDensity(density);
          saved();
        }}
      />
    );
  return (
    <NotificationSettings
      {...props}
      value={props.value.notifications}
      onSave={(notifications) => {
        props.update({ notifications });
        saved();
      }}
    />
  );
}

function PrivacyBody(props: ModalProps & Readonly<{ saved: () => void }>) {
  const saved = props.saved;
  if (props.kind === 'privacy')
    return (
      <PrivacySettings
        {...props}
        locked={props.value.locked}
        onLock={(locked) => {
          props.update({ locked });
          saved();
        }}
      />
    );
  return (
    <RecoverySettings
      {...props}
      recorded={props.value.recorded}
      onRecord={(recorded) => {
        props.update({ recorded });
        saved();
      }}
    />
  );
}

function DataBody(props: ModalProps & Readonly<{ complete: (message: string) => void }>) {
  const complete = props.complete;
  if (props.kind === 'backup')
    return (
      <BackupSettings
        {...props}
        reminder={props.value.reminder}
        onSave={(reminder, message) => {
          props.update({ reminder });
          complete(message);
        }}
      />
    );
  if (props.kind === 'export') return <ExportSettings {...props} onSave={complete} />;
  return (
    <DeleteSettings
      {...props}
      onDelete={() =>
        complete(
          props.text(
            'Демонстрация удаления завершена. Учебные данные сохранены.',
            'Deletion sample complete. Demo data is kept.',
          ),
        )
      }
    />
  );
}
