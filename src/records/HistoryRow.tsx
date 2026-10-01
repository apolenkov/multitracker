import { date, getLabels, money, number } from '../i18n.ts';
import { operationLabel } from '../forms/operations.ts';
import { accountLabel } from '../forms/accounts.ts';
import type { RecordsProps, Transaction } from './data.ts';
import { recordsCopy } from './copy.ts';
import { Icon } from '../Icon.tsx';
import { ActionMenu } from '../ActionMenu.tsx';
import { AssetSymbol } from '../AssetSymbol.tsx';

type Props = RecordsProps &
  Readonly<{
    record: Transaction;
    brief: boolean;
    onDetails: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }>;
export function HistoryRow(props: Props) {
  const portfolio = props.state.portfolios.find(
    (item) => item.id === props.record.portfolioId,
  )?.name;
  const Heading = props.brief ? 'h3' : 'h2';
  return (
    <article className="history-row">
      <div className="record-heading">
        <time dateTime={props.record.date}>{date(props.record.date, props.language)}</time>
        <Heading>
          <AssetSymbol symbol={props.record.asset} />
          <RecordDirection type={props.record.type} />
          {operationLabel(props.record.type, props.language)} · {props.record.asset}
        </Heading>
        <p className="quiet">
          {portfolio} · {accountLabel(props.record.account, props.language).split(' · ').at(-1)}
        </p>
      </div>
      <RecordSummary {...props} />
      {!props.brief && <RecordActions {...props} />}
    </article>
  );
}
function RecordActions(props: Props) {
  const copy = recordsCopy(props.language);
  const title = `${operationLabel(props.record.type, props.language)} ${props.record.asset}`;
  return (
    <div className="record-actions">
      <button
        className="record-detail-button"
        aria-label={`${copy.details}: ${title}`}
        onClick={props.onDetails}
      >
        {copy.details}
      </button>
      <ActionMenu
        className="record-menu"
        label={`${props.language === 'ru' ? 'Действия' : 'Actions'}: ${title}`}
        items={[
          { label: copy.edit, ariaLabel: `${copy.edit}: ${title}`, onSelect: props.onEdit },
          {
            label: copy.delete,
            ariaLabel: `${copy.delete}: ${title}`,
            onSelect: props.onDelete,
            danger: true,
          },
        ]}
      />
    </div>
  );
}
function RecordDirection({ type }: Readonly<{ type: Transaction['type'] }>) {
  const name = ['deposit', 'income', 'opening'].includes(type)
    ? 'incoming'
    : ['withdrawal', 'fee'].includes(type)
      ? 'outgoing'
      : 'transfer';
  return (
    <span className={`record-direction record-direction-${name}`} aria-hidden="true">
      <Icon name={name} />
    </span>
  );
}
export function RecordSummary({
  record,
  currency,
  language,
  hidden,
}: RecordsProps & Readonly<{ record: Transaction }>) {
  const copy = recordsCopy(language);
  if (record.type === 'exchange')
    return (
      <dl className="record-summary">
        <ExchangeValues record={record} language={language} hidden={hidden} />
      </dl>
    );
  const units = record.type === 'corporate' || isAssetTransfer(record);
  const value = units
    ? `${number(record.quantity, language)} ${record.type === 'corporate' ? ': 1' : record.asset}`
    : money(
        record.amount * (currency === 'RUB' && record.currency === 'USD' ? record.fx : 1),
        currency,
        language,
      );
  return (
    <dl className="record-summary">
      <RecordValue
        label={units ? quantityName(record, language) : copy.amount}
        value={value}
        hidden={hidden}
      />
    </dl>
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
