import type { ComponentProps } from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils.ts';

// Сгенерировано `shadcn add tabs`, оставлены Tabs/TabsList/TabsTrigger и стиль
// «текст + подчёркивание 2px в --primary» без заливки и скруглений.
function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('border-line flex flex-wrap gap-4 border-b', className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'text-muted hover:text-ink hover:bg-transparent data-[state=active]:text-ink data-[state=active]:border-primary -mb-px inline-flex h-11 min-h-0 cursor-pointer items-center gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 py-0 text-sm font-medium whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger };
