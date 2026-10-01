import { RowAction } from '../RowActions.tsx';
import type { Language } from '../i18n.ts';
import type { Currency } from '../model/portfolio.ts';
import { sampleMoney, type PriceAlert } from './data.ts';
import { marketWords } from './words.ts';

type Props = Readonly<{
  language: Language;
  currency: Currency;
  hidden: boolean;
  alerts: readonly PriceAlert[];
  onEdit: (value: PriceAlert) => void;
  onPause: (value: PriceAlert) => void;
}>;

export function AlertList(props: Props) {
  const words = marketWords(props.language);
  return (
    <section className="market-alerts" aria-labelledby="market-alerts-heading">
      <h2 id="market-alerts-heading">{words.alerts}</h2>
      <p className="quiet">{words.alertNote}</p>
      {props.alerts.length === 0 && <p className="market-empty">{words.noAlerts}</p>}
      <ul className="market-alert-list">
        {props.alerts.map((alert) => (
          <AlertRow key={alert.id} {...props} alert={alert} />
        ))}
      </ul>
    </section>
  );
}

// Пауза — переключатель в строке; удаление — в подвале формы «Изменить уведомление».
function AlertRow(props: Props & Readonly<{ alert: PriceAlert }>) {
  const words = marketWords(props.language);
  const alert = props.alert;
  return (
    <li data-market-alert={alert.id}>
      <div>
        <strong>
          {alert.symbol} · {alert.direction === 'above' ? words.above : words.below}{' '}
          {sampleMoney(alert.usd, props.currency, props.language, props.hidden)}
        </strong>
        <p className="quiet">
          {alert.repeat ? words.repeating : words.once} ·{' '}
          {alert.paused ? words.paused : words.active}
        </p>
      </div>
      <div className="market-alert-actions">
        <label className="check-row alert-switch">
          <input
            type="checkbox"
            data-market-action="pause"
            checked={!alert.paused}
            aria-label={`${words.enabled} · ${alert.symbol}`}
            onChange={() => props.onPause(alert)}
          />
          {words.enabled}
        </label>
        <RowAction
          icon="edit"
          label={words.editAlert}
          subject={alert.symbol}
          onClick={() => props.onEdit(alert)}
        />
      </div>
    </li>
  );
}
