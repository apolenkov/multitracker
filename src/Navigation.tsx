import { text } from './i18n.ts';
import { useState, type MouseEvent } from 'react';
import type { Labels, Screen } from './i18n.ts';
const mainScreens = ['overview', 'portfolios', 'history'] as const;
const extraScreens = ['import', 'connections', 'sync', 'settings'] as const;
type Props = Readonly<{ screen: Screen; onScreen: (screen: Screen) => void; labels: Labels }>;
export function Navigation({ screen, onScreen, labels }: Props) {
  const [expanded, setExpanded] = useState(false);
  const choose = (next: Screen) => {
    onScreen(next);
    setExpanded(false);
  };
  return (
    <aside className="sidebar">
      <a
        className="brand"
        href="#overview"
        onClick={(event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          choose('overview');
        }}
      >
        <span className="brand-mark" aria-hidden="true">
          m<span>t</span>
        </span>
        MultiTracker
      </a>
      <p className="brand-note">{labels.demo}</p>
      <nav aria-label={labels.overview} className="navigation">
        <ScreenButtons items={mainScreens} labels={labels} screen={screen} onChoose={choose} />
        <div className="desktop-links">
          <ScreenButtons items={extraScreens} labels={labels} screen={screen} onChoose={choose} />
        </div>
        <button
          className="more-button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {labels.more}
        </button>
        {expanded && (
          <div className="more-menu">
            <ScreenButtons items={extraScreens} labels={labels} screen={screen} onChoose={choose} />
          </div>
        )}
      </nav>
    </aside>
  );
}

type ScreenButtonsProps = Readonly<{
  items: readonly Screen[];
  labels: Labels;
  screen: Screen;
  onChoose: (screen: Screen) => void;
}>;

function ScreenButtons({ items, labels, screen, onChoose }: ScreenButtonsProps) {
  return items.map((item) => (
    <a
      key={item}
      href={`#${item}`}
      aria-current={screen === item ? 'page' : undefined}
      onClick={(event) => {
        if (!isPlainClick(event)) return;
        event.preventDefault();
        onChoose(item);
      }}
    >
      {text(labels, item)}
    </a>
  ));
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}
