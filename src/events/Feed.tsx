import { useState } from 'react';
import type { Language } from '../demo/words';
import { Recap } from './Recap';
import { DemoModal } from '../demo/modal';
import { copy, feed, feedKinds, followedAnnouncement, local } from './data';
import type { FeedItem, FeedKind } from './data';

type Props = Readonly<{ language: Language; hidden: boolean }>;

export function Feed({ language, hidden }: Props) {
  const [kind, setKind] = useState<FeedKind>('recap');
  const [followed, setFollowed] = useState(false);
  const text = copy(language);
  return (
    <section className="events-feed" aria-labelledby="events-feed-title">
      <h2 id="events-feed-title">{text('Обновления', 'Updates')}</h2>
      <div
        className="events-filter events-feed-filter"
        aria-label={text('Категория обновления', 'Update category')}
      >
        {feedKinds.map((category) => (
          <button
            type="button"
            id={`feed-${category.id}`}
            key={category.id}
            aria-pressed={kind === category.id}
            onClick={() => setKind(category.id)}
          >
            {local(language, category.label)}
          </button>
        ))}
      </div>
      {kind === 'announcement' && (
        <AnnouncementScope language={language} followed={followed} onChange={setFollowed} />
      )}
      <FeedContent language={language} hidden={hidden} kind={kind} followed={followed} />
    </section>
  );
}

function Story({
  language,
  hidden,
  item,
  opener,
}: Props & Readonly<{ item: FeedItem; opener?: string }>) {
  const [open, setOpen] = useState(false);
  const text = copy(language);
  return (
    <article className="events-story">
      <p className="quiet">
        {text('30 сентября 2026 · Учебный пример', '30 September 2026 · Educational sample')}
      </p>
      <h3>{local(language, item.title)}</h3>
      <p>{local(language, item.summary)}</p>
      <button type="button" id={`feed-detail-${opener ?? item.id}`} onClick={() => setOpen(true)}>
        {text('Разобрать пример', 'Explore sample')}
      </button>
      {open && (
        <DemoModal
          id="feed-dialog"
          language={language}
          onClose={() => setOpen(false)}
          title={local(language, item.title)}
        >
          <div className="event-dialog-content">
            <p className="quiet">
              {text('30 сентября 2026 · Учебный пример', '30 September 2026 · Educational sample')}
            </p>
            <p>{local(language, item.detail)}</p>
            <StoryMetric language={language} hidden={hidden} item={item} />
            <p className="quiet">
              {text(
                'Источник: вымышленный сценарий макета.',
                'Source: fictional prototype scenario.',
              )}
            </p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setOpen(false)}>
                {text('Закрыть', 'Close')}
              </button>
            </div>
          </div>
        </DemoModal>
      )}
    </article>
  );
}

function AnnouncementScope({
  language,
  followed,
  onChange,
}: Readonly<{ language: Language; followed: boolean; onChange: (value: boolean) => void }>) {
  const text = copy(language);
  return (
    <label htmlFor="announcements-scope">
      {text('Объявления активов', 'Asset announcements')}
      <select
        id="announcements-scope"
        value={followed ? 'followed' : 'all'}
        onChange={(event) => onChange(event.target.value === 'followed')}
      >
        <option value="all">{text('Все учебные активы', 'All sample assets')}</option>
        <option value="followed">
          {text('Наблюдаемые: учебная Noma', 'Followed: sample Noma')}
        </option>
      </select>
    </label>
  );
}

function StoryMetric({ language, hidden, item }: Props & Readonly<{ item: FeedItem }>) {
  const text = copy(language);
  if (item.id === 'insider')
    return (
      <dl className="detail-list">
        <dt>{text('Дата условной покупки', 'Imaginary purchase date')}</dt>
        <dd>{text('29 сентября 2026', '29 September 2026')}</dd>
        <dt>{text('Роль', 'Role')}</dt>
        <dd>{text('Учебный руководитель', 'Sample executive')}</dd>
        <dt>{text('Направление', 'Direction')}</dt>
        <dd>{text('Покупка', 'Purchase')}</dd>
        <dt>{text('Объём', 'Quantity')}</dt>
        <dd>{hidden ? '••••' : text('20 учебных единиц', '20 sample units')}</dd>
      </dl>
    );
  if (item.id === 'crypto')
    return (
      <div className="event-dialog-content">
        <dl className="detail-list">
          <dt>{text('Активные адреса за день', 'Daily active addresses')}</dt>
          <dd>{hidden ? '••••' : text('1 280 адресов', '1,280 addresses')}</dd>
        </dl>
        <p>
          {text(
            '29 сентября 2026, UTC. Активный адрес — условный адрес хотя бы с одной операцией за сутки. Адрес не равен человеку: один человек может иметь несколько адресов. Набор вымышленный.',
            '29 September 2026, UTC. An active address is an imaginary address with at least one transaction that day. An address is not a person: one person may own several addresses. Fictional dataset.',
          )}
        </p>
      </div>
    );
  return null;
}

function FeedContent({
  language,
  hidden,
  kind,
  followed,
}: Props & Readonly<{ kind: FeedKind; followed: boolean }>) {
  if (kind === 'recap') return <Recap language={language} />;
  if (kind === 'announcement')
    return (
      <div className="events-announcements">
        {!followed && (
          <Story
            language={language}
            hidden={hidden}
            item={feed.find((item) => item.id === 'announcement') ?? followedAnnouncement}
          />
        )}
        <Story
          language={language}
          hidden={hidden}
          item={followedAnnouncement}
          opener={followed ? 'announcement' : 'announcement-noma'}
        />
      </div>
    );
  const item = feed.find((entry) => entry.id === kind);
  return item ? <Story key={item.id} language={language} hidden={hidden} item={item} /> : null;
}
