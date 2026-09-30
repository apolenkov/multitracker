import { useState } from 'react';
import { SettingsActions } from './settings-display';
import { validExportDates, validExportStart, validExportEnd } from './settings-validation';
import type { SettingFormProps } from './settings-display';
export { BackupSettings } from './settings-backup';

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
      <SettingsActions {...props} action={props.text('Показать экспорт', 'Preview export')} />
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
          {props.text('Удалить учебные данные', 'Delete sample data')}
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
