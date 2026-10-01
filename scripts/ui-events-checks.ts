import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { content, go, prepare, reveal, truth } from './ui-exploration.ts';

const eventOpener = '#event-luma-report';

function openEvent(browser: Browser) {
  browser.run('click', eventOpener);
  browser.run('wait', '#event-dialog[open]');
  assert.match(content(browser, '#event-dialog'), /Luma/);
}

function openReminder(browser: Browser) {
  openEvent(browser);
  browser.run('click', '#event-reminder-open');
  browser.run('wait', '#event-reminder-minutes');
  browser.run('wait', '--fn', 'document.activeElement?.id === "event-reminder-minutes"');
  truth(
    browser,
    'document.activeElement?.id === "event-reminder-minutes"',
    'Вход в напоминание должен поставить фокус в первое поле',
  );
}

function reminderBackFocus(browser: Browser) {
  openReminder(browser);
  browser.run('fill', '#event-reminder-minutes', '75');
  browser.run('select', '#event-reminder-channel', 'calendar');
  browser.run('click', '#event-reminder-back');
  const returned =
    'document.activeElement?.id === "event-reminder-open" && !document.querySelector("#event-reminder-minutes")';
  browser.run('wait', '--fn', returned);
  truth(browser, returned, 'Назад должен вернуть событие и фокус кнопке напоминания');
  browser.run('click', '#event-reminder-open');
  browser.run('wait', '--fn', 'document.activeElement?.id === "event-reminder-minutes"');
  assert.equal(evaluate(browser, 'document.querySelector("#event-reminder-minutes")?.value'), '15');
  assert.equal(
    evaluate(browser, 'document.querySelector("#event-reminder-channel")?.value'),
    'app',
  );
  browser.run('click', '#event-reminder-cancel');
  browser.run('wait', '--fn', '!document.querySelector("#event-dialog[open]")');
}

function eventFilters(browser: Browser) {
  browser.run('click', '#events-filter-all');
  reveal(browser, '#events-more-filters');
  browser.run('select', '#events-date', '2026-10-02');
  browser.run('select', '#events-asset', 'noma');
  truth(
    browser,
    'document.querySelectorAll(".event-row").length === 0 && Boolean(document.querySelector(".events-empty")?.innerText.trim())',
    'Несовместимые дата и актив должны показать пустой календарь',
  );
  browser.run('select', '#events-date', '');
  browser.run('select', '#events-asset', '');
  openEvent(browser);
  browser.run('press', 'Escape');
  const ready =
    '!document.querySelector("#event-dialog[open]") && document.activeElement?.id === "event-luma-report"';
  browser.run('wait', '--fn', ready);
  truth(browser, ready, 'Escape должен вернуть фокус выбранному событию');
}

function cancelReminder(browser: Browser) {
  const status = evaluate(browser, 'document.querySelector(".events-confirm")?.innerText');
  openReminder(browser);
  browser.run('fill', '#event-reminder-minutes', '75');
  browser.run('select', '#event-reminder-channel', 'calendar');
  browser.run('click', '#event-reminder-cancel');
  browser.run('wait', '--fn', '!document.querySelector("#event-dialog[open]")');
  assert.equal(evaluate(browser, 'document.querySelector(".events-confirm")?.innerText'), status);
  openReminder(browser);
  assert.equal(evaluate(browser, 'document.querySelector("#event-reminder-minutes")?.value'), '15');
  assert.equal(
    evaluate(browser, 'document.querySelector("#event-reminder-channel")?.value'),
    'app',
  );
}

function invalidReminder(browser: Browser) {
  ['', 'abc', '0', '-1', '10081'].forEach((value) => {
    // The field starts at "15": filling "" directly is not seen by React, so type something first.
    browser.run('fill', '#event-reminder-minutes', 'x');
    browser.run('fill', '#event-reminder-minutes', value);
    browser.run('click', '#event-reminder-save');
    truth(
      browser,
      'Boolean(document.querySelector("#event-dialog[open]")) && document.querySelector("#event-reminder-minutes")?.getAttribute("aria-invalid") === "true" && Boolean(document.querySelector("#event-reminder-error")?.innerText.trim())',
      `Неверное напоминание ${JSON.stringify(value)} должно блокировать сохранение`,
    );
  });
}

const ready15 =
  '!document.querySelector("#event-dialog[open]") && document.activeElement?.id === "event-luma-report"';
export function eventReminder(browser: Browser) {
  prepare(browser);
  go(browser, 'events');
  eventFilters(browser);
  reminderBackFocus(browser);
  cancelReminder(browser);
  invalidReminder(browser);
  browser.run('fill', '#event-reminder-minutes', '30');
  browser.run('click', '#event-reminder-save');
  browser.run('wait', '--fn', '!document.querySelector("#event-dialog[open]")');
  assert.match(content(browser, '.events-confirm'), /сохранён: напоминание за 30 мин/);
  openReminder(browser);
  assert.equal(evaluate(browser, 'document.querySelector("#event-reminder-minutes")?.value'), '15');
  browser.run('press', 'Escape');
  browser.run(
    'wait',
    '--fn',
    '!document.querySelector("#event-dialog[open]") && document.activeElement?.id === "event-luma-report"',
  );
  // Одно действие: «Напомнить за 15 мин» сохраняет сразу и возвращает фокус событию.
  openEvent(browser);
  assert.equal(evaluate(browser, 'document.querySelector(".events-confirm")?.innerText'), '');
  browser.run('click', '#event-reminder-quick');
  browser.run('wait', '--fn', ready15);
  truth(browser, ready15, 'Быстрое напоминание закрывает окно и возвращает фокус событию');
  assert.match(content(browser, '.events-confirm'), /сохранён: напоминание за 15 мин/);
  return 'Срок по умолчанию 15 → сброс; отмена не сохраняет; неверный срок блокирован; 30 минут → результат; одно нажатие → 15 минут';
}

function updateDetail(browser: Browser, category: string) {
  browser.run('click', `#feed-${category}`);
  const heading = content(browser, '.events-story h3');
  browser.run('click', `#feed-detail-${category}`);
  browser.run('wait', '#feed-dialog[open]');
  const detail = content(browser, '#feed-dialog .event-dialog-content');
  assert.match(detail, /вымышлен|Учебн/);
  browser.run('press', 'Escape');
  const ready = `!document.querySelector('#feed-dialog[open]') && document.activeElement?.id === 'feed-detail-${category}'`;
  browser.run('wait', '--fn', ready);
  truth(browser, ready, 'Escape подробностей должен вернуть фокус карточке обновления');
  return { category, heading, detail };
}

function recapTranscript(browser: Browser, period: 'daily' | 'weekly') {
  browser.run('click', `#recap-${period}`);
  browser.run('click', '#recap-transcript');
  truth(
    browser,
    'document.querySelector(".events-transcript")?.open === true',
    'Расшифровка не открылась',
  );
  // Раскрытие анимирует ::details-content 200 мс; ждём конца перехода, а не первого кадра.
  settleLayout(browser, '.events-transcript');
  return content(browser, '.events-transcript p');
}

export function eventUpdates(browser: Browser) {
  prepare(browser);
  go(browser, 'events');
  const updates = ['announcement', 'movement', 'insider', 'crypto'].map((category) =>
    updateDetail(browser, category),
  );
  assert.equal(
    new Set(updates.map((item) => item.detail)).size,
    4,
    'Категории раскрывают один текст',
  );
  browser.run('click', '#feed-announcement');
  browser.run('select', '#announcements-scope', 'all');
  const all = content(browser, '.events-feed .events-story h3');
  browser.run('select', '#announcements-scope', 'followed');
  const followed = content(browser, '.events-feed .events-story h3');
  assert.notEqual(all, followed, 'Фильтр объявлений не изменил видимый состав');
  browser.run('click', '#feed-recap');
  const daily = recapTranscript(browser, 'daily');
  const weekly = recapTranscript(browser, 'weekly');
  assert.notEqual(daily, weekly, 'Недельная расшифровка совпадает с дневной');
  return { updates, announcements: { all, followed }, transcripts: { daily, weekly } };
}
