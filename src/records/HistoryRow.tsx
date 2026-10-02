import { date, getLabels, money, number } from '../i18n.ts';
import { operationLabel } from '../forms/operations.ts';
import { accountLabel } from '../forms/accounts.ts';
import type { RecordsProps, Transaction } from './data.ts';
import { recordsCopy } from './copy.ts';
import { Icon } from '../Icon.tsx';
import { RowAction, RowNotice } from '../RowActions.tsx';
import { AssetSymbol } from '../AssetSymbol.tsx';

type Props = RecordsProps &
  Readonly<{
    record: Transaction;
    brief: boolean;
    removed: boolean;
    onDetails: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onRestore: () => void;
  }>;
export function HistoryRow(props: Props) {
  const portfolio = props.state.portfolios.find(
    (item) => item.id === props.record.portfolioId,
  )?.name;
  const Heading = props.brief ? 'h3' : 'h2';
  const copy = recordsCopy(props.language);
  const title = `${operationLabel(props.record.type, props.language)} ${props.record.asset}`;
  const text = `${operationLabel(props.record.type, props.language)} · ${props.record.asset}`;
  return (
    <article className={props.removed ? 'history-row row-removed' : 'history-row'}>
      <div className="record-heading">
        <Heading>
          <AssetSymbol symbol={props.record.asset} />
          <RecordDirection type={props.record.type} />
          {props.brief ? (
            text
          ) : (
            <RowOpen label={`${copy.details}: ${title}`} text={text} onClick={props.onDetails} />
          )}
        </Heading>
        <p className="quiet">
          <time dateTime={props.record.date}>{date(props.record.date, props.language)}</time> ·{' '}
          {portfolio} · {accountLabel(props.record.account, props.language).split(' · ').at(-1)}
        </p>
      </div>
      <RecordSummary {...props} />
      {!props.brief && (
        <div className="row-actions">
          <RowAction icon="edit" label={copy.edit} subject={title} onClick={props.onEdit} />
          <RowAction icon="trash" label={copy.delete} subject={title} onClick={props.onDelete} />
        </div>
      )}
      {props.removed && (
        <RowNotice
          text={copy.rowRemoved}
          detail={copy.removed}
          language={props.language}
          onUndo={props.onRestore}
        />
      )}
    </article>
  );
}
function RowOpen({
  label,
  text,
  onClick,
}: Readonly<{ label: string; text: string; onClick: () => void }>) {
  return (
    <button type="button" className="history-row-open" aria-label={label} onClick={onClick}>
      {text}
    </button>
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
        className={units ? undefined : 'record-amount'}
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
  className,
}: Readonly<{ label: string; value: string; hidden: boolean; className?: string | undefined }>) {
  return (
    <div className={className}>
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
