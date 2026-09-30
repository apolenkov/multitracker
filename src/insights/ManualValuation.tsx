import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { assessmentDate, type Asset } from '../model/portfolio.ts';
import type { Language } from '../i18n.ts';
import { insightWords } from './words.ts';

type Props = Readonly<{
  asset: Asset;
  language: Language;
  onCancel: () => void;
  onSave: () => void;
}>;

export function ManualValuation({ asset, language, onCancel, onSave }: Props) {
  const words = insightWords(language);
  return (
    <form
      className="asset-price-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <p className="quiet">{words.valuationNote}</p>
      <ValuationFields asset={asset} language={language} onCancel={onCancel} />
      <div className="form-actions">
        <button type="button" onClick={onCancel} onKeyDown={cancelOnEscape(onCancel)}>
          {words.cancel}
        </button>
        <button type="submit" className="primary" onKeyDown={cancelOnEscape(onCancel)}>
          {words.saveValuation}
        </button>
      </div>
    </form>
  );
}

function ValuationFields({
  asset,
  language,
  onCancel,
}: Readonly<{ asset: Asset; language: Language; onCancel: () => void }>) {
  const words = insightWords(language);
  const priceInput = useRef<HTMLInputElement>(null);
  useEffect(() => priceInput.current?.focus(), []);
  return (
    <>
      <label>
        {asset} · {words.amount}
        <input
          ref={priceInput}
          onKeyDown={cancelOnEscape(onCancel)}
          type="number"
          name="unit-price"
          required
          min="0.00000001"
          max="10000000"
          step="any"
        />
      </label>
      <label>
        {words.assessed}
        <input
          onKeyDown={cancelOnEscape(onCancel)}
          type="date"
          name="valuation-date"
          required
          min="2000-01-01"
          max={assessmentDate}
          defaultValue={assessmentDate}
        />
      </label>
    </>
  );
}

export function cancelOnEscape(onCancel: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  };
}
