import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Language } from '../demo/words';
import { Icon } from '../Icon';
import { DemoModal } from '../demo/modal';
import { copy, eventDate, local } from './data';
import type { CalendarEvent } from './data';
import { validReminder } from './reminder';

type Props = Readonly<{
  event: CalendarEvent;
  language: Language;
  onClose: () => void;
  onSave: () => void;
}>;

export function EventDialog(props: Props) {
  const [reminder, setReminder] = useState(false);
  const text = copy(props.language);
  const title = local(props.language, props.event.title);
  useEffect(() => {
    document.getElementById(reminder ? 'event-reminder-minutes' : 'event-reminder-open')?.focus();
  }, [reminder]);
  return (
    <DemoModal
      id="event-dialog"
      language={props.language}
      onClose={props.onClose}
      title={reminder ? `${text('Напоминание', 'Reminder')} · ${title}` : title}
    >
      <div className="event-dialog-content">
        <p className="quiet">
          <time dateTime={props.event.date}>
            {eventDate(props.language, props.event.date)}&nbsp;UTC
          </time>
        </p>
        {reminder ? (
          <ReminderForm {...props} onBack={() => setReminder(false)} />
        ) : (
          <EventDetails {...props} onRemind={() => setReminder(true)} />
        )}
      </div>
    </DemoModal>
  );
}

function EventDetails(props: Props & Readonly<{ onRemind: () => void }>) {
  const text = copy(props.language);
  return (
    <>
      <p>{local(props.language, props.event.detail)}</p>
      <p className="quiet">
        {text('Источник: вымышленные данные макета.', 'Source: fictional prototype data.')}
      </p>
      <div className="dialog-actions">
        <button type="button" onClick={props.onClose}>
          {text('Закрыть', 'Close')}
        </button>
        <button
          type="button"
          id="event-reminder-open"
          className="primary"
          onClick={props.onRemind}
          aria-label={`${text('Напомнить', 'Set reminder')}: ${local(props.language, props.event.title)}`}
        >
          {text('Напомнить', 'Set reminder')}
        </button>
      </div>
    </>
  );
}

function ReminderForm(props: Props & Readonly<{ onBack: () => void }>) {
  const [minutes, setMinutes] = useState('15');
  const [channel, setChannel] = useState('app');
  const [error, setError] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const text = copy(props.language);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!validReminder(minutes)) {
          setError(true);
          field.current?.focus();
          return;
        }
        props.onSave();
      }}
    >
      <button type="button" id="event-reminder-back" className="link-back" onClick={props.onBack}>
        <Icon name="chevron" />
        {text('Назад к событию', 'Back to event')}
      </button>
      <ReminderMinutes
        language={props.language}
        value={minutes}
        onChange={setMinutes}
        error={error}
        field={field}
      />
      <ReminderChannel language={props.language} value={channel} onChange={setChannel} />
      <div className="dialog-actions">
        <button type="button" id="event-reminder-cancel" onClick={props.onClose}>
          {text('Отмена', 'Cancel')}
        </button>
        <button type="submit" id="event-reminder-save" className="primary">
          {text('Сохранить', 'Save')}
        </button>
      </div>
    </form>
  );
}

function ReminderMinutes(
  props: Readonly<{
    language: Language;
    value: string;
    onChange: (value: string) => void;
    error: boolean;
    field: RefObject<HTMLInputElement | null>;
  }>,
) {
  const text = copy(props.language);
  return (
    <>
      <label htmlFor="event-reminder-minutes">
        {text('За сколько минут до события', 'Minutes before the event')}
      </label>
      <input
        ref={props.field}
        id="event-reminder-minutes"
        inputMode="numeric"
        value={props.value}
        aria-invalid={props.error}
        aria-describedby={props.error ? 'event-reminder-error' : 'event-reminder-help'}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <p id="event-reminder-help" className="quiet">
        {text(
          'Целое число от 1 до 10 080 (одной недели).',
          'A whole number from 1 to 10,080 (one week).',
        )}
      </p>
      {props.error && (
        <p id="event-reminder-error" className="field-error" role="alert">
          {text('Введите целое число от 1 до 10 080.', 'Enter a whole number from 1 to 10,080.')}
        </p>
      )}
    </>
  );
}

function ReminderChannel(
  props: Readonly<{ language: Language; value: string; onChange: (value: string) => void }>,
) {
  const text = copy(props.language);
  return (
    <>
      <label htmlFor="event-reminder-channel">{text('Где напомнить', 'Reminder channel')}</label>
      <select
        id="event-reminder-channel"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        <option value="app">{text('В приложении: пример', 'In app: sample')}</option>
        <option value="calendar">{text('В календаре: пример', 'In calendar: sample')}</option>
      </select>
      <p className="quiet">
        {text(
          'Календарь и уведомления не подключаются.',
          'No calendar or notification service is connected.',
        )}
      </p>
    </>
  );
}
