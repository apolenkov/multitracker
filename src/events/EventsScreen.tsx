import { useState } from 'react';
import type { Language } from '../demo/words';
import { Calendar } from './Calendar';
import { Feed } from './Feed';
import { copy } from './data';
import './events.css';

type Props = Readonly<{ language: Language; hidden: boolean }>;
type EventsView = 'calendar' | 'updates';

export function EventsScreen({ language, hidden }: Props) {
  const [view, setView] = useState<EventsView>('calendar');
  return (
    <div className="events-screen" data-balances-hidden={hidden} data-events-view={view}>
      <EventsSwitch language={language} view={view} onChange={setView} />
      <div className="events-layout">
        <div id="events-calendar-panel">
          <Calendar language={language} />
        </div>
        <div id="events-updates-panel">
          <Feed language={language} hidden={hidden} />
        </div>
      </div>
      <EventsDisclosure language={language} />
    </div>
  );
}

function EventsDisclosure({ language }: Readonly<{ language: Language }>) {
  const text = copy(language);
  return (
    <details className="events-disclosure">
      <summary>{text('О данных', 'About the data')}</summary>
      <p>
        {text(
          'Все события, организации и новости вымышлены. Это не текущие данные и не инвестиционные рекомендации.',
          'Every event, organization and story is fictional. These are not live data or investment advice.',
        )}
      </p>
    </details>
  );
}

function EventsSwitch({
  language,
  view,
  onChange,
}: Readonly<{
  language: Language;
  view: EventsView;
  onChange: (view: EventsView) => void;
}>) {
  const text = copy(language);
  return (
    <div
      className="events-view-switch"
      role="group"
      aria-label={text('Раздел событий', 'Events section')}
    >
      <button
        type="button"
        id="events-view-calendar"
        aria-pressed={view === 'calendar'}
        aria-controls="events-calendar-panel"
        onClick={() => onChange('calendar')}
      >
        {text('Календарь', 'Calendar')}
      </button>
      <button
        type="button"
        id="events-view-updates"
        aria-pressed={view === 'updates'}
        aria-controls="events-updates-panel"
        onClick={() => onChange('updates')}
      >
        {text('Обновления', 'Updates')}
      </button>
    </div>
  );
}
