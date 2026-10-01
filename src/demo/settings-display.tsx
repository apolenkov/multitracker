import { useState } from 'react';
import type { DemoState, Density, Props } from './words';

export type SettingText = (ru: string, en: string) => string;
export type SettingFormProps = Readonly<{ text: SettingText; onClose: () => void }>;
export type Notifications = Readonly<{
  price: boolean;
  sync: boolean;
  backup: boolean;
  channel: string;
}>;

export function SettingsActions({
  text,
  onClose,
  disabled = false,
  action,
}: SettingFormProps & Readonly<{ disabled?: boolean; action?: string }>) {
  return (
    <div className="form-actions">
      <button type="button" onClick={onClose}>
        {text('Отмена', 'Cancel')}
      </button>
      <button className="primary" type="submit" disabled={disabled}>
        {action ?? text('Применить', 'Apply')}
      </button>
    </div>
  );
}

export function DisplaySettings(
  props: SettingFormProps &
    Readonly<{
      density: Density;
      onSave: (density: Density) => void;
    }>,
) {
  const [draft, setDraft] = useState(props.density);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        props.onSave(draft);
      }}
    >
      <label>
        {props.text('Плотность', 'Density')}
        <select
          id="settings-density"
          value={draft}
          onChange={(event) =>
            setDraft(event.target.value === 'compact' ? 'compact' : 'comfortable')
          }
        >
          <option value="comfortable">{props.text('Свободно', 'Comfortable')}</option>
          <option value="compact">{props.text('Компактно', 'Compact')}</option>
        </select>
      </label>
      <div className={`density-preview density-preview-${draft}`} aria-hidden="true">
        <span>BTC</span>
        <span>Microsoft</span>
      </div>
      <p className="demo-note">{props.text('До закрытия вкладки.', 'Until this tab closes.')}</p>
      <SettingsActions {...props} />
    </form>
  );
}

export function NotificationSettings(
  props: SettingFormProps &
    Readonly<{
      value: Notifications;
      onSave: (value: Notifications) => void;
    }>,
) {
  const [draft, setDraft] = useState(props.value);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        props.onSave(draft);
      }}
    >
      <p>
        {props.text(
          'Уведомления не отправляются. Вы выбираете поведение будущего приложения.',
          'No notifications are sent. Choose future app behavior.',
        )}
      </p>
      {(['price', 'sync', 'backup'] as const).map((key) => (
        <label className="check-row" key={key}>
          <input
            id={`settings-notification-${key}`}
            type="checkbox"
            checked={notificationEnabled(draft, key)}
            onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })}
          />
          {notificationLabel(props.text, key)}
        </label>
      ))}
      <label>
        {props.text('Канал', 'Channel')}
        <select
          value={draft.channel}
          onChange={(event) => setDraft({ ...draft, channel: event.target.value })}
        >
          <option value="app">{props.text('В приложении', 'In app')}</option>
          <option value="email">{props.text('Электронная почта', 'Email')}</option>
        </select>
      </label>
      <SettingsActions {...props} />
    </form>
  );
}

function notificationLabel(text: SettingText, key: keyof Omit<Notifications, 'channel'>) {
  if (key === 'price') return text('Изменения цены', 'Price changes');
  if (key === 'sync') return text('Ошибки синхронизации', 'Sync errors');
  return text('Напоминание о резервной копии', 'Backup reminder');
}

export function LocaleSettings(props: Props & Readonly<{ text: SettingText }>) {
  return (
    <div className="settings-fields">
      <label>
        {props.text('Язык интерфейса', 'Interface language')}
        <select
          value={props.language}
          onChange={(event) => props.onLanguage(event.target.value === 'en' ? 'en' : 'ru')}
        >
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select>
      </label>
      <ThemeSettings {...props} />
      <label className="check-row">
        <input
          id="settings-monochrome"
          type="checkbox"
          checked={props.monochrome}
          onChange={(event) => props.onMonochrome(event.target.checked)}
        />
        {props.text('Монохромное представление', 'Monochrome appearance')}
      </label>
    </div>
  );
}

function ThemeSettings(props: Props & Readonly<{ text: SettingText }>) {
  return (
    <label>
      {props.text('Тема оформления', 'Appearance theme')}
      <select
        id="settings-theme"
        value={props.theme}
        onChange={(event) => {
          const value = event.target.value;
          props.onTheme(value === 'light' || value === 'system' ? value : 'dark');
        }}
      >
        <option value="dark">{props.text('Тёмная', 'Dark')}</option>
        <option value="light">{props.text('Светлая', 'Light')}</option>
        <option value="system">{props.text('Как в системе', 'System preference')}</option>
      </select>
    </label>
  );
}

export function CurrencySettings(props: Props & Readonly<{ text: SettingText }>) {
  return (
    <>
      <label>
        {props.text('Валюта расчёта', 'Calculation currency')}
        <select
          id="settings-base-currency"
          value={props.baseCurrency}
          onChange={(event) => props.onBaseCurrency(event.target.value === 'USD' ? 'USD' : 'RUB')}
        >
          <option value="RUB">RUB ₽</option>
          <option value="USD">USD $</option>
        </select>
        <small>
          {props.text(
            'В этой валюте сравниваются вложения и финансовый результат.',
            'Invested amounts and investment returns are compared in this currency.',
          )}
        </small>
      </label>
      <label>
        {props.text('Валюта отображения', 'Display currency')}
        <select
          id="settings-display-currency"
          value={props.currency}
          onChange={(event) => props.onCurrency(event.target.value === 'USD' ? 'USD' : 'RUB')}
        >
          <option value="RUB">RUB ₽</option>
          <option value="USD">USD $</option>
        </select>
        <small>
          {props.text(
            'Текущая стоимость активов показывается в этой валюте.',
            'Current holdings value is shown in this currency.',
          )}
        </small>
      </label>
    </>
  );
}

function validDemoState(value: string): DemoState {
  if (value === 'loading' || value === 'empty' || value === 'missing' || value === 'error')
    return value;
  return 'ready';
}

export function DemoStateSettings(props: Props & Readonly<{ text: SettingText }>) {
  const labels =
    props.language === 'ru'
      ? ['Заполнено', 'Загрузка', 'Пустой портфель', 'Нет цены или курса', 'Ошибка сохранения']
      : ['Populated', 'Loading', 'Empty portfolio', 'Missing price or rate', 'Save error'];
  return (
    <section className="demo-state-settings">
      <h2>{props.text('Проверка состояний', 'Explore states')}</h2>
      <label>
        {props.text('Состояние обзора', 'Overview state')}
        <select
          value={props.demoState}
          onChange={(event) => props.onDemoState(validDemoState(event.target.value))}
        >
          {(['ready', 'loading', 'empty', 'missing', 'error'] as const).map((state, index) => (
            <option key={state} value={state}>
              {labels.at(index)}
            </option>
          ))}
        </select>
      </label>
      <p>
        {props.text(
          'Фиксированные примеры; операции и остатки не меняются.',
          'Fixed examples; transactions and balances stay unchanged.',
        )}
      </p>
      <button className="quiet" onClick={props.onShowExample}>
        {props.text('Показать на Обзоре', 'Show on Overview')}
      </button>
    </section>
  );
}

function notificationEnabled(value: Notifications, key: keyof Omit<Notifications, 'channel'>) {
  if (key === 'price') return value.price;
  if (key === 'sync') return value.sync;
  return value.backup;
}
