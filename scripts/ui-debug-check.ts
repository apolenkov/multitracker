import { evaluate, createBrowser } from './ui-driver.ts';
import { dialogPointerSave } from './ui-dialog-pointer-checks.ts';
import { conflictRadioChoices } from './ui-sync-checks.ts';
import { go, prepare } from './ui-helpers.ts';

const browser = createBrowser();
const btn = '.sync-panel > .sync-actions:last-child > button';
const opened = `!!document.querySelector('#sync-conflict[open]')`;
function tryWait(source: string, ms: number) {
  try {
    browser.run('wait', '--fn', source, '--timeout', String(ms));
    return 'opened';
  } catch {
    return 'timeout';
  }
}
try {
  browser.run('open', 'http://127.0.0.1:4180/');
  browser.run('wait', '#main');
  console.log('conflictRadioChoices…');
  conflictRadioChoices(browser);
  console.log('dialogPointerSave…');
  dialogPointerSave(browser);
  prepare(browser);
  go(browser, 'sync');
  console.log(
    'probe:',
    evaluate(
      browser,
      `(() => {const b=document.querySelector('${btn}');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},hit:hit?(hit.tagName+'.'+(typeof hit.className==='string'?hit.className:'')):'null',same:b===hit||b.contains(hit)||hit.contains(b),disabled:b.disabled};})()`,
    ),
  );
  browser.run('click', btn);
  console.log('after cdp click:', tryWait(opened, 3000));
  evaluate(browser, `document.querySelector('${btn}').click(); 'ok'`);
  console.log('after dom click:', tryWait(opened, 3000));
} catch (error) {
  console.log('THREW:', error instanceof Error ? error.message : error);
} finally {
  browser.run('close');
}
