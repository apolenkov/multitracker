import { BackupSettings, DeleteSettings, ExportSettings } from './settings-data';
import { NotificationSettings } from './settings-display';
import { RecoverySettings } from './settings-privacy';
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
  if (props.kind === 'notifications')
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
  if (props.kind === 'recovery')
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
  return <DataBody {...props} complete={complete} />;
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
