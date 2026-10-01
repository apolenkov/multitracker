import { useState } from 'react';
import { SettingsActions, type SettingFormProps } from './settings-display';

export function BackupSettings(
  props: SettingFormProps &
    Readonly<{
      reminder: boolean;
      onSave: (reminder: boolean, message: string) => void;
    }>,
) {
  const [reminder, setReminder] = useState(props.reminder);
  const [preview, setPreview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!preview || confirmed)
          props.onSave(
            reminder,
            props.text(
              'Демонстрация завершена. Файл и портфели не изменены.',
              'Sample complete. Files and portfolios stay unchanged.',
            ),
          );
      }}
    >
      <BackupControls
        {...props}
        reminder={reminder}
        onReminder={setReminder}
        onPreview={() => {
          setPreview(true);
          setConfirmed(false);
        }}
      />
      {preview && <RestorePreview {...props} confirmed={confirmed} onConfirm={setConfirmed} />}
      {preview && !confirmed && (
        <p>
          {props.text(
            'Для завершения подтвердите замену учебного пространства.',
            'Confirm replacing the sample workspace to continue.',
          )}
        </p>
      )}
      <BackupActions {...props} preview={preview} confirmed={confirmed} />
    </form>
  );
}

function RestorePreview(
  props: SettingFormProps & Readonly<{ confirmed: boolean; onConfirm: (value: boolean) => void }>,
) {
  return (
    <section className="demo-note">
      <h3>{props.text('Восстановление', 'Restore')}</h3>
      <p>
        {props.text(
          'Версия 1 совместима. Tradernet, Binance, Bybit; 3 операции. В настоящем приложении восстановление заменит текущие данные.',
          'Version 1 is compatible. Tradernet, Binance, Bybit; 3 transactions. Real restore will replace current data.',
        )}
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={props.confirmed}
          onChange={(event) => props.onConfirm(event.target.checked)}
        />
        {props.text(
          'Я понимаю, что текущие данные будут заменены',
          'I understand current data will be replaced',
        )}
      </label>
    </section>
  );
}

function BackupControls(
  props: SettingFormProps &
    Readonly<{
      reminder: boolean;
      onReminder: (value: boolean) => void;
      onPreview: () => void;
      onSave: (reminder: boolean, message: string) => void;
    }>,
) {
  return (
    <>
      <p>
        {props.text(
          'Резервная копия: вымышленный набор версии 1, 3 портфеля, 3 операции. Настоящего файла и шифрования нет.',
          'Backup: fixed version 1 sample, 3 portfolios, 3 transactions. No real file or encryption.',
        )}
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={props.reminder}
          onChange={(event) => props.onReminder(event.target.checked)}
        />
        {props.text('Напоминать о резервной копии', 'Remind me to back up')}
      </label>
      <button
        type="button"
        onClick={() =>
          props.onSave(
            props.reminder,
            props.text(
              'Пример резервной копии подготовлен. Файл не создаётся.',
              'Backup sample prepared. No file is created.',
            ),
          )
        }
      >
        {props.text('Создать копию', 'Create backup')}
      </button>
      <button type="button" className="quiet" onClick={props.onPreview}>
        {props.text('Предпросмотр восстановления', 'Preview restore')}
      </button>
    </>
  );
}

function BackupActions(
  props: SettingFormProps & Readonly<{ preview: boolean; confirmed: boolean }>,
) {
  return (
    <SettingsActions
      {...props}
      disabled={props.preview && !props.confirmed}
      action={
        props.preview
          ? props.text('Восстановить', 'Restore')
          : props.text('Применить напоминание', 'Apply reminder')
      }
    />
  );
}
