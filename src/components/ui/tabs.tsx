import type { ComponentProps } from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils.ts';

// Сгенерировано `shadcn add tabs`, оставлены Tabs/TabsList/TabsTrigger и стиль
// «текст + подчёркивание 2px в --primary» без заливки и скруглений.
function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

// Ряд и подчёркнутая кнопка; общие с сортировкой активов, которая не вкладки.
const tabsListClass = 'border-line flex flex-wrap gap-4 border-b';
const tabsTriggerClass =
  'text-muted hover:text-ink hover:bg-transparent data-[state=active]:text-ink data-[state=active]:border-primary -mb-px inline-flex h-11 min-h-0 min-w-11 justify-center cursor-pointer items-center gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 py-0 text-sm font-medium whitespace-nowrap';

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List data-slot="tabs-list" className={cn(tabsListClass, className)} {...props} />
  );
}

// Переключаемое содержимое рендерится вне TabsContent, поэтому ссылки aria-controls
// на несуществующую панель нет.
function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      aria-controls={undefined}
      className={cn(tabsTriggerClass, className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, tabsListClass, tabsTriggerClass };
