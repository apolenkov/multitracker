import { batch, settleLayout, type Browser } from './ui-driver.ts';
import { crawl } from './ui-smoke-crawl.ts';
import { inspect, query, record, entry, merge, type State, type Outcome } from './ui-smoke-dom.ts';

type Choice = Readonly<{ id: string; name: string; panel: string }>;
function choices(browser: Browser, selector: string): readonly Choice[] {
  const value = query(
    browser,
    '#main',
    `Array.from(element.querySelectorAll(${JSON.stringify(selector)})).filter(item=>item.checkVisibility()&&!item.disabled).map(item=>({id:item.id,name:item.textContent.trim(),panel:item.getAttribute('aria-controls')??item.id}))`,
  );
  if (!Array.isArray(value)) throw new Error('Invalid surface choices');
  return value.map((item: unknown) => {
    if (
      !record(item) ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.panel !== 'string'
    )
      throw new Error('Invalid surface choice');
    if (!/^[a-zA-Z0-9-]+$/.test(item.id))
      throw new Error('Surface choice has no stable identifier');
    return { id: item.id, name: item.name, panel: item.panel };
  });
}
function testedPaths(outcomes: readonly Outcome[]) {
  return outcomes.flatMap((outcome) =>
    outcome.entries
      .filter((item) => item.status !== 'skipped')
      .map((item) => `${item.path}|${item.name}`),
  );
}
function switchSurface(browser: Browser, state: State, choice: Choice) {
  settleLayout(browser);
  const before = query(browser, '#' + choice.id, 'element?.getAttribute("aria-pressed")');
  batch(browser, [
    ['scrollintoview', '#' + choice.id],
    ['click', '#' + choice.id],
  ]);
  settleLayout(browser);
  const after = query(browser, '#' + choice.id, 'element?.getAttribute("aria-pressed")');
  if (after !== 'true') throw new Error(`Surface choice ${choice.id} was not selected`);
  const report = inspect(browser);
  const control = report.controls.find((item) => item.path.endsWith('button#' + choice.id));
  if (!control) throw new Error('Selected surface control was not inventoried');
  return {
    report,
    outcome: {
      entries: [
        entry(
          state,
          control,
          'tested',
          'Actual surface switch; selected state observed before collecting new visible controls',
          { before, after },
        ),
      ],
      findings: [],
    },
  };
}
function categories(
  browser: Browser,
  state: State,
  view: Choice,
  seen: readonly string[],
): Outcome {
  const selector =
    view.panel === 'events-calendar-panel'
      ? '#events-calendar-panel .events-calendar > .events-filter > button'
      : '#events-updates-panel .events-feed-filter > button';
  const available = choices(browser, selector);
  if (available.length === 0) throw new Error('Event surface has no available categories');
  const outcomes = available.reduce<readonly Outcome[]>((previous, choice) => {
    const selected = switchSurface(browser, state, choice);
    const observed = crawl(
      browser,
      state,
      'div#' + view.panel,
      [...seen, ...testedPaths(previous)],
      selected.report,
    );
    return [...previous, merge([selected.outcome, observed])];
  }, []);
  return merge(outcomes);
}
export function eventSurfaces(
  browser: Browser,
  state: State,
  initial: Outcome,
  shared: readonly string[],
): Outcome {
  if (state.route !== 'events') return { entries: [], findings: [] };
  const views = choices(browser, '.events-view-switch > button');
  const surfaces = views.length > 0 ? views : choices(browser, '.events-layout > div');
  if (surfaces.length !== 2) throw new Error('Expected exactly two available event surfaces');
  const outcomes = surfaces.reduce<readonly Outcome[]>((previous, view) => {
    const selected =
      views.length > 0
        ? switchSurface(browser, state, view)
        : { outcome: { entries: [], findings: [] } };
    const observed = categories(browser, state, view, [
      ...shared,
      ...testedPaths([initial, ...previous]),
    ]);
    return [...previous, merge([selected.outcome, observed])];
  }, []);
  return merge(outcomes);
}
