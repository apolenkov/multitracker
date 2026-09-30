import type { KeyboardEvent } from 'react';
import { assessmentDate } from '../model/portfolio.ts';
import type { Language } from '../i18n.ts';
import { insightWords } from './words.ts';

type Props = Readonly<{ language: Language; onCancel: () => void; onSave: () => void }>;

export function ManualValuation({ language, onCancel, onSave }: Props) {
  const words = insightWords(language);
  return (
    <form
      className="asset-price-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <h3>{words.valuation}</h3>
      <p className="quiet">{words.valuationNote}</p>
      <ValuationFields language={language} onCancel={onCancel} />
      <div className="form-actions">
        <button type="button" onClick={onCancel} onKeyDown={cancelOnEscape(onCancel)}>
          {words.cancel}
        </button>
        <button type="submit" className="primary" onKeyDown={cancelOnEscape(onCancel)}>
          {words.save}
        </button>
      </div>
    </form>
  );
}

function ValuationFields({
  language,
  onCancel,
}: Readonly<{ language: Language; onCancel: () => void }>) {
  const words = insightWords(language);
  return (
    <>
      <label>
        {words.amount}
        <input
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
