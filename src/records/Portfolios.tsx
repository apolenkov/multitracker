import { useEffect, useState } from 'react';
import { getLabels, money } from '../i18n.ts';
import { selectedBuys, summarize } from '../model/portfolio.ts';
import { EntityDialog, openDialog } from '../Forms.tsx';
import { recordsCopy } from './copy.ts';
import type { RecordsProps } from './data.ts';
import { accountSamples } from '../forms/accounts.ts';
import { Icon } from '../Icon.tsx';
import { ActionMenu } from '../ActionMenu.tsx';
import { AssetSymbol } from '../AssetSymbol.tsx';

import { AccountList, EntityActionButtons, entityActions } from './PortfolioAccounts.tsx';
import type { EntityRequest } from './PortfolioAccounts.tsx';
type Props = RecordsProps & Readonly<{ onSelect: (id: string) => void; onCreate: () => void }>;
export function PortfolioList(props: Props) {
  const labels = getLabels(props.language);
  const copy = recordsCopy(props.language);
  const { request, setRequest, saved, save } = useEntities(props);
  return (
    <section>
      <div className="section-top">
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
      <EntityActionButtons
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
  const actions = entityActions({
    entity: 'portfolio',
    name: portfolio.name,
    portfolioId: portfolio.id,
    language: props.language,
    onManage: props.onManage,
  });
  const edit = actions.slice(0, -1);
  const remove = actions.slice(-1);
  return (
    <article className="portfolio-record">
      <PortfolioValue {...props} name={portfolio.name} />
      <ActionMenu
        className="portfolio-manage"
        label={`${copy.manage}: ${portfolio.name}`}
        items={[
          ...edit,
          {
            label: copy.addAccount,
            ariaLabel: `${copy.addAccount}: ${portfolio.name}`,
            onSelect: () =>
              props.onManage({
                entity: 'account',
                action: 'create',
                name: '',
                portfolioId: portfolio.id,
              }),
          },
          ...remove,
        ]}
      />
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
        <small className="portfolio-meta">
          <span>
            {language === 'ru' ? 'Счетов' : 'Accounts'}:{' '}
            {accountSamples.filter((account) => account.portfolioId === id).length}
          </span>
          <PortfolioAssets state={state} id={id} />
        </small>
      </span>
      <span className="portfolio-value">
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

function PortfolioAssets({ state, id }: Readonly<{ state: RecordsProps['state']; id: string }>) {
  const symbols = Array.from(new Set(selectedBuys(state, id).map((buy) => buy.asset)));
  return (
    <span className="portfolio-assets">
      {symbols.map((symbol) => (
        <span key={symbol}>
          <AssetSymbol symbol={symbol} />
          {symbol}
        </span>
      ))}
    </span>
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
