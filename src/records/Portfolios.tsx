import { useEffect, useState } from 'react';
import { getLabels, money, resultTone } from '../i18n.ts';
import { selectedBuys, summarize } from '../model/portfolio.ts';
import { EntityDialog, openDialog } from '../Forms.tsx';
import { recordsCopy } from './copy.ts';
import type { RecordsProps } from './data.ts';
import { accountSamples } from '../forms/accounts.ts';
import { Icon } from '../Icon.tsx';
import { RowAction } from '../RowActions.tsx';
import { AssetSymbol } from '../AssetSymbol.tsx';

import { AccountList, GroupButtons } from './PortfolioAccounts.tsx';
import type { EntityRequest } from './PortfolioAccounts.tsx';
type Props = RecordsProps & Readonly<{ onSelect: (id: string) => void; onCreate: () => void }>;
export function PortfolioList(props: Props) {
  const labels = getLabels(props.language);
  const copy = recordsCopy(props.language);
  const { request, setRequest, saved, save, removed, remove } = useEntities(props);
  return (
    <section>
      <div className="section-top">
        <button className="primary" onClick={props.onCreate}>
          + {labels.create}
        </button>
      </div>
      <PortfolioSelection {...props} removed={removed} onManage={setRequest} />
      <div className="portfolio-list">
        {props.state.portfolios
          .filter((portfolio) => !removed.includes(`portfolio:${portfolio.id}`))
          .map((portfolio) => (
            <PortfolioRow
              key={portfolio.id}
              {...props}
              id={portfolio.id}
              removed={removed}
              onManage={setRequest}
            />
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
          onRemove={(action) => remove(request, action)}
        />
      )}
    </section>
  );
}
type ManageProps = Props &
  Readonly<{ removed: readonly string[]; onManage: (request: EntityRequest) => void }>;
function PortfolioSelection({
  state,
  portfolioId,
  language,
  removed,
  onSelect,
  onManage,
}: ManageProps) {
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
      {selected.length === 0 && <p className="quiet">{copy.selectionHelp}</p>}
      <SelectionActions
        selected={selected}
        language={language}
        group={!removed.includes('group:crypto')}
        onSelect={onSelect}
        onManage={onManage}
      />
    </details>
  );
}
function SelectionActions({
  selected,
  language,
  group,
  onSelect,
  onManage,
}: Readonly<{
  selected: readonly string[];
  language: RecordsProps['language'];
  group: boolean;
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
      {group && <GroupButtons language={language} onSelect={onSelect} onManage={onManage} />}
      <button
        onClick={() => onManage({ entity: 'group', action: 'create', name: '', members: selected })}
      >
        {copy.addGroup}
      </button>
    </div>
  );
}
function PortfolioRow(props: ManageProps & Readonly<{ id: string }>) {
  const portfolio = props.state.portfolios.find((item) => item.id === props.id);
  if (!portfolio) return null;
  const copy = recordsCopy(props.language);
  return (
    <article className="portfolio-record">
      <PortfolioValue {...props} name={portfolio.name} />
      <div className="row-actions portfolio-manage">
        <RowAction
          icon="edit"
          label={copy.edit}
          subject={portfolio.name}
          onClick={() =>
            props.onManage({
              entity: 'portfolio',
              action: 'edit',
              name: portfolio.name,
              target: `portfolio:${portfolio.id}`,
              portfolioId: portfolio.id,
            })
          }
        />
      </div>
      <AccountList
        id={portfolio.id}
        name={portfolio.name}
        language={props.language}
        removed={props.removed}
        onManage={props.onManage}
      />
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
        <small className={resultTone(performance.profit, hidden)}>
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
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [saved, setSaved] = useState<Readonly<{ count: number; message: string }>>({
    count: 0,
    message: '',
  });
  const save = (message: string, undo?: () => void) => {
    setSaved((current) => ({ count: current.count + 1, message }));
    props.onSaved?.(message, undo);
  };
  // Архив и удаление убирают строку только из списка вкладки; набор и расчёт не меняются.
  const remove = (target: EntityRequest, action: 'archive' | 'delete') => {
    const key = target.target ?? '';
    const copy = recordsCopy(props.language);
    setRemoved((current) => [...current, key]);
    save(action === 'archive' ? copy.archived : copy.entityRemoved, () =>
      setRemoved((current) => current.filter((item) => item !== key)),
    );
  };
  useEffect(() => {
    if (request) openDialog('entity-dialog');
  }, [request]);
  return { request, setRequest, saved, save, removed, remove };
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
