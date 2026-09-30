import type { DemoState, Language, Texts } from './demo/words.ts';
import { words } from './demo/words.ts';
import './static-states.css';

type Props = Readonly<{
  language: Language;
  state: Exclude<DemoState, 'ready'>;
  onReturn: () => void;
}>;

export function StaticStates({ language, state, onReturn }: Props) {
  const t = language === 'ru' ? words.ru : words.en;
  return (
    <section className="static-state" aria-labelledby="static-state-title">
      <p className="eyebrow">{t.example}</p>
      <h2 id="static-state-title">{new Map(Object.entries(t.demoStates)).get(state)}</h2>
      <p>{new Map(Object.entries(t.stateReasons)).get(state)}</p>
      {state === 'loading' && <LoadingSample t={t} />}
      {state === 'missing' && <p className="unknown-value">{t.unavailable}</p>}
      <button className="primary" onClick={onReturn}>
        {actionLabel(t, state)}
      </button>
    </section>
  );
}

function LoadingSample({ t }: Readonly<{ t: Texts }>) {
  return (
    <div className="loading-sample" aria-busy="true" aria-label={t.demoStates.loading}>
      <span className="skeleton" aria-hidden="true" />
      <span className="skeleton" aria-hidden="true" />
      <span className="skeleton" aria-hidden="true" />
    </div>
  );
}

function actionLabel(t: Texts, state: Props['state']) {
  if (state === 'empty') return t.addExample;
  if (state === 'error') return t.retry;
  return t.returnExample;
}
