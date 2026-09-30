import assert from 'node:assert/strict';
import path from 'node:path';
import { ESLint } from 'eslint';
import ts from 'typescript';

const filePath = path.resolve('src/gate-probe.tsx');
const config = ts.getParsedCommandLineOfConfigFile(
  'tsconfig.json',
  {},
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    },
  },
);
assert.ok(config, 'Не удалось прочитать tsconfig.json');
const options = config.options;

function sourceProgram(source: string) {
  const host = ts.createCompilerHost(options);
  return ts.createProgram([filePath], options, {
    ...host,
    getSourceFile: (name, languageVersion, onError, shouldCreateNewSourceFile) =>
      name === filePath
        ? ts.createSourceFile(name, source, languageVersion, true)
        : host.getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile),
  });
}

async function lint(source: string) {
  const program = sourceProgram(source);
  assert.equal(program.getSourceFile(filePath)?.text, source);
  const eslint = new ESLint({
    overrideConfig: {
      languageOptions: { parserOptions: { projectService: false, programs: [program] } },
    },
  });
  const results = await eslint.lintText(source, { filePath });
  assert.ok(
    results.every((result) => result.messages.every((message) => !message.fatal)),
    'Ошибка разбора вместо проверки правила',
  );
  return results.flatMap((result) => result.messages);
}

const cases = [
  ['functional/no-let', 'let value = 1; console.log(value);'],
  ['functional/immutable-data', 'const value = { count: 1 }; value.count = 2;'],
  ['functional/immutable-data', 'const values = [1]; values.push(2);'],
  ['max-lines', '// line\n'.repeat(301)],
  ['max-lines-per-function', `function long() {\n${'// line\n'.repeat(51)}}\nlong();`],
  [
    'sonarjs/cognitive-complexity',
    `function nested(value: number) {\n${'if (value) {\n'.repeat(5)}console.log(value);\n${'}\n'.repeat(5)}}\nnested(1);`,
  ],
  [
    'complexity',
    `function branching(value: number) {\n${'if (value) console.log(value);\n'.repeat(11)}}\nbranching(1);`,
  ],
  ['no-eval', 'eval("1 + 1");'],
  ['no-warning-comments', '// oxlint-disable\nconsole.log(1);'],
  [
    'no-restricted-syntax',
    'const view = <div dangerouslySetInnerHTML={{ __html: "unsafe" }} />; console.log(view);',
  ],
  [
    'functional/no-let',
    '/* eslint-disable functional/no-let */\nlet value = 1; console.log(value);',
  ],
  ['functional/immutable-data', 'const value = new Map<string, number>(); value.set("a", 1);'],
  ['functional/immutable-data', 'const value = new Set<number>(); value.add(1);'],
  ['no-restricted-properties', 'const value = { count: 1 }; Reflect.set(value, "count", 2);'],
  [
    'no-restricted-properties',
    'const value = { count: 1 }; Reflect.deleteProperty(value, "count");',
  ],
  [
    'no-restricted-properties',
    'const value = {}; Reflect.defineProperty(value, "count", { value: 1 });',
  ],
  ['no-restricted-properties', 'const value = {}; Reflect.setPrototypeOf(value, {});'],
  ['no-restricted-properties', 'const value = {}; Reflect.preventExtensions(value);'],
  ['@typescript-eslint/no-explicit-any', 'const value: any = 1; console.log(value);'],
  [
    '@typescript-eslint/no-unsafe-assignment',
    'const value = JSON.parse("{}"); console.log(value);',
  ],
  ['@typescript-eslint/no-unsafe-call', 'JSON.parse("{}").run();'],
  ['@typescript-eslint/no-unsafe-member-access', 'console.log(JSON.parse("{}").name);'],
  [
    '@typescript-eslint/no-unsafe-type-assertion',
    'const value: unknown = 42; console.log((value as string).toUpperCase());',
  ],
  [
    '@typescript-eslint/no-unsafe-type-assertion',
    'const value = 42 as unknown as string; console.log(value.toUpperCase());',
  ],
  [
    '@typescript-eslint/no-non-null-assertion',
    'const value = document.querySelector("div")!; console.log(value.textContent);',
  ],
  ['@typescript-eslint/no-floating-promises', 'Promise.resolve(1);'],
  ['@typescript-eslint/no-floating-promises', 'void Promise.reject(new Error("unhandled"));'],
  [
    '@typescript-eslint/no-misused-promises',
    'setTimeout(async () => { await Promise.reject(new Error("unhandled")); }, 0);',
  ],
  [
    '@typescript-eslint/ban-ts-comment',
    '// @ts-expect-error: described type bypass\nconst value: number = "wrong"; console.log(value);',
  ],
  [
    '@typescript-eslint/ban-ts-comment',
    '// @ts-ignore\nconst value: number = "wrong"; console.log(value);',
  ],
  ['@typescript-eslint/ban-ts-comment', '// @ts-nocheck\nconsole.log(1);'],
  ['@typescript-eslint/ban-ts-comment', '// @ts-check\nconsole.log(1);'],
] as const;

const failures = await cases.reduce<Promise<readonly string[]>>(
  async (previous, [rule, source]) => {
    const missing = await previous;
    const messages = await lint(source);
    return messages.some((message) => message.ruleId === rule)
      ? missing
      : [...missing, `${rule}: ${source}`];
  },
  Promise.resolve([]),
);
assert.deepEqual(failures, [], 'Нарушения не обнаружены');

const safeCases = [
  'const value: unknown = JSON.parse("1"); if (typeof value === "number") console.log(value + 1);',
  'const value = document.querySelector("div"); if (value) console.log(value.textContent);',
  'export {}; await Promise.resolve(1);',
  'Promise.reject(new Error("handled")).catch((error: unknown) => console.log(error));',
  'const value = new Map([["a", 1]]); console.log(value.get("a"));',
  'const value = new Set([1]); console.log(value.has(1));',
  'const value: unknown = Reflect.get({ count: 1 }, "count"); console.log(value);',
] as const;

for (const source of safeCases) {
  assert.deepEqual(await lint(source), [], `Безопасный пример отклонён: ${source}`);
}
console.log(
  `Проверки ограничений: ${cases.length} отрицательных примеров отклонены, ` +
    `${safeCases.length} безопасных примеров приняты.`,
);
