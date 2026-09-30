import { AssertionError } from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';

export type Result = Readonly<{ id: string; status: string; observed: unknown }>;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function failureContext(browser: Browser) {
  return evaluate(
    browser,
    `({hash:location.hash,title:document.title,focus:document.activeElement?.id,
      heading:document.querySelector('#main h1')?.textContent,
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      userAgent:navigator.userAgent,font:getComputedStyle(document.body).fontFamily,
      dialogs:Array.from(document.querySelectorAll('dialog[open]'), dialog=>dialog.id),
      dialogGeometry:Array.from(document.querySelectorAll('dialog[open]'), dialog=>({
        id:dialog.id,rect:dialog.getBoundingClientRect().toJSON(),
        scrollTop:dialog.scrollTop,scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight})),
      disclosures:Array.from(document.querySelectorAll('dialog[open] details > summary'), element=>{
        const box=element.getBoundingClientRect();
        const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
        return {text:element.getAttribute('aria-label') ?? element.innerText,open:element.closest('details').open,
          visible:element.checkVisibility(),rect:box.toJSON(),centerVisible:element.contains(hit),
          hit:hit?{tag:hit.tagName,id:hit.id,text:hit.innerText?.slice(0,100)}:null};
      })})`,
  );
}

function failureEvidence(browser: Browser, error: unknown) {
  try {
    const snapshot = browser.run('snapshot');
    const context = failureContext(browser);
    return { error: errorText(error), snapshot, context };
  } catch (diagnosticError: unknown) {
    return { error: errorText(error), diagnosticError: errorText(diagnosticError) };
  }
}

export function createCheck(browser: Browser) {
  return (id: string, action: () => unknown, diagnostics = false): Result => {
    try {
      return { id, status: 'PASS', observed: action() };
    } catch (error: unknown) {
      return {
        id,
        status: error instanceof AssertionError ? 'FAIL' : 'NOT VERIFIED',
        observed: diagnostics ? failureEvidence(browser, error) : errorText(error),
      };
    }
  };
}
