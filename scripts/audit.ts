/** `npm audit` для check: уязвимости high/critical роняют, сбой сети повторяется до трёх раз. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { auditVerdict } from './audit-verdict.ts';

const ATTEMPTS = 3;

const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !['npm_config_allow_scripts', 'NPM_CONFIG_ALLOW_SCRIPTS'].includes(key),
  ),
);

const runAudit = (): string =>
  spawnSync('npm', ['audit', '--audit-level=high', '--json'], { encoding: 'utf8', env }).stdout;

const attempt = (left: number): number => {
  const verdict = auditVerdict(runAudit());
  if (verdict === 'ok') {
    console.log('npm audit: уязвимостей high/critical нет');
    return 0;
  }
  if (verdict === 'vulnerable') {
    console.error('npm audit: найдены уязвимости high/critical — подробности: npm audit');
    return 1;
  }
  console.error(
    `npm audit: ответ без сводки уязвимостей (сеть или endpoint), осталось попыток ${left - 1}`,
  );
  return left > 1 ? attempt(left - 1) : 1;
};

assert.equal(attempt(ATTEMPTS), 0, 'npm audit не пройден');
