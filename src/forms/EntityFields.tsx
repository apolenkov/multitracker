import { getLabels } from '../i18n.ts';
import type { Language } from '../i18n.ts';
import { demoState } from '../model/portfolio.ts';
import type { State } from '../model/portfolio.ts';
import { getFormCopy } from './copy.ts';
import { presentationCopy } from './presentation.ts';
export type EntityProps = Readonly<{
  id: string;
  language: Language;
  entity: 'portfolio' | 'account' | 'group';
  action: 'create' | 'edit' | 'archive' | 'delete';
  name: string;
  portfolioId?: string;
  onSaved: (message: string) => void;
  onClose?: () => void;
  state?: State;
  members?: readonly string[];
}>;
type Props = Readonly<{
  props: EntityProps;
  name: string;
  setName: (name: string) => void;
  error: string;
  members: readonly string[];
  onMember: (id: string, checked: boolean) => void;
}>;
export function EntityFields(props: Props) {
  const copy = getFormCopy(props.props.language);
  return (
    <div className="entity-fields">
      {props.props.entity === 'account' && <ParentField props={props.props} />}
      <NameField {...props} />
      <fieldset className="operation-group">
        <legend>{presentationCopy(props.props.language).display}</legend>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor={`${props.props.id}-currency`}>{copy.currency}</label>
            <select id={`${props.props.id}-currency`}>
              <option>RUB</option>
              <option>USD</option>
            </select>
          </div>
          {props.props.entity === 'portfolio' && <VenueField props={props.props} />}
          {props.props.entity === 'account' && <KindField props={props.props} />}
        </div>
      </fieldset>
      {props.props.entity === 'group' && <GroupFields {...props} />}
    </div>
  );
}
function NameField({ props, name, setName, error }: Props) {
  const invalid = error === getLabels(props.language).nameError;
  return (
    <div className="form-field">
      <label htmlFor={`${props.id}-name`}>{getFormCopy(props.language).entityName}</label>
      <input
        id={`${props.id}-name`}
        value={name}
        maxLength={80}
        onChange={(event) => setName(event.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${props.id}-error` : `${props.id}-hint`}
      />
      {invalid ? (
        <EntityError id={props.id} error={error} />
      ) : (
        <p className="form-hint" id={`${props.id}-hint`}>
          {getLabels(props.language).nameHint}
        </p>
      )}
    </div>
  );
}
export function EntityError({ id, error }: Readonly<{ id: string; error: string }>) {
  return (
    <p className="field-error" id={`${id}-error`} role="alert">
      {error}
    </p>
  );
}
function ParentField({ props }: Readonly<{ props: EntityProps }>) {
  return (
    <fieldset className="operation-group operation-context">
      <legend>{presentationCopy(props.language).parent}</legend>
      <div className="form-field">
        <label htmlFor={`${props.id}-portfolio`}>{getLabels(props.language).portfolio}</label>
        <select id={`${props.id}-portfolio`} defaultValue={props.portfolioId}>
          {(props.state ?? demoState).portfolios.map((portfolio) => (
            <option key={portfolio.id} value={portfolio.id}>
              {portfolio.name}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
function KindField({ props }: Readonly<{ props: EntityProps }>) {
  const copy = getFormCopy(props.language);
  return (
    <div className="form-field">
      <label htmlFor={`${props.id}-kind`}>{copy.accountKind}</label>
      <select id={`${props.id}-kind`}>
        <option>{copy.broker}</option>
        <option>{copy.exchange}</option>
        <option>{copy.bank}</option>
        <option>{copy.wallet}</option>
      </select>
    </div>
  );
}
function VenueField({ props }: Readonly<{ props: EntityProps }>) {
  const copy = getFormCopy(props.language);
  return (
    <div className="form-field">
      <label htmlFor={`${props.id}-venue`}>{getLabels(props.language).venue}</label>
      <select id={`${props.id}-venue`}>
        <option>Tradernet</option>
        <option>Binance</option>
        <option>Bybit</option>
        <option>{copy.bank}</option>
        <option>{copy.wallet}</option>
      </select>
    </div>
  );
}
function GroupFields({ props, members, onMember, error }: Props) {
  const invalid = error === getFormCopy(props.language).selectionError;
  return (
    <fieldset
      className="operation-group entity-members"
      id={`${props.id}-members`}
      aria-describedby={invalid ? `${props.id}-error` : undefined}
    >
      <legend>
        {getFormCopy(props.language).groupPortfolios} · {members.length}
      </legend>
      {(props.state ?? demoState).portfolios.map((portfolio) => (
        <label className="confirmation" key={portfolio.id}>
          <input
            type="checkbox"
            checked={members.includes(portfolio.id)}
            onChange={(event) => onMember(portfolio.id, event.target.checked)}
            aria-invalid={invalid}
          />
          {portfolio.name}
        </label>
      ))}
      {invalid && <EntityError id={props.id} error={error} />}
    </fieldset>
  );
}
