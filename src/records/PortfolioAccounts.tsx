import { accountSamples, accountLabel } from '../forms/accounts.ts';
import { getLabels, money } from '../i18n.ts';
import { RowAction, RowNotice } from '../RowActions.tsx';
import { recordsCopy, rowNoticeDetail, rowNoticeText } from './copy.ts';
import type { RecordsProps } from './data.ts';
export type EntityRequest = Readonly<{
  entity: 'portfolio' | 'account' | 'group';
  action: 'create' | 'edit';
  name: string;
  // Ключ строки, которую архив или удаление прячут под уведомлением «Отменить».
  target?: string;
  portfolioId?: string;
  members?: readonly string[];
}>;
// Убранные строки: ключ → вид действия, чтобы уведомление назвало архив или удаление.
export type RemovedMap = ReadonlyMap<string, 'archive' | 'delete'>;
export function AccountList({
  id,
  name,
  language,
  hidden,
  removed,
  onManage,
  onRestore,
}: Readonly<{
  id: string;
  name: string;
  language: RecordsProps['language'];
  hidden: boolean;
  removed: RemovedMap;
  onManage: (request: EntityRequest) => void;
  onRestore: (key: string) => void;
}>) {
  return (
    <ul className="account-list">
      {accountSamples
        .filter((account) => account.portfolioId === id)
        .map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            language={language}
            hidden={hidden}
            removed={removed.get(`account:${account.id}`)}
            onManage={onManage}
            onRestore={() => onRestore(`account:${account.id}`)}
          />
        ))}
      <li>
        <button
          type="button"
          className="add-account"
          aria-label={`${recordsCopy(language).addAccount}: ${name}`}
          onClick={() =>
            onManage({ entity: 'account', action: 'create', name: '', portfolioId: id })
          }
        >
          + {recordsCopy(language).addAccount}
        </button>
      </li>
    </ul>
  );
}
function AccountRow({
  account,
  language,
  hidden,
  removed,
  onManage,
  onRestore,
}: Readonly<{
  account: (typeof accountSamples)[number];
  language: RecordsProps['language'];
  hidden: boolean;
  removed: 'archive' | 'delete' | undefined;
  onManage: (request: EntityRequest) => void;
  onRestore: () => void;
}>) {
  const id = account.id;
  const label = accountLabel(id, language);
  const copy = recordsCopy(language);
  return (
    <li className={removed ? 'row-removed' : undefined}>
      <span className="account-name">{label.split(' · ').at(-1)}</span>
      <span className="account-balance">
        {hidden ? '••••' : money(account.balance, account.currency, language)}
      </span>
      <RowAction
        icon="edit"
        label={copy.edit}
        subject={label}
        onClick={() =>
          onManage({
            entity: 'account',
            action: 'edit',
            name: label,
            target: `account:${id}`,
            portfolioId: account.portfolioId,
          })
        }
      />
      {removed && (
        <RowNotice
          text={rowNoticeText(copy, 'account', removed)}
          detail={rowNoticeDetail(copy, removed)}
          language={language}
          onUndo={onRestore}
        />
      )}
    </li>
  );
}
export function SelectionActions({
  selected,
  language,
  removed,
  onSelect,
  onManage,
  onRestore,
}: Readonly<{
  selected: readonly string[];
  language: RecordsProps['language'];
  removed: RemovedMap;
  onSelect: (id: string) => void;
  onManage: (request: EntityRequest) => void;
  onRestore: (key: string) => void;
}>) {
  const copy = recordsCopy(language);
  const groupAction = removed.get('group:crypto');
  return (
    <div className="record-actions">
      <button
        className="primary"
        disabled={selected.length === 0}
        onClick={() => onSelect(selected.join(','))}
      >
        {copy.showSelection}
      </button>
      <span className={groupAction ? 'group-slot row-removed' : 'group-slot'}>
        <GroupButtons language={language} onSelect={onSelect} onManage={onManage} />
        {groupAction && (
          <RowNotice
            text={rowNoticeText(copy, 'group', groupAction)}
            detail={rowNoticeDetail(copy, groupAction)}
            language={language}
            onUndo={() => onRestore('group:crypto')}
          />
        )}
      </span>
      <button
        onClick={() => onManage({ entity: 'group', action: 'create', name: '', members: selected })}
      >
        {copy.addGroup}
      </button>
    </div>
  );
}
export function GroupButtons({
  language,
  onSelect,
  onManage,
}: Readonly<{
  language: RecordsProps['language'];
  onSelect: (id: string) => void;
  onManage: (request: EntityRequest) => void;
}>) {
  const copy = recordsCopy(language);
  const members = ['binance', 'bybit'];
  return (
    <>
      <button onClick={() => onSelect(members.join(','))}>
        {copy.group}: {copy.crypto}
      </button>
      <button
        aria-label={`${copy.editGroup}: ${copy.groupName}`}
        onClick={() =>
          onManage({
            entity: 'group',
            action: 'edit',
            name: copy.groupName,
            target: 'group:crypto',
            members,
          })
        }
      >
        {copy.editGroup}
      </button>
    </>
  );
}
export function SelectionFields({
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
