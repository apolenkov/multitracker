import { useState } from 'react';
import { ActionMenu } from '../ActionMenu.tsx';
import { DemoModal } from '../demo/modal.tsx';
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
  onDelete: (id: number) => void;
}>;

export function AlertList(props: Props) {
  const words = marketWords(props.language);
  const [pending, setPending] = useState<PriceAlert>();
  return (
    <section className="market-alerts" aria-labelledby="market-alerts-heading">
      <h2 id="market-alerts-heading">{words.alerts}</h2>
      <p className="quiet">{words.alertNote}</p>
      {props.alerts.length === 0 && <p className="market-empty">{words.noAlerts}</p>}
      <ul className="market-alert-list">
        {props.alerts.map((alert) => (
          <AlertRow key={alert.id} {...props} alert={alert} onDelete={() => setPending(alert)} />
        ))}
      </ul>
      {pending && (
        <DeleteAlert
          {...props}
          alert={pending}
          onCancel={() => setPending(undefined)}
          onConfirm={() => {
            props.onDelete(pending.id);
            setPending(undefined);
          }}
        />
      )}
    </section>
  );
}

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
        <button
          type="button"
          data-market-action="edit"
          aria-label={`${words.edit} · ${alert.symbol}`}
          onClick={() => props.onEdit(alert)}
        >
          {words.edit}
        </button>
        <ActionMenu
          className="rule-menu"
          label={`${words.actions} · ${alert.symbol}`}
          items={[
            {
              label: alert.paused ? words.resume : words.pause,
              ariaLabel: `${alert.paused ? words.resume : words.pause} · ${alert.symbol}`,
              onSelect: () => props.onPause(alert),
            },
            {
              label: words.deleteAlert,
              ariaLabel: `${words.deleteAlert} · ${alert.symbol}`,
              onSelect: () => props.onDelete(alert.id),
              danger: true,
            },
          ]}
        />
      </div>
    </li>
  );
}

function DeleteAlert(
  props: Props & Readonly<{ alert: PriceAlert; onCancel: () => void; onConfirm: () => void }>,
) {
  const words = marketWords(props.language);
  return (
    <DemoModal
      id="market-delete-alert-dialog"
      title={`${words.deleteAlert} · ${props.alert.symbol}`}
      language={props.language}
      onClose={props.onCancel}
    >
      <p>{words.deleteQuestion}</p>
      <p className="market-delete-condition">
        {props.alert.symbol} · {props.alert.direction === 'above' ? words.above : words.below}{' '}
        {sampleMoney(props.alert.usd, props.currency, props.language, props.hidden)}
      </p>
      <div className="dialog-actions">
        <button id="market-cancel-delete-alert" type="button" onClick={props.onCancel}>
          {words.cancel}
        </button>
        <button
          id="market-confirm-delete-alert"
          type="button"
          className="primary"
          onClick={props.onConfirm}
        >
          {words.deleteAlert}
        </button>
      </div>
    </DemoModal>
  );
}
