import { useEffect, useState } from 'react';
import { getLabels, money } from '../i18n.ts';
import { summarize } from '../model/portfolio.ts';
import { EntityDialog, openDialog } from '../Forms.tsx';
import { recordsCopy } from './copy.ts';
import type { RecordsProps } from './data.ts';
import { accountSamples } from '../forms/accounts.ts';
import { Icon } from '../Icon.tsx';

import { AccountList, EntityActions } from './PortfolioAccounts.tsx';
import type { EntityRequest } from './PortfolioAccounts.tsx';
type Props = RecordsProps & Readonly<{ onSelect: (id: string) => void; onCreate: () => void }>;
export function PortfolioList(props: Props) {
  const labels = getLabels(props.language);
  const copy = recordsCopy(props.language);
  const { request, setRequest, saved, save } = useEntities(props);
  return (
    <section>
      <div className="section-top">
        <h2>
          {labels.portfolios} <span className="count">{props.state.portfolios.length}</span>
        </h2>
        <button className="primary" onClick={props.onCreate}>
          + {labels.create}
        </button>
      </div>
      <PortfolioSelection {...props} onManage={setRequest} />
      <div className="portfolio-list">
        {props.state.portfolios.map((portfolio) => (
          <PortfolioRow key={portfolio.id} {...props} id={portfolio.id} onManage={setRequest} />
        ))}
      </div>
      <p className="quiet">
        {copy.displayed}. {labels.memory}
      </p>
      {!props.onSaved && (
        <p key={saved.count} role="status">
          {saved.message}
        </p>
      )}
      {request && (
        <EntityDialog
          id="entity-dialog"
          language={props.language}
          state={props.state}
          {...request}
          onSaved={save}
          onClose={() => setRequest(null)}
        />
      )}
    </section>
  );
}
function PortfolioSelection({
  state,
  portfolioId,
  language,
  onSelect,
  onManage,
}: Props & Readonly<{ onManage: (request: EntityRequest) => void }>) {
  const copy = recordsCopy(language);
  const [selected, setSelected] = useState<readonly string[]>(
    portfolioId === 'all'
      ? state.portfolios.map((portfolio) => portfolio.id)
      : portfolioId.split(','),
  );
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  return (
    <details className="portfolio-selection">
      <summary>
        {copy.selectMany}
        <span className="selection-count">{selected.length}</span>
      </summary>
      <SelectionFields state={state} selected={selected} language={language} onToggle={toggle} />
      <p className="quiet">{copy.selectionHelp}</p>
      <SelectionActions
        selected={selected}
        language={language}
        onSelect={onSelect}
        onManage={onManage}
      />
      <EntityActions
        entity="group"
        members={['binance', 'bybit']}
        name={copy.groupName}
        onManage={onManage}
        language={language}
      />
    </details>
  );
}
function SelectionActions({
  selected,
  language,
  onSelect,
  onManage,
}: Readonly<{
  selected: readonly string[];
  language: RecordsProps['language'];
  onSelect: Props['onSelect'];
  onManage: (request: EntityRequest) => void;
}>) {
  const copy = recordsCopy(language);
  return (
    <div className="record-actions">
      <button
        className="primary"
        disabled={selected.length === 0}
        onClick={() => onSelect(selected.join(','))}
      >
        {copy.showSelection}
      </button>
      <button onClick={() => onSelect('binance,bybit')}>
        {copy.group}: {copy.crypto}
      </button>
      <button
        onClick={() => onManage({ entity: 'group', action: 'create', name: '', members: selected })}
      >
        {copy.addGroup}
      </button>
    </div>
  );
}
function PortfolioRow(
  props: Props & Readonly<{ id: string; onManage: (request: EntityRequest) => void }>,
) {
  const portfolio = props.state.portfolios.find((item) => item.id === props.id);
  if (!portfolio) return null;
  const copy = recordsCopy(props.language);
  return (
    <article className="portfolio-record">
      <PortfolioValue {...props} name={portfolio.name} />
      <details className="portfolio-manage">
        <summary>
          {copy.manage}: {portfolio.name}
        </summary>
        <EntityActions
          entity="portfolio"
          name={portfolio.name}
          portfolioId={portfolio.id}
          language={props.language}
          onManage={props.onManage}
        />
        <button
          onClick={() =>
            props.onManage({
              entity: 'account',
              action: 'create',
              name: '',
              portfolioId: portfolio.id,
            })
          }
        >
          {copy.addAccount}
        </button>
      </details>
      <AccountList {...props} />
    </article>
  );
}
function PortfolioValue({
  state,
  id,
  name,
  language,
  currency,
  baseCurrency,
  hidden,
  onSelect,
}: Props & Readonly<{ id: string; name: string }>) {
  const labels = getLabels(language);
  const result = summarize(state, id, currency);
  const performance = summarize(state, id, baseCurrency);
  return (
    <button className="portfolio-row" onClick={() => onSelect(id)}>
      <span className="portfolio-initial" aria-hidden="true">
        <Icon name="portfolios" />
      </span>
      <span className="portfolio-name">
        <strong>{name}</strong>
        <small>
          {language === 'ru' ? 'Счетов' : 'Accounts'}:{' '}
          {accountSamples.filter((account) => account.portfolioId === id).length}
        </small>
      </span>
      <span className="portfolio-value">
        <small className="quiet">{labels.total}</small>
        {hidden ? '••••' : money(result.value, currency, language)}
        <small className={performance.profit >= 0 ? 'positive' : 'negative'}>
          {labels.result} · {baseCurrency}:{' '}
          {hidden ? '••••' : money(performance.profit, baseCurrency, language, true)}
        </small>
      </span>
      <span className="portfolio-chevron" aria-hidden="true">
        <Icon name="chevron" />
      </span>
    </button>
  );
}

function useEntities(props: Props) {
  const [request, setRequest] = useState<EntityRequest | null>(null);
  const [saved, setSaved] = useState<Readonly<{ count: number; message: string }>>({
    count: 0,
    message: '',
  });
  const save = (message: string) => {
    setSaved((current) => ({ count: current.count + 1, message }));
    props.onSaved?.(message);
  };
  useEffect(() => {
    if (request) openDialog('entity-dialog');
  }, [request]);
  return { request, setRequest, saved, save };
}

function SelectionFields({
  state,
  selected,
  language,
  onToggle,
}: Readonly<{
  state: RecordsProps['state'];
  selected: readonly string[];
  language: RecordsProps['language'];
  onToggle: (id: string) => void;
}>) {
  return (
    <fieldset>
      <legend>{getLabels(language).portfolios}</legend>
      {state.portfolios.map((portfolio) => (
        <label className="checkbox-field" key={portfolio.id}>
          <input
            type="checkbox"
            checked={selected.includes(portfolio.id)}
            onChange={() => onToggle(portfolio.id)}
          />
          {portfolio.name}
        </label>
      ))}
    </fieldset>
  );
}
