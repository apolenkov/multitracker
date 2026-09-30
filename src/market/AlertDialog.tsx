import { useRef, useState, type FormEvent } from 'react';
import { DemoModal } from '../demo/modal.tsx';
import { money, type Language } from '../i18n.ts';
import { currentFX, type Currency } from '../model/portfolio.ts';
import { assetPrice, marketAssets, parseThreshold, type PriceAlert } from './data.ts';
import { marketWords } from './words.ts';

type Props = Readonly<{
  symbol: string;
  language: Language;
  currency: Currency;
  hidden: boolean;
  value: PriceAlert | undefined;
  onClose: () => void;
  onSave: (alert: PriceAlert) => void;
}>;
type FieldsProps = Props &
  Readonly<{
    threshold: string;
    invalid: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onThreshold: (value: string) => void;
  }>;

export function AlertDialog(props: Props) {
  const words = marketWords(props.language);
  const model = useAlertDraft(props);
  return (
    <DemoModal
      id="market-alert-dialog"
      title={`${props.value ? words.editAlert : words.newAlert} · ${props.symbol}`}
      language={props.language}
      onClose={props.onClose}
    >
      <form noValidate onSubmit={model.submit}>
        <CurrentAlertPrice {...props} />
        <AlertCondition {...props} model={model} />
        <details id="market-frequency-disclosure" open={model.repeat}>
          <summary>
            {words.frequency} · {model.repeat ? words.repeating : words.once}
          </summary>
          <FrequencyField
            language={props.language}
            repeat={model.repeat}
            onRepeat={model.setRepeat}
          />
        </details>
        <DraftSummary {...props} model={model} />
        <p className="quiet">
          {words.alertNote} {model.repeat && words.repeatingNote}
        </p>
        <div className="dialog-actions">
          <button id="market-cancel-alert" type="button" onClick={props.onClose}>
            {words.cancel}
          </button>
          <button id="market-save-alert" type="submit" className="primary">
            {props.value ? words.saveChanges : words.save}
          </button>
        </div>
      </form>
    </DemoModal>
  );
}

function ThresholdField(props: FieldsProps) {
  const words = marketWords(props.language);
  return (
    <div>
      <label htmlFor="market-threshold">
        {words.threshold} · {props.currency}
      </label>
      <input
        id="market-threshold"
        ref={props.inputRef}
        type={props.hidden ? 'password' : 'text'}
        inputMode="decimal"
        value={props.threshold}
        aria-invalid={props.invalid}
        aria-describedby={
          props.invalid ? 'market-threshold-error market-threshold-hint' : 'market-threshold-hint'
        }
        onChange={(event) => props.onThreshold(event.target.value)}
      />
      <p id="market-threshold-hint" className="quiet">
        {words.fixed}
      </p>
      {props.invalid && (
        <p id="market-threshold-error" className="field-error" role="alert">
          {words.invalid}
        </p>
      )}
    </div>
  );
}

function AlertCondition(props: Props & Readonly<{ model: ReturnType<typeof useAlertDraft> }>) {
  const words = marketWords(props.language);
  return (
    <div className="market-alert-condition">
      <div>
        <label htmlFor="market-condition">
          {props.symbol} · {words.direction}
        </label>
        <select
          id="market-condition"
          value={props.model.direction}
          onChange={(event) =>
            props.model.setDirection(event.target.value === 'below' ? 'below' : 'above')
          }
        >
          <option value="above">{words.above}</option>
          <option value="below">{words.below}</option>
        </select>
      </div>
      <ThresholdField
        {...props}
        threshold={props.model.threshold}
        onThreshold={props.model.setThreshold}
        invalid={props.model.invalid}
        inputRef={props.model.inputRef}
      />
    </div>
  );
}

function FrequencyField(
  props: Readonly<{ language: Language; repeat: boolean; onRepeat: (value: boolean) => void }>,
) {
  const words = marketWords(props.language);
  return (
    <div>
      <label htmlFor="market-frequency">{words.frequency}</label>
      <select
        id="market-frequency"
        value={props.repeat ? 'repeat' : 'once'}
        onChange={(event) => props.onRepeat(event.target.value === 'repeat')}
      >
        <option value="once">{words.once}</option>
        <option value="repeat">{words.repeating}</option>
      </select>
    </div>
  );
}

function CurrentAlertPrice(props: Props) {
  const words = marketWords(props.language);
  const asset = marketAssets.find((item) => item.symbol === props.symbol);
  return (
    <p className="market-alert-current quiet">
      {words.price}:{' '}
      {asset ? assetPrice(asset, asset.price, props.currency, props.language, props.hidden) : '—'}
      {props.value && ` · ${props.value.paused ? words.paused : words.active}`}
    </p>
  );
}

function DraftSummary(props: Props & Readonly<{ model: ReturnType<typeof useAlertDraft> }>) {
  const words = marketWords(props.language);
  const value = parseThreshold(props.model.threshold);
  const amount = props.hidden
    ? '••••'
    : value === undefined
      ? ''
      : money(value, props.currency, props.language);
  return (
    <div className="market-rule-preview">
      <p className="quiet">{words.draft}</p>
      <p>
        {value === undefined
          ? words.noDraft
          : `${props.symbol} · ${props.model.direction === 'above' ? words.above : words.below} ${amount} · ${props.model.repeat ? words.repeating : words.once}`}
      </p>
    </div>
  );
}

function useAlertDraft(props: Props) {
  const factor = props.currency === 'RUB' ? currentFX : 1;
  const [threshold, setThreshold] = useState(props.value ? String(props.value.usd * factor) : '');
  const [direction, setDirection] = useState(props.value?.direction ?? 'above');
  const [repeat, setRepeat] = useState(props.value?.repeat ?? false);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const price = parseThreshold(threshold);
    if (
      price === undefined ||
      !Number.isFinite((price / factor) * currentFX) ||
      price / factor <= 0
    ) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    props.onSave({
      id: props.value?.id ?? Date.now(),
      symbol: props.symbol,
      usd: price / factor,
      direction,
      repeat,
      paused: props.value?.paused ?? false,
    });
  };
  return {
    threshold,
    setThreshold,
    direction,
    setDirection,
    repeat,
    setRepeat,
    invalid,
    inputRef,
    submit,
  };
}
