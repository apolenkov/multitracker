import { DecisionsView } from './DecisionsView.tsx';
import { FeesView } from './FeesView.tsx';
import { RiskView } from './RiskView.tsx';
import type { ViewProps } from './types.ts';

export function MetricsView(
  props: ViewProps & Readonly<{ section: 'fees' | 'risk' | 'decisions' }>,
) {
  if (props.section === 'fees') return <FeesView {...props} />;
  if (props.section === 'risk') return <RiskView {...props} />;
  return <DecisionsView {...props} />;
}
