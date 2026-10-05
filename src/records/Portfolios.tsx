import { useEffect, useState } from 'react';
import { getLabels, money, resultTone } from '../i18n.ts';
import { selectedBuys, summarize } from '../model/portfolio.ts';
import { EntityDialog, openDialog } from '../Forms.tsx';
import { accountWord, recordsCopy, rowNoticeDetail, rowNoticeText } from './copy.ts';
import { Count } from '../Count.tsx';
import type { RecordsProps } from './data.ts';
import { accountSamples } from '../forms/accounts.ts';
import { Icon } from '../Icon.tsx';
import { RowAction, RowNotice, undoneText } from '../RowActions.tsx';
import { AssetSymbol } from '../AssetSymbol.tsx';
import { focusMain } from '../navigation.ts';

import { AccountList, SelectionActions, SelectionFields } from './PortfolioAccounts.tsx';
import type { EntityRequest, RemovedMap } from './PortfolioAccounts.tsx';
type Props = RecordsProps & Readonly<{ onSelect: (id: string) => void; onCreate: () => void }>;
export function PortfolioList(props: Props) {
  const labels = getLabels(props.language);
  const { request, setRequest, save, removed, remove, restore } = useEntities(props);
  return (
    <section>
      <div className="section-top">
        <button className="primary" onClick={props.onCreate}>
          + {labels.create}
        </button>
      </div>
      <PortfolioSelection {...props} removed={removed} onManage={setRequest} onRestore={restore} />
      <div className="portfolio-list">
        {props.state.portfolios.map((portfolio) => (
          <PortfolioRow
            key={portfolio.id}
            {...props}
            id={portfolio.id}
            removed={removed}
            onManage={setRequest}
            onRestore={restore}
          />
        ))}
      </div>
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
export type ManageProps = Props &
  Readonly<{
    removed: RemovedMap;
    onManage: (request: EntityRequest) => void;
    onRestore: (key: string) => void;
  }>;
function PortfolioSelection({
  state,
  portfolioId,
  language,
  removed,
  onSelect,
  onManage,
  onRestore,
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
        <Count value={selected.length} />
      </summary>
      <SelectionFields state={state} selected={selected} language={language} onToggle={toggle} />
      {selected.length === 0 && <p className="quiet">{copy.selectionHelp}</p>}
      <SelectionActions
        selected={selected}
        language={language}
        removed={removed}
        onSelect={onSelect}
        onManage={onManage}
        onRestore={onRestore}
      />
    </details>
  );
}
function PortfolioRow(props: ManageProps & Readonly<{ id: string }>) {
  const portfolio = props.state.portfolios.find((item) => item.id === props.id);
  if (!portfolio) return null;
  const copy = recordsCopy(props.language);
  const key = `portfolio:${portfolio.id}`;
  const action = props.removed.get(key);
  return (
    <article className={action ? 'portfolio-record row-removed' : 'portfolio-record'}>
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
        onRestore={props.onRestore}
      />
      {action && (
        <RowNotice
          text={rowNoticeText(copy, 'portfolio', action)}
          detail={rowNoticeDetail(copy, action)}
          language={props.language}
          onUndo={() => props.onRestore(key)}
        />
      )}
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
  const accountCount = accountSamples.filter((account) => account.portfolioId === id).length;
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
            {accountWord(language, accountCount)} <Count value={accountCount} />
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
  const [removed, setRemoved] = useState<RemovedMap>(new Map());
  const save = (message: string) => props.onSaved?.(message);
  // Архив и удаление прячут строку под встроенное «Отменить» на её месте; набор и расчёт не меняются.
  const remove = (target: EntityRequest, action: 'archive' | 'delete') => {
    setRemoved((current) => new Map([...current, [target.target ?? '', action]]));
  };
  const restore = (key: string) => {
    setRemoved((current) => new Map([...current].filter(([item]) => item !== key)));
    save(undoneText(props.language));
    focusMain({ preventScroll: true });
  };
  useEffect(() => {
    if (request) openDialog('entity-dialog');
  }, [request]);
  return { request, setRequest, save, removed, remove, restore };
}
