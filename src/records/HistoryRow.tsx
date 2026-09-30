import { date, getLabels, money, number } from '../i18n.ts';
import { operationLabel } from '../forms/operations.ts';
import { accountLabel } from '../forms/accounts.ts';
import type { RecordsProps, Transaction } from './data.ts';
import { recordsCopy } from './copy.ts';

type Props = RecordsProps &
  Readonly<{
    record: Transaction;
    brief: boolean;
    onDetails: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }>;
export function HistoryRow(props: Props) {
  const copy = recordsCopy(props.language);
  const portfolio = props.state.portfolios.find(
    (item) => item.id === props.record.portfolioId,
  )?.name;
  const Heading = props.brief ? 'h3' : 'h2';
  return (
    <article className="history-row">
      <div>
        <p className="eyebrow">{date(props.record.date, props.language)}</p>
        <Heading>
          {operationLabel(props.record.type, props.language)} · {props.record.asset}
        </Heading>
        <p>{portfolio}</p>
        <p className="quiet">{props.record.sample ? copy.sample : copy.actual}</p>
      </div>
      <RecordValues {...props} />
      {!props.brief && (
        <div className="record-actions">
          <button
            aria-label={`${copy.details}: ${operationLabel(props.record.type, props.language)} ${props.record.asset}`}
            onClick={props.onDetails}
          >
            {copy.details}
          </button>
          <button
            aria-label={`${copy.edit}: ${operationLabel(props.record.type, props.language)} ${props.record.asset}`}
            onClick={props.onEdit}
          >
            {copy.edit}
          </button>
          <button
            aria-label={`${copy.delete}: ${operationLabel(props.record.type, props.language)} ${props.record.asset}`}
            onClick={props.onDelete}
          >
            {copy.delete}
          </button>
        </div>
      )}
    </article>
  );
}
export function RecordValues({
  record,
  currency,
  language,
  hidden,
}: RecordsProps & Readonly<{ record: Transaction }>) {
  const labels = getLabels(language);
  const copy = recordsCopy(language);

  const quantityLabel = quantityName(record, language);
  return (
    <dl className="record-values">
      {(['buy', 'sell', 'corporate'].includes(record.type) || isAssetTransfer(record)) && (
        <RecordValue
          label={quantityLabel}
          value={number(record.quantity, language)}
          hidden={hidden}
        />
      )}
      {record.price > 0 && (
        <RecordValue
          label={labels.price}
          value={money(record.price, record.currency, language)}
          hidden={hidden}
        />
      )}
      {record.type !== 'corporate' && (
        <FinancialValues record={record} currency={currency} language={language} hidden={hidden} />
      )}
      <RecordValue
        label={copy.account}
        value={accountLabel(record.account, language)}
        hidden={false}
      />
    </dl>
  );
}
function RecordValue({
  label,
  value,
  hidden,
}: Readonly<{ label: string; value: string; hidden: boolean }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{hidden ? '••••' : value}</dd>
    </div>
  );
}

function quantityName(record: Transaction, language: RecordsProps['language']) {
  if (record.type === 'corporate')
    return language === 'ru' ? 'Коэффициент дробления' : 'Split ratio';
  return getLabels(language).quantity;
}

function FinancialValues({
  record,
  currency,
  language,
  hidden,
}: Readonly<{
  record: Transaction;
  currency: RecordsProps['currency'];
  language: RecordsProps['language'];
  hidden: boolean;
}>) {
  const copy = recordsCopy(language);
  const labels = getLabels(language);
  const cost = record.amount * (currency === 'RUB' && record.currency === 'USD' ? record.fx : 1);
  return (
    <>
      {['buy', 'sell', 'transfer', 'exchange', 'income'].includes(record.type) && (
        <RecordValue
          label={labels.fee}
          value={money(record.fee, record.currency, language)}
          hidden={hidden}
        />
      )}
      <RecordValue
        label={language === 'ru' ? 'Исторический USD/RUB' : 'Historical USD/RUB'}
        value={number(record.fx, language)}
        hidden={false}
      />
      {record.type === 'exchange' ? (
        <ExchangeValues record={record} language={language} hidden={hidden} />
      ) : (
        !isAssetTransfer(record) && (
          <RecordValue
            label={record.type === 'buy' ? labels.cost : copy.amount}
            value={money(cost, currency, language)}
            hidden={hidden}
          />
        )
      )}
    </>
  );
}

function isAssetTransfer(record: Transaction) {
  return record.type === 'transfer' && !['RUB', 'USD'].includes(record.asset);
}

function ExchangeValues({
  record,
  language,
  hidden,
}: Readonly<{ record: Transaction; language: RecordsProps['language']; hidden: boolean }>) {
  const copy = recordsCopy(language);
  return (
    <>
      <RecordValue
        label={copy.spent}
        value={money(record.amount, record.currency, language)}
        hidden={hidden}
      />
      <RecordValue
        label={copy.received}
        value={money(record.amount * record.fx, record.targetCurrency ?? 'RUB', language)}
        hidden={hidden}
      />
    </>
  );
}
