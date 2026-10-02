import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import { content, go, prepare } from './ui-helpers.ts';

/** Счётчики используют единый бейдж .count; слово счётчика склоняется по-русски. */
export function unifiedCounters(browser: Browser) {
  prepare(browser);
  go(browser, 'portfolios');
  const badges = evaluate(
    browser,
    '[...document.querySelectorAll("#main .count")].filter((el) => el.checkVisibility({checkVisibilityCSS:true})).map((el) => el.textContent.trim())',
  );
  assert.ok(
    Array.isArray(badges) && badges.length >= 2,
    `На Портфелях должны быть видимые счётчики: ${JSON.stringify(badges)}`,
  );
  assert.ok(
    badges.every((text) => typeof text === 'string' && /^\d+$/.test(text)),
    `Счётчики — числа в общем бейдже: ${JSON.stringify(badges)}`,
  );
  assert.match(
    content(browser, '.portfolio-record:first-child .portfolio-meta'),
    /Счёта\s*2/,
    'RU: счётчик счетов склоняется («Счёта 2»)',
  );
  browser.run('select', '#topbar-language', 'en');
  browser.run('wait', '--fn', 'document.documentElement.lang === "en"');
  assert.match(
    content(browser, '.portfolio-record:first-child .portfolio-meta'),
    /Accounts\s*2/,
    'EN: «Accounts 2»',
  );
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.documentElement.lang === "ru"');
  return 'Единый бейдж .count; RU склоняет слово, EN — Accounts';
}
