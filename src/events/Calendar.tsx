import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import type { Language } from '../demo/words';
import { calendar, calendarKinds, copy, eventDate, local } from './data';
import type { CalendarEvent, CalendarKind } from './data';
import { Icon } from '../Icon';
import { EventDialog } from './EventDialog';

type Props = Readonly<{ language: Language }>;

export function Calendar({ language }: Props) {
  const [kind, setKind] = useState<CalendarKind>('all');
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [saved, setSaved] = useState(false);
  const [selection, setSelection] = useState({ date: '', asset: '' });
  const text = copy(language);
  const clear = () => {
    setKind('all');
    setSelection({ date: '', asset: '' });
  };
  const items = calendar.filter(
    (item) =>
      (kind === 'all' || item.kind === kind) &&
      item.date.startsWith(selection.date) &&
      item.id.startsWith(selection.asset),
  );
  return (
    <section className="events-calendar" aria-labelledby="events-calendar-title">
      <CalendarHeading language={language} />
      <CalendarFilters language={language} kind={kind} onChange={setKind} />
      <CalendarList
        language={language}
        items={items}
        onReset={clear}
        onOpen={(item) => {
          setSaved(false);
          setSelected(item);
        }}
      />
      <details className="events-refine">
        <summary id="events-more-filters">
          {text('Уточнить дату и актив', 'Refine date and asset')}
        </summary>
        <CalendarSelection language={language} value={selection} onChange={setSelection} />
      </details>
      <CalendarNotice language={language} saved={saved} />
      {selected && (
        <EventDialog
          event={selected}
          language={language}
          onClose={() => setSelected(null)}
          onSave={() => {
            setSaved(true);
            setSelected(null);
          }}
        />
      )}
    </section>
  );
}

function CalendarFilters(
  props: Props & Readonly<{ kind: CalendarKind; onChange: (kind: CalendarKind) => void }>,
) {
  return (
    <Tabs
      value={props.kind}
      onValueChange={(id) =>
        props.onChange(calendarKinds.find((item) => item.id === id)?.id ?? props.kind)
      }
    >
      <TabsList
        className="events-filter"
        aria-label={copy(props.language)('Категория события', 'Event category')}
      >
        {calendarKinds.map((kind) => (
          <TabsTrigger id={`events-filter-${kind.id}`} key={kind.id} value={kind.id}>
            {local(props.language, kind.label)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function CalendarRow({
  item,
  language,
  onOpen,
}: Props & Readonly<{ item: CalendarEvent; onOpen: () => void }>) {
  return (
    <button type="button" id={`event-${item.id}`} className="event-row" onClick={onOpen}>
      <time dateTime={item.date}>{eventDate(language, item.date)} UTC</time>
      <span className="event-row-info">
        <span className="event-type">
          {local(
            language,
            calendarKinds.find((kind) => kind.id === item.kind)?.label ?? {
              ru: 'Событие',
              en: 'Event',
            },
          )}
        </span>
        <span>{local(language, item.title)}</span>
      </span>
      <span className="event-row-action">
        <Icon name="chevron" />
        <span className="visually-hidden">{copy(language)('Подробнее', 'Details')}</span>
      </span>
    </button>
  );
}

function CalendarList({
  language,
  items,
  onOpen,
  onReset,
}: Props &
  Readonly<{
    items: ReadonlyArray<CalendarEvent>;
    onOpen: (event: CalendarEvent) => void;
    onReset: () => void;
  }>) {
  return (
    <ol className="events-timeline">
      {items.length === 0 && (
        <li className="events-empty">
          {copy(language)(
            'Нет событий для выбранных фильтров. Выберите все даты и активы.',
            'No events match these filters. Select all dates and assets.',
          )}
          <button type="button" id="events-reset-filters" onClick={onReset}>
            {copy(language)('Сбросить фильтры', 'Reset filters')}
          </button>
        </li>
      )}
      {items.map((item) => (
        <li key={item.id}>
          <CalendarRow item={item} language={language} onOpen={() => onOpen(item)} />
        </li>
      ))}
    </ol>
  );
}

function CalendarSelection(
  props: Props &
    Readonly<{
      value: Readonly<{ date: string; asset: string }>;
      onChange: (value: Readonly<{ date: string; asset: string }>) => void;
    }>,
) {
  const text = copy(props.language);
  return (
    <div className="widget-options events-selection">
      <label htmlFor="events-date">
        {text('Дата', 'Date')}
        <select
          id="events-date"
          value={props.value.date}
          onChange={(event) => props.onChange({ ...props.value, date: event.target.value })}
        >
          <option value="">{text('Все даты', 'All dates')}</option>
          {calendar.map((item) => (
            <option key={item.id} value={item.date.slice(0, 10)}>
              {eventDate(props.language, item.date)} UTC
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="events-asset">
        {text('Учебный актив', 'Sample asset')}
        <select
          id="events-asset"
          value={props.value.asset}
          onChange={(event) => props.onChange({ ...props.value, asset: event.target.value })}
        >
          <option value="">{text('Все активы', 'All assets')}</option>
          <option value="luma">Luma</option>
          <option value="noma">Noma</option>
          <option value="orbit">Orbit</option>
        </select>
      </label>
    </div>
  );
}

function CalendarNotice({ language, saved }: Props & Readonly<{ saved: boolean }>) {
  return (
    <p className="events-confirm" role="status">
      {saved &&
        copy(language)(
          'Учебный пример сохранён. Напоминание не отправляется.',
          'Sample saved. No reminder is sent.',
        )}
    </p>
  );
}

function CalendarHeading({ language }: Props) {
  const text = copy(language);
  return (
    <div className="events-section-heading">
      <h2 id="events-calendar-title">{text('Календарь', 'Calendar')}</h2>
      <span className="quiet">{text('Октябрь 2026 · UTC', 'October 2026 · UTC')}</span>
    </div>
  );
}
