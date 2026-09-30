import { useEffect, useRef, useState } from 'react';
import './demo.css';
import { ConnectionsPanel, SyncPanel } from './demo/connection-sync.tsx';
import { ImportPanel } from './demo/import-panel.tsx';
import { SettingsPanel } from './demo/settings-panel.tsx';
import { words, type Density, type Props as RouteProps } from './demo/words.ts';

type Props = RouteProps & Readonly<{ density: Density; onDensity: (v: Density) => void }>;

export function DemoScreens(props: Props) {
  const page = useRef<HTMLElement>(null);
  useEffect(() => {
    page.current
      ?.querySelectorAll<HTMLDialogElement>('dialog[open]')
      .forEach((dialog) => dialog.close());
  }, [props.screen]);
  const [notice, setNotice] = useState({ text: '', count: 0, screen: props.screen });
  const notify = (text: string) =>
    setNotice((previous) => ({ text, count: previous.count + 1, screen: props.screen }));
  const t = words[props.language];
  return (
    <section ref={page} className="demo-page">
      <div className="demo-content">
        <p className="demo-intro">{t.intro[props.screen]}</p>
        <div hidden={props.screen !== 'import'}>
          <ImportPanel language={props.language} hidden={props.hidden} notify={notify} />
        </div>
        <div hidden={props.screen !== 'connections'}>
          <ConnectionsPanel language={props.language} notify={notify} />
        </div>
        <div hidden={props.screen !== 'sync'}>
          <SyncPanel language={props.language} notify={notify} />
        </div>
        <div hidden={props.screen !== 'settings'}>
          <SettingsPanel {...props} notify={notify} />
        </div>
      </div>
      <DemoNotice
        text={notice.screen === props.screen ? notice.text : ''}
        count={notice.count}
        language={props.language}
        dismiss={() => setNotice((previous) => ({ ...previous, text: '' }))}
      />
    </section>
  );
}

function DemoNotice({
  text,
  count,
  language,
  dismiss,
}: Readonly<{ text: string; count: number; language: 'ru' | 'en'; dismiss: () => void }>) {
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (text) notice.current?.scrollIntoView({ block: 'nearest' });
  }, [text, count]);
  return (
    <div className="demo-status" ref={notice}>
      <div role="status" aria-live="polite" aria-atomic="true">
        <span key={count}>{text}</span>
      </div>
      {text && (
        <button
          type="button"
          className="icon-close"
          aria-label={language === 'ru' ? 'Закрыть сообщение' : 'Dismiss message'}
          onClick={dismiss}
        >
          ×
        </button>
      )}
    </div>
  );
}
