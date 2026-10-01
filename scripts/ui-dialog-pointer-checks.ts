import assert from 'node:assert/strict';
import { batch, evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { go, prepare } from './ui-helpers.ts';

const opener = '.summary-result > button.primary';
const submit = '#buy-dialog button[type="submit"]';
const submitMessage = 'MULTITRACKER_POINTER_SUBMIT true';
const statusMessage = 'MULTITRACKER_POINTER_NOTICE';

function underlying(browser: Browser) {
  return evaluate(
    browser,
    `({route:location.hash,open:document.querySelector('.chart-disclosure')?.open,holdings:document.querySelector('#holdings-title .count')?.textContent,dialogs:document.querySelectorAll('dialog[open]').length})`,
  );
}

function observeOutcome(browser: Browser) {
  // Read-only monitors live until this harness closes its isolated browser.
  assert.equal(
    evaluate(
      browser,
      `(() => {
        const form=document.querySelector('#buy-dialog form');
        const status=document.querySelector('.status-message');
        if (!form || !status) return false;
        form.addEventListener('submit',event=>console.info('MULTITRACKER_POINTER_SUBMIT '+event.isTrusted));
        new MutationObserver(records=>records.flatMap(record=>Array.from(record.addedNodes))
          .filter(node=>node instanceof HTMLParagraphElement && node.textContent==='Это пример. Данные не сохранены.')
          .forEach(()=>console.info('MULTITRACKER_POINTER_NOTICE')))
          .observe(status,{childList:true,subtree:true});
        return true;
      })()`,
    ),
    true,
    'Мониторы должны наблюдать существующие форму и сообщение',
  );
}

function consoleTexts(browser: Browser) {
  const result = browser.run('console');
  assert.ok(typeof result === 'object' && result !== null && 'messages' in result);
  assert.ok(Array.isArray(result.messages));
  return result.messages.map((message: unknown) => {
    assert.ok(typeof message === 'object' && message !== null && 'text' in message);
    assert.ok(typeof message.text === 'string');
    return message.text;
  });
}

function pointerPair(browser: Browser) {
  browser.run('scrollintoview', submit);
  settleLayout(browser);
  const point = evaluate(
    browser,
    `(() => {const box=document.querySelector('${submit}').getBoundingClientRect();return {x:Math.round(box.x+box.width/2),y:Math.round(box.y+box.height/2)};})()`,
  );
  assert.ok(typeof point === 'object' && point !== null && 'x' in point && 'y' in point);
  batch(browser, [
    ['mouse', 'move', String(point.x), String(point.y)],
    ['mouse', 'down', 'left'],
    ['mouse', 'up', 'left'],
    ['mouse', 'down', 'left'],
    ['mouse', 'up', 'left'],
  ]);
  return point;
}

function openValidBuy(browser: Browser) {
  browser.run('click', opener);
  browser.run('wait', '#buy-dialog[open]');
  browser.run('select', '#buy-dialog-portfolioId', 'tradernet');
  browser.run('select', '#buy-dialog-asset', 'MSFT');
  browser.run('select', '#buy-dialog-priceCurrency', 'USD');
  browser.run('fill', '#buy-dialog-quantity', '1');
  browser.run('fill', '#buy-dialog-price', '100');
}

function laterNormalClick(browser: Browser) {
  const expiry = Date.now() + 600;
  browser.run('wait', '--fn', `Date.now() >= ${expiry}`);
  browser.run('click', '.chart-disclosure > summary');
  settleLayout(browser);
  assert.equal(evaluate(browser, 'document.querySelector(".chart-disclosure")?.open'), true);
  browser.run('click', '.chart-disclosure > summary');
  settleLayout(browser);
}

export function dialogPointerSave(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  browser.run('set', 'viewport', '375', '900');
  settleLayout(browser);
  const before = underlying(browser);
  openValidBuy(browser);
  browser.run('console', '--clear');
  observeOutcome(browser);
  const point = pointerPair(browser);
  settleLayout(browser);
  assert.deepEqual(underlying(browser), before, 'Повторное нажатие не должно менять фон диалога');
  const messages = consoleTexts(browser);
  assert.equal(messages.filter((message) => message === submitMessage).length, 1);
  assert.equal(messages.filter((message) => message === statusMessage).length, 1);
  assert.equal(
    evaluate(browser, `document.activeElement === document.querySelector('${opener}')`),
    true,
    'После закрытия фокус должен оставаться на кнопке открытия',
  );
  laterNormalClick(browser);
  browser.run('set', 'viewport', '1440', '900');
  return { point, submitted: 1, notices: 1, underlyingUnchanged: true, laterClickWorks: true };
}
