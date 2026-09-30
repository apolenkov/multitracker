import type { Props } from './demo/words.ts';
import { MarketScreens } from './market/MarketScreens.tsx';
import { AnalyticsScreen } from './analytics/AnalyticsScreen.tsx';
import { EventsScreen } from './events/EventsScreen.tsx';

export function ExplorationScreens(props: Props) {
  const marketVisible = props.screen === 'markets' || props.screen === 'following';
  return (
    <>
      <div hidden={!marketVisible}>
        <MarketScreens
          screen={props.screen === 'following' ? 'following' : 'markets'}
          language={props.language}
          currency={props.currency}
          hidden={props.hidden}
        />
      </div>
      <div hidden={props.screen !== 'analytics'}>
        <AnalyticsScreen
          language={props.language}
          currency={props.currency}
          baseCurrency={props.baseCurrency}
          hidden={props.hidden}
        />
      </div>
      <div hidden={props.screen !== 'events'}>
        <EventsScreen language={props.language} hidden={props.hidden} />
      </div>
    </>
  );
}
