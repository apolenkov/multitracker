import { AssertionError } from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';

export type Result = Readonly<{ id: string; status: string; observed: unknown }>;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function failureEvidence(browser: Browser, error: unknown) {
  try {
    const snapshot = browser.run('snapshot');
    const context = evaluate(
      browser,
      '({hash:location.hash,title:document.title,focus:document.activeElement?.id,heading:document.querySelector("#main h1")?.textContent,dialogs:Array.from(document.querySelectorAll("dialog[open]"), dialog => dialog.id)})',
    );
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
