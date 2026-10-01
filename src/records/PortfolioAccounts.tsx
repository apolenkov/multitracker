import { accountSamples, accountLabel } from '../forms/accounts.ts';
import { ActionMenu, type ActionItem } from '../ActionMenu.tsx';
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
              label={`${copy.manage}: ${accountLabel(account.id, language)}`}
              items={entityActions({
                entity: 'account',
                name: accountLabel(account.id, language),
                portfolioId: id,
                language,
                onManage,
              })}
            />
          </li>
        ))}
    </ul>
  );
}
type EntityActionParams = Readonly<
  Omit<EntityRequest, 'action'> & {
    language: RecordsProps['language'];
    onManage: (request: EntityRequest) => void;
  }
>;
export function entityActions({
  entity,
  name,
  portfolioId,
  members,
  language,
  onManage,
}: EntityActionParams): ReadonlyArray<ActionItem> {
  const copy = recordsCopy(language);
  const actions = [
    ['edit', copy.edit],
    ['archive', copy.archive],
    ['delete', copy.delete],
  ] as const;
  return actions.map(([action, label]) => ({
    label,
    ariaLabel: `${label}: ${name}`,
    danger: action === 'delete',
    onSelect: () =>
      onManage({
        entity,
        action,
        name,
        ...(portfolioId ? { portfolioId } : {}),
        ...(members ? { members } : {}),
      }),
  }));
}
export function EntityActionButtons(params: EntityActionParams) {
  return (
    <div className="record-actions">
      {entityActions(params).map((item) => (
        <button
          key={item.label}
          className={item.danger ? 'danger' : undefined}
          onClick={item.onSelect}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
