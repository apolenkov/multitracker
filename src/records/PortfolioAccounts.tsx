import { accountSamples, accountLabel } from '../forms/accounts.ts';
import { RowAction } from '../RowActions.tsx';
import { recordsCopy } from './copy.ts';
import type { RecordsProps } from './data.ts';
export type EntityRequest = Readonly<{
  entity: 'portfolio' | 'account' | 'group';
  action: 'create' | 'edit';
  name: string;
  // Ключ строки, которую архив или удаление убирают из списка вкладки.
  target?: string;
  portfolioId?: string;
  members?: readonly string[];
}>;
export function AccountList({
  id,
  name,
  language,
  removed,
  onManage,
}: Readonly<{
  id: string;
  name: string;
  language: RecordsProps['language'];
  removed: readonly string[];
  onManage: (request: EntityRequest) => void;
}>) {
  return (
    <ul className="account-list">
      {accountSamples
        .filter(
          (account) => account.portfolioId === id && !removed.includes(`account:${account.id}`),
        )
        .map((account) => (
          <AccountRow key={account.id} id={account.id} language={language} onManage={onManage} />
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
  id,
  language,
  onManage,
}: Readonly<{
  id: string;
  language: RecordsProps['language'];
  onManage: (request: EntityRequest) => void;
}>) {
  const account = accountSamples.find((item) => item.id === id);
  const label = accountLabel(id, language);
  return (
    <li>
      <strong>{label.split(' · ').at(-1)}</strong>
      <RowAction
        icon="edit"
        label={recordsCopy(language).edit}
        subject={label}
        onClick={() =>
          onManage({
            entity: 'account',
            action: 'edit',
            name: label,
            target: `account:${id}`,
            ...(account ? { portfolioId: account.portfolioId } : {}),
          })
        }
      />
    </li>
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
