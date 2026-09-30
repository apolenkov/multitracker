import { useState } from 'react';
import type { Language } from '../demo/words';
import { copy } from './data';
type Props = Readonly<{ language: Language }>;

export function Recap({ language }: Props) {
  const [weekly, setWeekly] = useState(false);
  const [previous, setPrevious] = useState(false);
  const text = copy(language);
  return (
    <article className="events-story">
      <RecapPeriod language={language} weekly={weekly} onChange={setWeekly} />
      <RecapDate language={language} weekly={weekly} previous={previous} onChange={setPrevious} />
      <h3>
        {weekly ? text('Сводка за неделю', 'Weekly recap') : text('Сводка за день', 'Daily recap')}
      </h3>
      <p>
        {previous
          ? text(
              'В этом учебном периоде: план обновления Orbit и дата отчёта Luma.',
              'In this sample period: an Orbit update plan and a Luma report date.',
            )
          : weekly
            ? text(
                'Три вымышленных события: отчёт, дата выплаты и обновление сети.',
                'Three invented events: a report, a payout date and a network update.',
              )
            : text(
                'В выбранный учебный день: анонс Orbit и пример движения Luma.',
                'On the selected sample day: an Orbit announcement and a Luma movement example.',
              )}
      </p>
      <RecapTranscript language={language} weekly={weekly} previous={previous} />
      <details className="events-recap-note">
        <summary>{text('О сводке', 'About this recap')}</summary>
        <p className="quiet">
          {text(
            'Текст написан для макета. Аудио и генерация не подключены.',
            'Text written for the prototype. No audio or generation service is connected.',
          )}
        </p>
      </details>
    </article>
  );
}

function RecapTranscript({
  language,
  weekly,
  previous,
}: Props & Readonly<{ weekly: boolean; previous: boolean }>) {
  const text = copy(language);
  return (
    <details className="events-transcript" key={`${weekly}-${previous}`}>
      <summary id="recap-transcript">{text('Открыть расшифровку', 'Open transcript')}</summary>
      <p>
        {previous
          ? text(
              'Предыдущий учебный период: Orbit показал план обновления, Luma обозначила дату отчёта. События вымышлены; движение активов не прогнозируется.',
              'Previous sample period: Orbit presented an update plan and Luma shared a report date. These are fictional events; no asset movement is predicted.',
            )
          : weekly
            ? text(
                'Учебная неделя: Luma подготовила вымышленный отчёт, Noma обозначила условную дату выплаты, Orbit показал план обновления. Даты и цифры нужны только для исследования интерфейса. Эти события не оценивают будущую доходность.',
                'Sample week: Luma prepared a fictional report, Noma announced an imaginary payout date and Orbit presented an update plan. Dates and figures only help explore the interface. These events do not assess future returns.',
              )
            : text(
                'Учебный день: команда Orbit дополнила условную документацию. Цена вымышленной Luma изменилась рядом с датой отчёта; это не доказывает причинную связь. Сводка помогает найти темы для чтения, а не выбрать сделку.',
                'Sample day: the Orbit team updated imaginary documentation. Fictional Luma moved near a report date; this does not prove causation. This recap helps find topics to read, not choose a trade.',
              )}
      </p>
    </details>
  );
}

function RecapPeriod({
  language,
  weekly,
  onChange,
}: Props & Readonly<{ weekly: boolean; onChange: (weekly: boolean) => void }>) {
  const text = copy(language);
  return (
    <div className="events-filter" aria-label={text('Период сводки', 'Recap period')}>
      <button type="button" id="recap-daily" aria-pressed={!weekly} onClick={() => onChange(false)}>
        {text('За день', 'Daily')}
      </button>
      <button type="button" id="recap-weekly" aria-pressed={weekly} onClick={() => onChange(true)}>
        {text('За неделю', 'Weekly')}
      </button>
    </div>
  );
}

function RecapDate({
  language,
  weekly,
  previous,
  onChange,
}: Props & Readonly<{ weekly: boolean; previous: boolean; onChange: (value: boolean) => void }>) {
  const text = copy(language);
  return (
    <label htmlFor="recap-date">
      {weekly ? text('Неделя сводки', 'Recap week') : text('День сводки', 'Recap day')}
      <select
        id="recap-date"
        value={previous ? 'previous' : 'current'}
        onChange={(event) => onChange(event.target.value === 'previous')}
      >
        <option value="current">
          {weekly
            ? text('24–30 сентября 2026', '24–30 September 2026')
            : text('30 сентября 2026', '30 September 2026')}
        </option>
        <option value="previous">
          {weekly
            ? text('17–23 сентября 2026', '17–23 September 2026')
            : text('29 сентября 2026', '29 September 2026')}
        </option>
      </select>
    </label>
  );
}
