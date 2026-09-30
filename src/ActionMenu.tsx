import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon.tsx';

type Props = Readonly<{
  name: 'record-menu' | 'account-menu' | 'portfolio-menu';
  className: string;
  label: string;
  children: ReactNode;
}>;

export function ActionMenu({ name, className, label, children }: Props) {
  const [position, setPosition] = useState<CSSProperties>({});
  const [opened, setOpened] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const listener = (event: KeyboardEvent) => closeMenu(event, details);
    details.addEventListener('keydown', listener);
    return () => details.removeEventListener('keydown', listener);
  }, []);
  useEffect(() => {
    const details = ref.current;
    if (!opened || !details) return;
    const reposition = () => {
      details.scrollIntoView({ block: 'nearest' });
      setPosition(menuPosition(details));
    };
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [opened]);
  return (
    <details
      ref={ref}
      className={`action-menu ${className}`}
      name={name}
      onToggle={(event) => {
        setOpened(event.currentTarget.open);
        if (event.currentTarget.open) setPosition(menuPosition(event.currentTarget));
      }}
    >
      <summary aria-label={label}>
        <Icon name="more" />
      </summary>
      <div className="record-menu-options" style={position}>
        {children}
      </div>
    </details>
  );
}

function closeMenu(event: KeyboardEvent, details: HTMLDetailsElement) {
  if (event.key !== 'Escape' || !details.open) return;
  event.preventDefault();
  event.stopPropagation();
  details.removeAttribute('open');
  details.querySelector('summary')?.focus();
}

function menuPosition(details: HTMLDetailsElement): CSSProperties {
  const anchor = details.getBoundingClientRect();
  const menu = details.querySelector<HTMLElement>('.record-menu-options');
  if (!menu) return {};
  const width = menu.getBoundingClientRect().width;
  const navigation = document.querySelector('.navigation');
  const bottom =
    navigation && getComputedStyle(navigation).position === 'fixed'
      ? navigation.getBoundingClientRect().top
      : window.innerHeight;
  const below = bottom - anchor.bottom - 16;
  const above = anchor.top - 16;
  const up = below < menu.scrollHeight + 10 && above > below;
  const left = Math.max(
    16,
    Math.min(anchor.right - width, document.documentElement.clientWidth - width - 16),
  );
  return {
    left: left - anchor.left,
    top: up ? 'auto' : 'calc(100% + 8px)',
    bottom: up ? 'calc(100% + 8px)' : 'auto',
    maxHeight: Math.max(44, (up ? above : below) - 8),
  };
}
