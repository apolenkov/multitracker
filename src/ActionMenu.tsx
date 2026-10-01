import { Fragment, useRef, useState } from 'react';
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
  // Действие выполняется, когда меню уже сняло ловушку фокуса (onCloseAutoFocus): фокус
  // сначала ставится на «⋯», и диалог из пункта запоминает его как место возврата.
  const trigger = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<ActionItem | null>(null);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={trigger}
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
        onCloseAutoFocus={(event) => {
          if (!selected) return;
          event.preventDefault();
          trigger.current?.focus();
          setSelected(null);
          selected.onSelect();
        }}
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
