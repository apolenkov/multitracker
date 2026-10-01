import { Fragment, useEffect, useState } from 'react';
import { cn } from '@/lib/utils.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Icon } from './Icon.tsx';

export type ActionItem = Readonly<{
  label: string;
  ariaLabel: string;
  onSelect: () => void;
  danger?: boolean;
}>;

type Props = Readonly<{
  className: string;
  label: string;
  items: ReadonlyArray<ActionItem>;
  align?: 'start' | 'end';
}>;

export function ActionMenu({ className, label, items, align = 'end' }: Props) {
  // Действие выполняется после закрытия меню: диалог, открытый из пункта,
  // иначе запомнил бы исчезающий пункт как место возврата фокуса.
  const [selected, setSelected] = useState<ActionItem | null>(null);
  useEffect(() => {
    if (!selected) return;
    selected.onSelect();
    setSelected(null);
  }, [selected]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          'action-menu-trigger text-ink hover:bg-surface grid size-11 flex-none place-items-center border-0 bg-transparent p-0',
          className,
        )}
      >
        <Icon name="more" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="record-menu-options"
        side="bottom"
        align={align}
        sideOffset={8}
        collisionPadding={{ bottom: 72, top: 8, left: 16, right: 16 }}
      >
        {items.map((item) => (
          <Fragment key={item.label}>
            {item.danger && <DropdownMenuSeparator />}
            <DropdownMenuItem
              aria-label={item.ariaLabel}
              className={item.danger ? 'danger text-loss' : undefined}
              onSelect={() => setSelected(item)}
            >
              {item.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
