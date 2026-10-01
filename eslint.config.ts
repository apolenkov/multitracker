import js from '@eslint/js';
import functional from 'eslint-plugin-functional';
import unsanitized from 'eslint-plugin-no-unsanitized';
import hooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const files = ['**/*.{ts,tsx,js,mjs,cjs}'];
const securityRules = Object.fromEntries(
  Object.keys(security.configs.recommended.rules ?? {}).map((name) => [name, 'error' as const]),
);

export default tseslint.config(
  {
    // Те же пути, что в .gitignore: локальные доказательства и параллельные рабочие копии не код репозитория.
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'docs/audits/**',
      'docs/evidence/**',
      '.claude/**',
      '.impeccable/review/**',
    ],
  },
  {
    files,
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
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
      'no-restricted-properties': [
        'error',
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
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'HTML-вставки запрещены.',
        },
      ],
    },
  },
);
