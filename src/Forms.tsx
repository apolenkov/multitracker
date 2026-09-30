import type { Language } from './i18n.ts';
import type { State } from './model/portfolio.ts';
import { EntityDialog } from './forms/EntityDialog.tsx';
import { OperationForm } from './forms/OperationForm.tsx';
export { openDialog, closeDialog, PrivacyDialog } from './Dialog.tsx';
export { EntityDialog } from './forms/EntityDialog.tsx';
export { OperationForm, openOperation } from './forms/OperationForm.tsx';
type Props = Readonly<{ language: Language; onSaved: (message: string) => void }>;
export function PortfolioForm(props: Props) {
  return (
    <EntityDialog {...props} id="portfolio-dialog" entity="portfolio" action="create" name="" />
  );
}
export function BuyForm(props: Props & Readonly<{ state: State; portfolioId: string }>) {
  return <OperationForm {...props} id="buy-dialog" key={props.portfolioId} />;
}
