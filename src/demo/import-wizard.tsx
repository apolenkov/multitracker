import { useEffect, useRef, useState } from 'react';
import type { ImportDraft, ImportLanguage } from './import-model';
import { importError, importText } from './import-model';
import { ImportSource, ImportFile, ImportMapping, ImportReview } from './import-fields';
import { DemoModal } from './modal';
import { closeDialog } from '../Dialog';
import { accountLabel } from '../forms/accounts';

type WizardProps = Readonly<{
  language: ImportLanguage;
  hidden: boolean;
  initial: ImportDraft;
  onClose: () => void;
  onComplete: (draft: ImportDraft) => void;
}>;
const steps = [
  ['Источник', 'Source'],
  ['Файл', 'File'],
  ['Столбцы', 'Columns'],
  ['Проверка', 'Review'],
  ['Подтверждение', 'Confirmation'],
] as const;
export function ImportWizard({ language, hidden, initial, onClose, onComplete }: WizardProps) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const error = attempt > 0 ? importError(draft, step, language) : '';
  function advance() {
    const issue = importError(draft, step, language);
    setAttempt(attempt + 1);
    if (issue) return;
    if (step < 4) {
      setStep(step + 1);
      setAttempt(0);
    } else {
      onComplete(draft);
      closeDialog('import-wizard');
    }
  }
  function back() {
    setStep(step - 1);
    setAttempt(0);
  }
  return (
    <DemoModal
      id="import-wizard"
      title={importText(language, 'Импорт файла', 'Import file')}
      language={language}
      onClose={onClose}
    >
      <WizardProgress step={step} language={language} />
      <WizardStep
        step={step}
        language={language}
        hidden={hidden}
        draft={draft}
        error={error}
        update={setDraft}
      />
      <WizardError error={error} attempt={attempt} />
      <WizardActions step={step} language={language} back={back} advance={advance} />
    </DemoModal>
  );
}
function WizardError({ error, attempt }: Readonly<{ error: string; attempt: number }>) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!error) return;
    const field = ref.current
      ?.closest('dialog')
      ?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (field ?? ref.current)?.focus();
  }, [error, attempt]);
  return error ? (
    <p id="import-error" ref={ref} tabIndex={-1} role="alert" className="field-error">
      {error}
    </p>
  ) : null;
}
function WizardActions({
  step,
  language,
  back,
  advance,
}: Readonly<{
  step: number;
  language: ImportLanguage;
  back: () => void;
  advance: () => void;
}>) {
  return (
    <div className="form-actions import-actions">
      <button type="button" onClick={() => closeDialog('import-wizard')}>
        {importText(language, 'Отмена', 'Cancel')}
      </button>
      {step > 0 && (
        <button type="button" id="import-back" onClick={back}>
          {importText(language, 'Назад', 'Back')}
        </button>
      )}
      <button type="button" id="import-next" className="primary" onClick={advance}>
        {step === 4
          ? importText(language, 'Подтвердить импорт', 'Confirm import')
          : importText(language, 'Далее', 'Next')}
      </button>
    </div>
  );
}
function WizardProgress({ step, language }: Readonly<{ step: number; language: ImportLanguage }>) {
  const current = steps.at(step);
  return (
    <p className="import-current-step" role="status" aria-live="polite">
      {language === 'ru' ? `Шаг ${step + 1} из 5` : `Step ${step + 1} of 5`} ·{' '}
      {current && importText(language, current[0], current[1])}
    </p>
  );
}
function WizardStep({
  step,
  language,
  hidden,
  draft,
  error,
  update,
}: Readonly<{
  step: number;
  language: ImportLanguage;
  hidden: boolean;
  draft: ImportDraft;
  error: string;
  update: (draft: ImportDraft) => void;
}>) {
  const props = { language, draft, update, error, scope: 'wizard' as const };
  if (step === 0) return <ImportSource {...props} />;
  if (step === 1) return <ImportFile {...props} />;
  if (step === 2) return <ImportMapping {...props} hidden={hidden} />;
  if (step === 3) return <ImportReview {...props} hidden={hidden} />;
  return <ImportConfirmation language={language} draft={draft} />;
}
function ImportConfirmation({
  language,
  draft,
}: Readonly<{ language: ImportLanguage; draft: ImportDraft }>) {
  return (
    <div>
      <h3>{importText(language, 'Итог проверки', 'Review summary')}</h3>
      <p>
        {draft.source} → {accountLabel(draft.account, language)}
      </p>
      <p>
        {importText(
          language,
          'К добавлению: 2 · К пропуску: 2 (1 ошибка актива, 1 повтор)',
          'To add: 2 · To skip: 2 (1 unknown asset, 1 duplicate)',
        )}
      </p>
      <p>
        {importText(
          language,
          'Подтверждение закрывает пример. Операции, остатки и история не меняются.',
          'Confirmation closes the sample. Activity, balances and history stay unchanged.',
        )}
      </p>
    </div>
  );
}
