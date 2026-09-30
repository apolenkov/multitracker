import { accountSamples, accountLabel } from '../forms/accounts.ts';
import { ActionMenu } from '../ActionMenu.tsx';
import { recordsCopy } from './copy.ts';
import type { RecordsProps } from './data.ts';
export type EntityRequest = Readonly<{
  entity: 'portfolio' | 'account' | 'group';
  action: 'create' | 'edit' | 'archive' | 'delete';
  name: string;
  portfolioId?: string;
  members?: readonly string[];
}>;
export function AccountList({
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
            <div className="account-identity">
              <span aria-hidden="true" className="account-branch" />
              <strong>{accountLabel(account.id, language).split(' · ').at(-1)}</strong>
              <small>{copy.account}</small>
            </div>
            <ActionMenu
              className="account-manage"
              name="account-menu"
              label={`${copy.manage}: ${accountLabel(account.id, language)}`}
            >
              <EntityActions
                entity="account"
                name={accountLabel(account.id, language)}
                portfolioId={id}
                language={language}
                onManage={onManage}
              />
            </ActionMenu>
          </li>
        ))}
    </ul>
  );
}
export function EntityActions({
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
          className={action === 'delete' ? 'danger' : undefined}
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
