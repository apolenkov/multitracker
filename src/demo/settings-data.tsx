import { useState } from 'react';
import { SettingsActions } from './settings-display';
import { validExportDates, validExportStart, validExportEnd } from './settings-validation';
import type { SettingFormProps } from './settings-display';

export function ExportSettings(
  props: SettingFormProps & Readonly<{ onSave: (message: string) => void }>,
) {
  const [format, setFormat] = useState('csv');
  const [scope, setScope] = useState('all');
  const [start, setStart] = useState('2026-01-01');
  const [end, setEnd] = useState('2026-09-30');
  const invalid = !validExportDates(start, end);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid)
          props.onSave(
            props.text(
              'Пример экспорта подготовлен; файл не создаётся.',
              'Export sample prepared; no file is created.',
            ),
          );
      }}
    >
      <p>
        {props.text(
          'Экспорт содержит открытые данные. Храните настоящие файлы в безопасном месте.',
          'Exports contain readable data. Store real files safely.',
        )}
      </p>
      <ExportSelection
        text={props.text}
        format={format}
        scope={scope}
        setFormat={setFormat}
        setScope={setScope}
      />
      <DateRange
        start={start}
        end={end}
        setStart={setStart}
        setEnd={setEnd}
        text={props.text}
        invalid={invalid}
      />
      <ExportError text={props.text} invalid={invalid} />
      <SettingsActions {...props} />
    </form>
  );
}

function DateRange(
  props: Readonly<{
    start: string;
    end: string;
    invalid: boolean;
    setStart: (value: string) => void;
    setEnd: (value: string) => void;
  }> &
    Pick<SettingFormProps, 'text'>,
) {
  return (
    <div className="form-row">
      <label>
        {props.text('С даты', 'From date')}
        <input
          type="date"
          aria-invalid={!validExportStart(props.start)}
          aria-describedby={props.invalid ? 'settings-export-date-error' : undefined}
          onInvalid={(event) => event.currentTarget.focus()}
          required
          max="2026-09-30"
          value={props.start}
          onChange={(event) => props.setStart(event.target.value)}
        />
      </label>
      <label>
        {props.text('По дату', 'To date')}
        <input
          type="date"
          aria-invalid={!validExportEnd(props.start, props.end)}
          aria-describedby={props.invalid ? 'settings-export-date-error' : undefined}
          onInvalid={(event) => event.currentTarget.focus()}
          required
          min={props.start}
          max="2026-09-30"
          value={props.end}
          onChange={(event) => props.setEnd(event.target.value)}
        />
      </label>
    </div>
  );
}

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
      <SettingsActions {...props} disabled={preview && !confirmed} />
    </form>
  );
}

function RestorePreview(
  props: SettingFormProps & Readonly<{ confirmed: boolean; onConfirm: (value: boolean) => void }>,
) {
  return (
    <section className="demo-note">
      <h3>{props.text('Восстановление: пример', 'Restore: sample')}</h3>
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

export function DeleteSettings(props: SettingFormProps & Readonly<{ onDelete: () => void }>) {
  const [confirmation, setConfirmation] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (confirmation === 'DEMO') props.onDelete();
      }}
    >
      <p>
        {props.text(
          'В настоящем приложении удаление необратимо. В макете учебные портфели остаются.',
          'Real deletion is irreversible. The mockup keeps its sample portfolios.',
        )}
      </p>
      <label>
        {props.text('Введите DEMO для подтверждения', 'Type DEMO to confirm')}
        <input
          required
          pattern="DEMO"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      <div className="form-actions">
        <button type="button" onClick={props.onClose}>
          {props.text('Отмена', 'Cancel')}
        </button>
        <button type="submit" className="danger" disabled={confirmation !== 'DEMO'}>
          {props.text('Показать удаление', 'Show deletion')}
        </button>
      </div>
    </form>
  );
}

function ExportSelection(
  props: Pick<SettingFormProps, 'text'> &
    Readonly<{
      format: string;
      scope: string;
      setFormat: (value: string) => void;
      setScope: (value: string) => void;
    }>,
) {
  return (
    <>
      <label>
        {props.text('Формат', 'Format')}
        <select value={props.format} onChange={(event) => props.setFormat(event.target.value)}>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="pdf">PDF</option>
        </select>
      </label>
      <label>
        {props.text('Область', 'Scope')}
        <select value={props.scope} onChange={(event) => props.setScope(event.target.value)}>
          <option value="all">{props.text('Все портфели', 'All portfolios')}</option>
          <option value="tradernet">Tradernet</option>
          <option value="binance">Binance</option>
          <option value="bybit">Bybit</option>
        </select>
      </label>
    </>
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
        {props.text('Создать копию: пример', 'Create backup: sample')}
      </button>
      <button type="button" className="quiet" onClick={props.onPreview}>
        {props.text('Предпросмотр восстановления', 'Preview restore')}
      </button>
    </>
  );
}

function ExportError(props: Pick<SettingFormProps, 'text'> & Readonly<{ invalid: boolean }>) {
  return (
    <>
      {props.invalid && (
        <p id="settings-export-date-error" className="field-error" role="alert">
          {props.text(
            'Начало должно быть не позже конца; даты — не позднее 30.09.2026.',
            'Start must precede end; dates must be on or before September 30, 2026.',
          )}
        </p>
      )}
    </>
  );
}
