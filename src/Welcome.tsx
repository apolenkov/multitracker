import type { Language, Screen } from './i18n.ts';
import { openDialog } from './Dialog.tsx';

type Props = Readonly<{ language: Language; navigate: (screen: Screen) => void }>;
const words = {
  ru: {
    title: 'Как пользоваться · помощь',
    intro: 'Начните с трёх шагов. Здесь можно спокойно попробовать: все суммы вымышлены.',
    steps: [
      'Выберите или создайте портфель',
      'Добавьте операцию или импортируйте пример',
      'Посмотрите результат и влияние курса',
    ],
    portfolios: 'Открыть портфели',
    operation: 'Добавить операцию',
    import: 'Открыть импорт',
    glossary: 'Короткий словарь',
    terms: [
      ['Портфель', 'Активы и деньги, которые вы хотите учитывать вместе.'],
      [
        'Стоимость приобретения',
        'Затраты по учебным покупкам, включая комиссии и курс на их дату.',
      ],
      ['Результат', 'Разница между текущей оценкой и стоимостью приобретения.'],
      ['Курс валюты', 'Цена доллара в рублях. Курс и цена самого актива меняются отдельно.'],
      ['Внутренний перевод', 'Перемещение между своими счетами. Сам перевод не создаёт доход.'],
    ],
    note: 'Сохранение закрывает форму и показывает учебный результат. Примеры в портфеле не меняются. Ключи, файлы, подключения и синхронизация здесь демонстрационные.',
  },
  en: {
    title: 'Getting started · help',
    intro: 'Start with three steps. Try the controls safely: all amounts are fictional.',
    steps: [
      'Choose or create a portfolio',
      'Add a transaction or import a sample',
      'Review the result and currency effect',
    ],
    portfolios: 'Open portfolios',
    operation: 'Add transaction',
    import: 'Open import',
    glossary: 'Quick glossary',
    terms: [
      ['Portfolio', 'Assets and cash you want to track together.'],
      [
        'Acquisition cost',
        'Costs of sample purchases, including fees and the exchange rate on their date.',
      ],
      ['Result', 'Current valuation minus acquisition cost.'],
      [
        'Exchange rate',
        'The ruble price of a dollar. The rate and the asset price change separately.',
      ],
      [
        'Internal transfer',
        'Moving funds between your own accounts. A transfer itself is not income.',
      ],
    ],
    note: 'Saving closes a form and shows a sample result. Portfolio examples stay fixed. Keys, files, connections and sync are demonstrations here.',
  },
};
export function Welcome({ language, navigate }: Props) {
  const t = language === 'ru' ? words.ru : words.en;
  return (
    <details className="welcome-guide">
      <summary>{t.title}</summary>
      <p>{t.intro}</p>
      <ol className="welcome-steps">
        {t.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="toolbar">
        <button onClick={() => navigate('portfolios')}>{t.portfolios}</button>
        <button onClick={() => openDialog('buy-dialog')}>{t.operation}</button>
        <button onClick={() => navigate('import')}>{t.import}</button>
      </div>
      <h2>{t.glossary}</h2>
      <dl className="welcome-glossary">
        {t.terms.map(([term, description]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>
      <p className="quiet">{t.note}</p>
    </details>
  );
}
