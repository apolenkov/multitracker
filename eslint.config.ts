import js from '@eslint/js';
import functional from 'eslint-plugin-functional';
import unsanitized from 'eslint-plugin-no-unsanitized';
import hooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const files = ['**/*.{ts,tsx,js,mjs,cjs}'];
const securityRules = Object.fromEntries(
  Object.keys(security.configs.recommended.rules ?? {}).map((name) => [name, 'error' as const]),
);

const restrictedProperties = [
  { property: 'innerHTML', message: 'Используйте JSX или textContent.' },
  { property: 'outerHTML', message: 'Используйте JSX или textContent.' },
  { object: 'Reflect', property: 'set', message: 'Изменения объектов на месте запрещены.' },
  {
    object: 'Reflect',
    property: 'deleteProperty',
    message: 'Изменения объектов на месте запрещены.',
  },
  {
    object: 'Reflect',
    property: 'defineProperty',
    message: 'Изменения объектов на месте запрещены.',
  },
  {
    object: 'Reflect',
    property: 'setPrototypeOf',
    message: 'Изменения объектов на месте запрещены.',
  },
  {
    object: 'Reflect',
    property: 'preventExtensions',
    message: 'Изменения объектов на месте запрещены.',
  },
];
const restrictedSyntax = [
  {
    selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
    message: 'HTML-вставки запрещены.',
  },
  {
    selector: 'ExportAllDeclaration',
    message: 'export * запрещён: публичный состав перечисляется явно.',
  },
];

export default defineConfig(
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },
  {
    files,
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
    plugins: { functional, sonarjs, security, 'react-hooks': hooks, 'no-unsanitized': unsanitized },
    rules: {
      ...securityRules,
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true, 'ts-check': true },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { requireDefaultForNonUnion: true },
      ],
      '@typescript-eslint/return-await': ['error', 'always'],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'max-depth': ['error', 2],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'functional/no-let': 'error',
      'functional/immutable-data': ['error', { ignoreImmediateMutation: false }],
      'sonarjs/cognitive-complexity': ['error', 10],
      complexity: ['error', 10],
      'max-lines': ['error', { max: 300, skipBlankLines: false, skipComments: false }],
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: false, skipComments: false, IIFEs: true },
      ],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-param-reassign': ['error', { props: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-warning-comments': [
        'error',
        { terms: ['oxlint-disable', 'oxlint-enable', 'prettier-ignore'], location: 'anywhere' },
      ],
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      'no-restricted-properties': ['error', ...restrictedProperties],
      'no-restricted-syntax': ['error', ...restrictedSyntax],
    },
  },
  {
    // Изменяемые источники времени, случайности и среды запрещены только в коде
    // приложения; сценарии проверок и конфигурация вправе их читать.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        ...restrictedProperties,
        { object: 'process', property: 'env', message: 'Переменные среды не читаются в коде.' },
        { object: 'Math', property: 'random', message: 'Случайность — через явный источник.' },
        { object: 'Date', property: 'now', message: 'Время — через явный источник.' },
        {
          object: 'crypto',
          property: 'randomUUID',
          message: 'Идентификаторы — через явный источник.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        {
          selector: 'NewExpression[callee.name="Date"][arguments.length=0]',
          message: 'Время — через явный источник.',
        },
      ],
    },
  },
  {
    // Только новый код: пороги строже общих 300/50/10 (decision-094). Пути безвредны,
    // пока файлов нет. Параметры повторены целиком: в плоской конфигурации
    // правило с параметрами заменяет прежние, а не сливается с ними.
    files: ['scripts/exhaust/**', 'tests/exhaust-core.test.ts'],
    rules: {
      'max-lines': ['error', { max: 250, skipBlankLines: false, skipComments: false }],
      'max-lines-per-function': [
        'error',
        { max: 25, skipBlankLines: false, skipComments: false, IIFEs: true },
      ],
      complexity: ['error', 8],
      'sonarjs/cognitive-complexity': ['error', 8],
    },
  },
  {
    // Прежние нарушения новых правил: по одному-трём на файл. Каждое исправление
    // сокращает список; новые файлы под список не попадают (decision-094).
    files: [
      'src/Dialog.tsx',
      'src/demo/connection-form.tsx',
      'src/forms/EntityDialog.tsx',
      'src/forms/OperationForm.tsx',
      'scripts/ui-smoke.ts',
      'scripts/ui-smoke-dialogs.ts',
      'scripts/ui-smoke-geometry.ts',
      'scripts/ui-smoke-report.ts',
    ],
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
    },
  },
);
