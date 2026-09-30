import { useEffect, useState } from 'react';
import { demoAccount, getLabels, money } from '../i18n.ts';
import { summarize, selectedBuys } from '../model/portfolio.ts';
import { EntityDialog, openDialog } from '../Forms.tsx';
import { recordsCopy } from './copy.ts';
import type { RecordsProps } from './data.ts';
import { accountSamples, accountLabel } from '../forms/accounts.ts';

type EntityRequest = Readonly<{
  entity: 'portfolio' | 'account' | 'group';
  action: 'create' | 'edit' | 'archive' | 'delete';
  name: string;
  portfolioId?: string;
  members?: readonly string[];
}>;
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
      <summary>{copy.selectMany}</summary>
      <SelectionFields state={state} selected={selected} language={language} onToggle={toggle} />
      <p className="quiet">{copy.selectionHelp}</p>
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
        <button onClick={() => onManage({ entity: 'group', action: 'create', name: '' })}>
          {copy.addGroup}
        </button>
      </div>
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
        <AccountList {...props} />
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
    </article>
  );
}
function PortfolioValue({
  state,
  id,
  name,
  language,
  currency,
  hidden,
  onSelect,
}: Props & Readonly<{ id: string; name: string }>) {
  const labels = getLabels(language);
  const result = summarize(state, id, currency);
  return (
    <button className="portfolio-row" onClick={() => onSelect(id)}>
      <span className="portfolio-initial" aria-hidden="true">
        {name.slice(0, 1)}
      </span>
      <span className="portfolio-name">
        <strong>{name}</strong>
        <small>
          {labels.venue}: {name} · {demoAccount(id, language)}
        </small>
        <small>
          {labels.buy}: {selectedBuys(state, id).length}
        </small>
      </span>
      <span className="portfolio-value">
        <small className="quiet">{labels.total}</small>
        {hidden ? '••••' : money(result.value, currency, language)}
        <small className={result.profit >= 0 ? 'positive' : 'negative'}>
          {labels.result}: {hidden ? '••••' : money(result.profit, currency, language, true)}
        </small>
      </span>
      <span aria-hidden="true">↗</span>
    </button>
  );
}
function AccountList({
  id,
  language,
  onManage,
}: Readonly<{
  id: string;
  language: RecordsProps['language'];
  onManage: (request: EntityRequest) => void;
}>) {
  const copy = recordsCopy(language);
  return (
    <ul className="account-list">
      {accountSamples
        .filter((account) => account.portfolioId === id)
        .map((account) => (
          <li key={account.id}>
            <strong>
              {copy.account}: {accountLabel(account.id, language)}
            </strong>

            <EntityActions
              entity="account"
              name={accountLabel(account.id, language)}
              portfolioId={id}
              language={language}
              onManage={onManage}
            />
          </li>
        ))}
    </ul>
  );
}
function EntityActions({
  entity,
  name,
  portfolioId,
  members,
  language,
  onManage,
}: Readonly<
  Omit<EntityRequest, 'action'> & {
    language: RecordsProps['language'];
    onManage: (request: EntityRequest) => void;
  }
>) {
  const copy = recordsCopy(language);
  return (
    <div className="record-actions">
      {(['edit', 'archive', 'delete'] as const).map((action) => (
        <button
          key={action}
          onClick={() =>
            onManage({
              entity,
              action,
              name,
              ...(portfolioId ? { portfolioId } : {}),
              ...(members ? { members } : {}),
            })
          }
        >
          {new Map(Object.entries(copy)).get(action)}
        </button>
      ))}
    </div>
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
