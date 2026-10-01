import type { AppView } from './App.tsx';
import { getLabels, text } from './i18n.ts';
import { demoState, summarize } from './model/portfolio.ts';
import { Overview } from './Overview.tsx';
import { OverviewSummary } from './OverviewSummary.tsx';
import { Holdings } from './Holdings.tsx';
import { Composition } from './insights/Composition.tsx';
import { PortfolioList, History } from './Records.tsx';
import { DemoScreens } from './DemoScreens.tsx';
import { openDialog } from './Forms.tsx';
import { Topbar } from './Topbar.tsx';
import { StaticStates } from './StaticStates.tsx';
import { focusMain, isDemoScreen } from './navigation.ts';
import { UndoButton, undoneText } from './RowActions.tsx';
import { Welcome } from './Welcome.tsx';

export function Workspace({ view }: Readonly<{ view: AppView }>) {
  const labels = getLabels(view.language);
  return (
    <div className="workspace">
      <Topbar view={view} />
      <main id="main" tabIndex={-1}>
        <PageHeading view={view} />
        <StatusMessage view={view} />
        <PageContent view={view} />
      </main>
      <footer className="footer">
        <Welcome language={view.language} navigate={view.navigate} />
        <button onClick={() => openDialog('privacy-dialog')}>{labels.privacy}</button>
        <span>{labels.memory}</span>
      </footer>
    </div>
  );
}
function StatusMessage({ view }: Readonly<{ view: AppView }>) {
  const undo = view.notice.undo;
  return (
    <div className="status-message">
      <div role="status" aria-atomic="true">
        {view.notice.message && <p key={view.notice.sequence}>{view.notice.message}</p>}
      </div>
      {undo && view.notice.message && (
        <UndoButton
          language={view.language}
          onUndo={() => {
            undo();
            view.onSaved(undoneText(view.language));
            focusMain({ preventScroll: true });
          }}
        />
      )}
    </div>
  );
}
function PageContent({ view }: Readonly<{ view: AppView }>) {
  const demoVisible = isDemoScreen(view.screen);
  return (
    <>
      {!demoVisible && <FinancePage view={view} />}
      <div hidden={!demoVisible}>
        <DemoScreens
          screen={view.demoScreen}
          language={view.language}
          currency={view.currency}
          baseCurrency={view.baseCurrency}
          theme={view.theme}
          onLanguage={view.setLanguage}
          onCurrency={view.setCurrency}
          onBaseCurrency={view.setBaseCurrency}
          onTheme={view.setTheme}
          monochrome={view.monochrome}
          onMonochrome={view.setMonochrome}
          hidden={view.hidden}
          onHidden={view.setHidden}
          density={view.density}
          onDensity={view.setDensity}
          demoState={view.demoState}
          onDemoState={view.setDemoState}
          onShowExample={() => view.navigate('overview')}
        />
      </div>
    </>
  );
}
function FinancePage({ view }: Readonly<{ view: AppView }>) {
  if (view.demoState === 'empty' && view.screen === 'overview') {
    return <EmptyOverview view={view} />;
  }
  if (view.demoState !== 'ready' && view.screen !== 'portfolios') {
    return (
      <StaticStates
        language={view.language}
        state={view.demoState}
        onReturn={() => view.setDemoState('ready')}
      />
    );
  }
  const shared = {
    state: demoState,
    portfolioId: view.portfolioId,
    language: view.language,
    currency: view.currency,
    baseCurrency: view.baseCurrency,
    hidden: view.hidden,
  };
  if (view.screen === 'overview') {
    return <Overview {...shared} onBuy={() => openDialog('buy-dialog')} />;
  }
  if (view.screen === 'portfolios') {
    return (
      <PortfolioList
        {...shared}
        onSelect={view.selectPortfolio}
        onCreate={() => openDialog('portfolio-dialog')}
        onSaved={view.onSaved}
      />
    );
  }
  return <History {...shared} onSaved={view.onSaved} />;
}
function EmptyOverview({ view }: Readonly<{ view: AppView }>) {
  const emptyState = { ...demoState, buys: [] };
  const shared = {
    state: emptyState,
    portfolioId: view.portfolioId,
    language: view.language,
    currency: view.currency,
    baseCurrency: view.baseCurrency,
    hidden: view.hidden,
  };
  return (
    <div className="empty-overview">
      <StaticStates
        language={view.language}
        state="empty"
        onReturn={() => view.setDemoState('ready')}
      />
      <OverviewSummary
        result={summarize(emptyState, view.portfolioId, view.currency)}
        currency={view.currency}
        language={view.language}
        hidden={view.hidden}
      />
      <Holdings {...shared} />
      <Composition
        buys={emptyState.buys}
        currency={view.currency}
        language={view.language}
        hidden={view.hidden}
      />
    </div>
  );
}
function PageHeading({ view }: Readonly<{ view: AppView }>) {
  const labels = getLabels(view.language);
  return (
    <div className="page-heading">
      <h1>
        {text(labels, view.screen)}
        {view.screen === 'portfolios' && (
          <span className="count"> {demoState.portfolios.length}</span>
        )}
      </h1>
      {(view.screen === 'overview' || view.screen === 'history') && (
        <div className="page-heading-actions">
          <label className="portfolio-filter">
            <span className="visually-hidden">{labels.portfolio}</span>
            <select
              value={view.portfolioId}
              onChange={(event) => view.setPortfolioId(event.target.value)}
            >
              <option value="all">{labels.all}</option>
              {view.portfolioId.includes(',') && (
                <option value={view.portfolioId}>
                  {demoState.portfolios
                    .filter((portfolio) => view.portfolioId.split(',').includes(portfolio.id))
                    .map((portfolio) => portfolio.name)
                    .join(' + ')}
                </option>
              )}
              {demoState.portfolios.map((portfolio) => (
                <option value={portfolio.id} key={portfolio.id}>
                  {portfolio.name}
                </option>
              ))}
            </select>
          </label>
          {view.screen === 'history' && (
            <button className="primary" onClick={() => openDialog('buy-dialog')}>
              + {labels.add}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
