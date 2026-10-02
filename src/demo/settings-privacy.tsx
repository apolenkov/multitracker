import { useState } from 'react';
import { SettingsActions } from './settings-display';
import type { SettingFormProps } from './settings-display';

export function RecoverySettings(
  props: SettingFormProps &
    Readonly<{
      recorded: boolean;
      onRecord: (recorded: boolean) => void;
      notify: (message: string) => void;
    }>,
) {
  const [draft, setDraft] = useState(props.recorded);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        props.onRecord(draft);
      }}
    >
      <p>
        {props.text(
          'Ключ остаётся только у владельца. Ниже вымышленная строка, которая ничего не открывает.',
          'The owner alone holds the key. This fixed sample cannot unlock anything.',
        )}
      </p>
      <output className="demo-token">SAMPLE-NOT-A-KEY</output>
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft}
          onChange={(event) => setDraft(event.target.checked)}
        />
        {props.text('Я записал пример в безопасном месте', 'I recorded the sample in a safe place')}
      </label>
      <LostKeyChoices {...props} />
      <SettingsActions {...props} />
    </form>
  );
}

function LostKeyChoices(props: SettingFormProps & Readonly<{ notify: (message: string) => void }>) {
  const choose = (available: boolean) => {
    props.onClose();
    props.notify(lostKeyResult(props.text, available));
  };
  return (
    <section id="settings-lost-key" className="demo-note lost-key-choices">
      <h3>{props.text('Утрата ключа', 'Lost key')}</h3>
      <p>
        {props.text(
          'В будущем зашифрованный портфель без ключа восстановить невозможно. Служба поддержки не сможет его прочитать.',
          'A future encrypted portfolio cannot be recovered without its key. Support cannot read it.',
        )}
      </p>
      <button type="button" onClick={() => choose(true)}>
        {props.text(
          'У меня есть копия или открытое устройство',
          'I have a copy or unlocked device',
        )}
      </button>
      <button type="button" className="quiet" onClick={() => choose(false)}>
        {props.text('Копии нет: новое пустое пространство', 'No copy: new empty workspace')}
      </button>
    </section>
  );
}

function lostKeyResult(text: SettingFormProps['text'], available: boolean) {
  return available
    ? text(
        'Пример: используйте записанный ключ или открытое доверенное устройство. Проверка ключа не выполняется.',
        'Sample: use your recorded key or an unlocked trusted device. No key check is performed.',
      )
    : text(
        'Пример нового пустого пространства. Старые данные недоступны; учебный портфель не изменён.',
        'Sample new empty workspace. Old data is unavailable; the demo portfolio is unchanged.',
      );
}
