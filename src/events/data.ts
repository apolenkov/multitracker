import type { Language } from '../demo/words';

export type LocalText = Readonly<{ ru: string; en: string }>;
export type CalendarKind = 'all' | 'report' | 'dividend' | 'network';
export type FeedKind = 'recap' | 'announcement' | 'movement' | 'insider' | 'crypto';
export type CalendarEvent = Readonly<{
  id: string;
  date: string;
  kind: Exclude<CalendarKind, 'all'>;
  title: LocalText;
  detail: LocalText;
}>;
export type FeedItem = Readonly<{
  id: FeedKind;
  title: LocalText;
  summary: LocalText;
  detail: LocalText;
}>;
export const local = (language: Language, value: LocalText) =>
  language === 'ru' ? value.ru : value.en;
export const copy = (language: Language) => (ru: string, en: string) =>
  language === 'ru' ? ru : en;

export const calendarKinds: ReadonlyArray<Readonly<{ id: CalendarKind; label: LocalText }>> = [
  { id: 'all', label: { ru: 'Все события', en: 'All events' } },
  { id: 'report', label: { ru: 'Отчёты', en: 'Reports' } },
  { id: 'dividend', label: { ru: 'Дивиденды', en: 'Dividends' } },
  { id: 'network', label: { ru: 'Сети', en: 'Networks' } },
];
export const calendar: ReadonlyArray<CalendarEvent> = [
  {
    id: 'luma-report',
    date: '2026-10-02T14:00:00Z',
    kind: 'report',
    title: { ru: 'Luma: учебный отчёт', en: 'Luma: sample report' },
    detail: {
      ru: 'Вымышленная Luma показывает квартальный отчёт. В примере сравниваются выручка и расходы; настоящий отчёт не публикуется.',
      en: 'Fictional Luma presents a quarterly report. The sample compares revenue and costs; no real report is published.',
    },
  },
  {
    id: 'noma-dividend',
    date: '2026-10-05T09:00:00Z',
    kind: 'dividend',
    title: { ru: 'Noma: учебная дата дивидендов', en: 'Noma: sample dividend date' },
    detail: {
      ru: 'Вымышленная дата выплаты Noma. Событие помогает проверить календарь, не подтверждает право на выплату и не меняет остатки.',
      en: 'Fictional Noma payout date. This event tests the calendar, does not establish payout eligibility or change balances.',
    },
  },
  {
    id: 'orbit-network',
    date: '2026-10-07T16:00:00Z',
    kind: 'network',
    title: { ru: 'Orbit: учебное обновление сети', en: 'Orbit: sample network update' },
    detail: {
      ru: 'Вымышленная сеть Orbit демонстрирует запланированное обновление. Здесь нет настоящей сети, токенов или перевода средств.',
      en: 'Fictional Orbit demonstrates a scheduled update. There is no actual network, token or transfer of funds here.',
    },
  },
];
export const feedKinds: ReadonlyArray<Readonly<{ id: FeedKind; label: LocalText }>> = [
  { id: 'recap', label: { ru: 'Сводка', en: 'Recap' } },
  { id: 'announcement', label: { ru: 'Анонсы', en: 'Announcements' } },
  { id: 'movement', label: { ru: 'Почему меняется цена', en: 'Why prices move' } },
  { id: 'insider', label: { ru: 'Сделки инсайдеров', en: 'Insider activity' } },
  { id: 'crypto', label: { ru: 'Криптосигналы', en: 'Crypto signals' } },
];
export const feed: ReadonlyArray<FeedItem> = [
  {
    id: 'announcement',
    title: { ru: 'Orbit: сообщение команды проекта', en: 'Orbit: project team announcement' },
    summary: {
      ru: 'Учебный анонс обновления документации.',
      en: 'Sample documentation update announcement.',
    },
    detail: {
      ru: 'Пример официального сообщения вымышленной команды Orbit: документация дополнена схемой обновления сети. Это придуманный текст для проверки интерфейса, не новость о реальном проекте.',
      en: 'Sample official message from fictional Orbit: documentation now includes a network update outline. This invented text tests the interface; it is not news about a real project.',
    },
  },
  {
    id: 'movement',
    title: { ru: 'Luma: что могло изменить цену', en: 'Luma: what could move the price' },
    summary: {
      ru: 'Сопоставьте событие и движение, не путайте их с причиной.',
      en: 'Compare events and movement without assuming causation.',
    },
    detail: {
      ru: 'В учебном сценарии цена Luma выросла после вымышленного отчёта. Совпадение по времени не доказывает причину: могли измениться спрос, ликвидность и общий рынок. Это не прогноз.',
      en: 'In this sample, Luma rises after a fictional report. Timing does not prove causation: demand, liquidity and the broader market may also change. This is not a forecast.',
    },
  },
  {
    id: 'insider',
    title: { ru: 'Noma: как читать раскрытие сделки', en: 'Noma: reading a disclosed transaction' },
    summary: {
      ru: 'Вымышленная операция руководителя для учебного разбора.',
      en: 'An invented executive transaction for explanation.',
    },
    detail: {
      ru: 'Условный руководитель вымышленной Noma приобретает условные учебные единицы. В реальном раскрытии проверяют дату сделки, роль лица и долю владения. Одна операция не объясняет намерения и не служит рекомендацией.',
      en: 'An imaginary executive of fictional Noma acquires imaginary sample units. Real disclosures need transaction dates, the person’s role and ownership context. A single transaction does not reveal intent or provide advice.',
    },
  },
  {
    id: 'crypto',
    title: { ru: 'Orbit: пример сигнала активности', en: 'Orbit: sample activity signal' },
    summary: {
      ru: 'Наблюдение за учебной активностью адресов, без команды покупать.',
      en: 'Observe sample address activity without a buy instruction.',
    },
    detail: {
      ru: 'Число активных адресов Orbit выше условного среднего за семь дней. Низкая база и единичные операции могут искажать такое сравнение. Сигнал — повод изучить данные, не оценка безопасности и не совет совершить сделку.',
      en: 'Sample Orbit active addresses exceed an imaginary seven-day average. A low baseline or isolated transactions can distort this comparison. A signal invites examination, not a safety rating or trading instruction.',
    },
  },
];

export function eventDate(language: Language, date: string) {
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(date));
}

export const followedAnnouncement: FeedItem = {
  id: 'announcement',
  title: { ru: 'Noma: сообщение наблюдаемого проекта', en: 'Noma: followed project announcement' },
  summary: {
    ru: 'Учебное объявление даты встречи команды Noma.',
    en: 'Sample Noma team meeting announcement.',
  },
  detail: {
    ru: 'Пример официального сообщения вымышленной Noma: открытая встреча команды назначена на 5 октября 2026. Noma — единственный наблюдаемый актив этого учебного фильтра. Сообщение придумано для макета.',
    en: 'Sample official message from fictional Noma: an open team meeting is scheduled for 5 October 2026. Noma is the only followed asset in this sample filter. This message was invented for the prototype.',
  },
};
