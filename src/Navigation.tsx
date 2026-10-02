import { text } from './i18n.ts';
import { Icon } from './Icon.tsx';
import { useEffect, useState, type MouseEvent } from 'react';
import type { Labels, Screen } from './i18n.ts';
const mainScreens = ['overview', 'portfolios', 'history'] as const;
const extraScreens = ['import', 'connections', 'sync', 'settings'] as const;
type Props = Readonly<{ screen: Screen; onScreen: (screen: Screen) => void; labels: Labels }>;
export function Navigation({ screen, onScreen, labels }: Props) {
  const [expanded, setExpanded] = useMoreMenu();
  const choose = (next: Screen) => {
    onScreen(next);
    setExpanded(false);
  };
  return (
    <aside className="sidebar">
      <Brand labels={labels} onChoose={choose} />
      <nav aria-label={labels.overview} className="navigation">
        <div className="desktop-links">
          <NavigationGroups labels={labels} screen={screen} onChoose={choose} />
        </div>
        <div className="mobile-links">
          <ScreenButtons
            items={mainScreens}
            labels={labels}
            screen={screen}
            onChoose={choose}
            spanTitles
          />
          <MoreButton
            screen={screen}
            labels={labels}
            expanded={expanded}
            toggle={() => setExpanded(!expanded)}
          />
        </div>
        {expanded && (
          <div className="more-menu" id="navigation-more">
            <ScreenButtons items={extraScreens} labels={labels} screen={screen} onChoose={choose} />
          </div>
        )}
      </nav>
    </aside>
  );
}

function MoreButton({
  screen,
  labels,
  expanded,
  toggle,
}: Pick<Props, 'screen' | 'labels'> & Readonly<{ expanded: boolean; toggle: () => void }>) {
  return (
    <button
      id="navigation-more-button"
      className="more-button"
      aria-expanded={expanded}
      aria-controls="navigation-more"
      aria-current={extraScreens.some((item) => item === screen) ? 'page' : undefined}
      onClick={toggle}
    >
      <Icon name="menu" />
      <span>{labels.more}</span>
    </button>
  );
}

function NavigationGroups(props: Omit<ScreenButtonsProps, 'items'>) {
  const ru = props.labels.overview === 'Обзор';
  const groups = [
    {
      title: ru ? 'Мой портфель' : 'My portfolio',
      items: ['overview', 'portfolios', 'history'],
    },
    {
      title: ru ? 'Данные и настройки' : 'Data and settings',
      items: ['import', 'connections', 'sync', 'settings'],
    },
  ] as const;
  return groups.map((group) => (
    <section className="navigation-group" key={group.title} aria-label={group.title}>
      <p>{group.title}</p>
      <ScreenButtons {...props} items={group.items} />
    </section>
  ));
}

function useMoreMenu() {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !expanded) return;
      setExpanded(false);
      document.getElementById('navigation-more-button')?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [expanded]);
  return [expanded, setExpanded] as const;
}

type ScreenButtonsProps = Readonly<{
  items: readonly Screen[];
  labels: Labels;
  screen: Screen;
  onChoose: (screen: Screen) => void;
  spanTitles?: boolean;
}>;

function Brand({ labels, onChoose }: Pick<ScreenButtonsProps, 'labels' | 'onChoose'>) {
  return (
    <>
      <a
        className="brand"
        href="#overview"
        onClick={(event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          onChoose('overview');
        }}
      >
        <span className="brand-mark" aria-hidden="true">
          <Icon name="brand" />
        </span>
        MultiTracker
      </a>
      <p className="brand-note">{labels.demo}</p>
    </>
  );
}

function ScreenButtons({ items, labels, screen, onChoose, spanTitles }: ScreenButtonsProps) {
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
      <Icon name={item} />
      <span {...(spanTitles === true ? { title: text(labels, item) } : {})}>
        {text(labels, item)}
      </span>
    </a>
  ));
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}
