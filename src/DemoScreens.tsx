import { useEffect, useRef } from 'react';
import './demo.css';
import './demo-responsive.css';
import { ConnectionsPanel, SyncPanel } from './demo/connection-sync.tsx';
import { ImportPanel } from './demo/import-panel.tsx';
import { SettingsPanel } from './demo/settings-panel.tsx';
import { type Density, type Props as RouteProps } from './demo/words.ts';

type Props = RouteProps & Readonly<{ density: Density; onDensity: (v: Density) => void }>;

export function DemoScreens(props: Props) {
  const page = useRef<HTMLElement>(null);
  useEffect(() => {
    page.current
      ?.querySelectorAll<HTMLDialogElement>('dialog[open]')
      .forEach((dialog) => dialog.close());
  }, [props.screen]);
  return (
    <section ref={page} className="demo-page">
      <div className="demo-content">
        <StandardScreens {...props} />
      </div>
    </section>
  );
}

function StandardScreens(props: Props) {
  return (
    <>
      <div hidden={props.screen !== 'import'}>
        <ImportPanel language={props.language} hidden={props.hidden} notify={props.onSaved} />
      </div>
      <div hidden={props.screen !== 'connections'}>
        <ConnectionsPanel language={props.language} notify={props.onSaved} />
      </div>
      <div hidden={props.screen !== 'sync'}>
        <SyncPanel language={props.language} notify={props.onSaved} />
      </div>
      <div hidden={props.screen !== 'settings'}>
        <SettingsPanel {...props} notify={props.onSaved} />
      </div>
    </>
  );
}
