/** Поведенческая проверка суженного исключения шапки диалога: живой DOM
    buy-dialog и настоящий covers() из exhaust-сканера (R1/R2). */
import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { env } from './ui-dialog-input-checks.ts';
import { isRecord } from './exhaust/guards.ts';
import { coversProbe } from './exhaust/page-design.ts';

/** Вердикт covers(text, крестик): существует ли перекрытие и считается ли оно находкой. */
const verdictSource = (textSelector: string): string =>
  coversProbe(
    `(() => { const c = document.querySelector('#buy-dialog .close-button');
      const t = document.querySelector(${JSON.stringify(textSelector)});
      return { overlap: t !== null && overlap(rectOf(t), rectOf(c)) && !t.contains(c) && !c.contains(t),
        covered: t !== null && covers(t, c) }; })()`,
  );

const verdict = (
  browser: Browser,
  sel: string,
): Readonly<{ overlap: boolean; covered: boolean }> => {
  const raw = evaluate(browser, verdictSource(sel));
  assert.ok(
    isRecord(raw) && typeof raw.overlap === 'boolean' && typeof raw.covered === 'boolean',
    `вердикт covers не прочитан: ${JSON.stringify(raw)}`,
  );
  return { overlap: raw.overlap, covered: raw.covered };
};

const mutate = (browser: Browser, body: string): void => {
  evaluate(
    browser,
    `(() => { const d = document.getElementById('buy-dialog'); ${body} return true; })()`,
  );
};

/** (d) Пометить первый потоковый текст под крестиком; вернуть covers-вердикты всех перекрытых. */
const markCoveredTexts = coversProbe(
  `(() => { const d = document.getElementById('buy-dialog');
    const c = d.querySelector('.close-button');
    const hits = [...d.querySelectorAll('*')].filter(ownText)
      .filter((t) => overlap(rectOf(t), rectOf(c)) && !t.contains(c) && !c.contains(t));
    if (hits.length > 0) hits[0].id = 'mt-probe-text';
    return hits.map((t) => covers(t, c)); })()`,
);

/** (a) та же геометрия, но шапка прозрачна: непрозрачный крестик над текстом — находка.
    transition:none нужен: у button переход фона 200 мс, иначе computed читает
    начало интерполяции и краска «не успевает» до замера. */
const transparentHeading = `const c = d.querySelector('.close-button');
  c.style.transition = 'none'; c.style.background = 'rgb(32, 38, 35)';
  d.querySelector('.dialog-heading').style.background = 'transparent';`;

/** (b) шапка снова непрозрачна; transform двигает крестик на h2 — у flex-строки
    space-between margin не сдвигает рамку, а transform меняет геометрию и
    сохраняет порядок прорисовки (кнопка в DOM после h2 — рисуется поверх). */
const ownHeadingText = `d.querySelector('.dialog-heading').style.background = '';
  const h2 = d.querySelector('.dialog-heading h2'); h2.id = 'mt-probe-h2';
  const c = d.querySelector('.close-button');
  const b = c.getBoundingClientRect();
  const r = h2.getBoundingClientRect();
  c.style.transform = 'translateX(' + (-(b.left - r.right + 20)) + 'px)';`;

/** (c) закреплённый слой под непрозрачной шапкой: прокруткой не убирается — находка. */
const pinnedLayer = `const c = d.querySelector('.close-button');
  c.style.transform = ''; c.style.background = '';
  const b = d.querySelector('.close-button').getBoundingClientRect();
  const p = document.createElement('div'); p.id = 'mt-probe-pin'; p.textContent = 'x';
  p.style.position = 'fixed'; p.style.top = b.top + 'px'; p.style.left = b.left + 'px';
  p.style.width = b.width + 'px'; p.style.height = b.height + 'px'; d.appendChild(p);`;

const cleanupProbes = `document.getElementById('mt-probe-pin')?.remove();
  document.getElementById('mt-probe-text')?.removeAttribute('id');
  const h2 = document.getElementById('mt-probe-h2');
  if (h2 !== null) h2.removeAttribute('id');
  const c = d.querySelector('.close-button'); c.style.background = ''; c.style.transition = '';`;

function openBuyScrolled(browser: Browser) {
  env(browser, 'history', 375, 800, 'ru');
  browser.run('click', '.page-heading-actions .primary');
  browser.run('wait', '#buy-dialog[open]');
  settleLayout(browser);
  const scroll = evaluate(browser, `document.getElementById('buy-dialog').scrollTop`);
  assert.ok(
    typeof scroll === 'number' && scroll > 0,
    'автофокус должен прокрутить диалог (FORM-031)',
  );
}

export function headingExemption(browser: Browser) {
  openBuyScrolled(browser);
  const covered = evaluate(browser, markCoveredTexts);
  assert.ok(
    Array.isArray(covered) && covered.length > 0 && covered.every((v) => v === false),
    `потоковый текст под прокрученной шапкой должен освобождаться: ${JSON.stringify(covered)}`,
  );
  mutate(browser, transparentHeading);
  const transparent = verdict(browser, '#mt-probe-text');
  mutate(browser, ownHeadingText);
  const ownText = verdict(browser, '#mt-probe-h2');
  mutate(browser, pinnedLayer);
  const pinned = verdict(browser, '#mt-probe-pin');
  mutate(browser, cleanupProbes);
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', `!document.querySelector('#buy-dialog[open]')`);
  assert.deepEqual(
    { transparent, ownText, pinned },
    {
      transparent: { overlap: true, covered: true },
      ownText: { overlap: true, covered: true },
      pinned: { overlap: true, covered: true },
    },
    `исключение шапки прощает недоказанное: ${JSON.stringify({ transparent, ownText, pinned })}`,
  );
  return 'прокрученный поток под непрозрачной шапкой освобождён; прозрачная шапка, её текст и закреплённый слой — находки';
}
