/** Записи инвентаря и их планы: шаги достижения и ожидания. */
import type { InventoryEntry } from './inventory.ts';
import { C, R, S, T, plan, state, V, type EntryPlan } from './matrix-dsl.ts';
const operation = (type: string): EntryPlan =>
  plan('dialog', [R('#overview'), T('Добавить операцию'), S('#buy-dialog-type', type)]);

const settingsDialog = (id: string): EntryPlan => plan('dialog', [R('#settings'), C(id)]);

const archiveFlow = (opener: string, action: string, undo: string): EntryPlan =>
  plan('inline', [R('#portfolios'), C(opener), T(action), C(undo)]);

export const entryPlans: Readonly<Record<string, EntryPlan>> = {
  'FORM-001': plan('page', [R('#overview')]),
  'FORM-002': plan('page', [R('#portfolios')]),
  'FORM-003': plan('page', [R('#history')]),
  'FORM-008': plan('page', [R('#import')]),
  'FORM-009': plan('page', [R('#connections')]),
  'FORM-010': plan('page', [R('#sync')]),
  'FORM-011': plan('page', [R('#settings')]),
  'FORM-012': plan('inline', []),
  'FORM-013': plan('menu', [C('#navigation-more-button')], (context) =>
    context.width === 1440 ? 'мобильное меню видно только при узкой ширине' : '',
  ),
  'FORM-014': plan('disclosure', [R('#overview'), C('.welcome-guide > summary')]),
  'FORM-015': plan('dialog', [R('#overview'), T('О приватности')]),
  'FORM-016': plan('inline', [R('#overview'), V('.portfolio-filter select')]),
  'FORM-017': plan('page', [state('loading')]),
  'FORM-018': plan('page', [state('empty')]),
  'FORM-019': plan('page', [state('missing')]),
  'FORM-020': plan('page', [state('error')]),
  'FORM-021': plan('disclosure', [R('#overview'), C('.attribution > summary')]),
  'FORM-022': plan('inline', [R('#overview'), C('.period-controls button')]),
  'FORM-023': plan('disclosure', [R('#overview'), C('.chart-disclosure > summary')]),
  'FORM-024': plan('inline', [R('#overview'), V('.allocation-list')]),
  'FORM-025': plan('inline', [R('#overview'), C('.holdings-sort button')]),
  'FORM-026': plan('dialog', [R('#overview'), C('button.asset-name')]),
  'FORM-027': plan('dialog', [R('#overview'), C('button.asset-name'), T('Ручная оценка')]),
  'FORM-028': plan('dialog', [
    R('#overview'),
    C('[aria-label^="Изменить остаток"]', '[aria-label^="Edit balance"]'),
  ]),
  'FORM-029': plan('disclosure', [R('#overview'), C('.portfolio-report > summary')]),
  'FORM-030': plan('inline', [
    R('#overview'),
    C('.portfolio-report > summary'),
    T('Экспорт отчёта'),
  ]),
  'FORM-031': operation('buy'),
  'FORM-032': operation('sell'),
  'FORM-033': operation('deposit'),
  'FORM-034': operation('withdrawal'),
  'FORM-035': operation('transfer'),
  'FORM-036': operation('exchange'),
  'FORM-037': operation('income'),
  'FORM-038': operation('fee'),
  'FORM-039': operation('opening'),
  'FORM-040': operation('corporate'),
  'FORM-041': plan('dialog', [
    R('#overview'),
    T('Добавить операцию'),
    S('#buy-dialog-type', 'transfer'),
    S('#buy-dialog-asset', 'RUB'),
  ]),
  'FORM-042': plan('disclosure', [
    R('#history'),
    C('.history-filters > summary'),
    V('.filter-grid'),
    T('Сбросить'),
  ]),
  'FORM-043': plan('dialog', [R('#history'), C('.history-row:first-child .history-row-open')]),
  'FORM-044': plan('dialog', [
    R('#history'),
    C('.history-row:first-child .row-actions .row-action'),
  ]),
  'FORM-045': plan('inline', [
    R('#history'),
    C('.history-row:first-child .row-actions .row-action.danger'),
    C('.history-row:first-child .undo-action'),
  ]),
  'FORM-046': plan('dialog', [R('#portfolios'), T('Создать портфель')]),
  'FORM-047': plan('dialog', [
    R('#portfolios'),
    C('.portfolio-record:first-child .portfolio-manage .row-action'),
  ]),
  'FORM-048': archiveFlow(
    '.portfolio-record:first-child .portfolio-manage .row-action',
    'В архив',
    '.portfolio-record:first-child .undo-action',
  ),
  'FORM-049': archiveFlow(
    '.portfolio-record:first-child .portfolio-manage .row-action',
    'Удалить',
    '.portfolio-record:first-child .undo-action',
  ),
  'FORM-050': plan('dialog', [R('#portfolios'), T('Добавить счёт')]),
  'FORM-051': plan('dialog', [R('#portfolios'), C('.account-list li:first-child .row-action')]),
  'FORM-052': archiveFlow(
    '.account-list li:first-child .row-action',
    'В архив',
    '.account-list li:first-child .undo-action',
  ),
  'FORM-053': archiveFlow(
    '.account-list li:first-child .row-action',
    'Удалить',
    '.account-list li:first-child .undo-action',
  ),
  'FORM-054': plan('dialog', [
    R('#portfolios'),
    C('.portfolio-selection > summary'),
    T('Создать группу'),
  ]),
  'FORM-055': plan('dialog', [
    R('#portfolios'),
    C('.portfolio-selection > summary'),
    C(
      '.group-slot button[aria-label^="Изменить группу"]',
      '.group-slot button[aria-label^="Edit group"]',
    ),
  ]),
  'FORM-056': plan('inline', [
    R('#portfolios'),
    C('.portfolio-selection > summary'),
    C(
      '.group-slot button[aria-label^="Изменить группу"]',
      '.group-slot button[aria-label^="Edit group"]',
    ),
    T('В архив'),
    C('.group-slot .undo-action'),
  ]),
  'FORM-057': plan('inline', [
    R('#portfolios'),
    C('.portfolio-selection > summary'),
    C(
      '.group-slot button[aria-label^="Изменить группу"]',
      '.group-slot button[aria-label^="Edit group"]',
    ),
    T('Удалить'),
    C('.group-slot .undo-action'),
  ]),
  'FORM-058': plan('disclosure', [R('#portfolios'), C('.portfolio-selection > summary')]),
  'FORM-059': plan('inline', [R('#import'), V('#import-page-source')]),
  'FORM-060': plan('disclosure', [R('#import'), C('#import-mapping-options > summary')]),
  'FORM-067': plan('dialog', [R('#import'), C('#import-history-details')]),
  'FORM-068': plan('dialog', [R('#import'), C('#import-reconcile')]),
  'FORM-069': plan('inline', [
    R('#import'),
    C('#import-history-details'),
    T('Отменить импорт'),
    C('.import-entry .undo-action'),
  ]),
  'FORM-070': plan('dialog', [
    R('#connections'),
    T('Настроить', '.connection-list article:nth-of-type(1)', ['Изменить настройки']),
  ]),
  'FORM-071': plan('dialog', [
    R('#connections'),
    T('Настроить', '.connection-list article:nth-of-type(2)', ['Изменить настройки']),
  ]),
  'FORM-072': plan('dialog', [
    R('#connections'),
    T('Настроить', '.connection-list article:nth-of-type(3)', ['Изменить настройки']),
  ]),
  'FORM-073': plan('dialog', [
    R('#connections'),
    T('Настроить', '.connection-list article:nth-of-type(4)', ['Изменить настройки']),
  ]),
  'FORM-074': plan('dialog', [
    R('#connections'),
    T('Настроить', '.connection-list article:nth-of-type(5)'),
  ]),
  'FORM-075': plan('inline', [
    R('#connections'),
    T('Настроить', '.connection-list article:nth-of-type(1)', ['Изменить настройки']),
    T('Сохранить'),
    T('Отключить', '.connection-list article:nth-of-type(1)'),
    C('.connection-list .row-removed .undo-action'),
  ]),
  'FORM-076': plan('disclosure', [R('#sync'), C('#sync-run'), T('Режим синхронизации')]),
  'FORM-077': plan('inline', [R('#sync'), V('.sync-devices')]),
  'FORM-078': plan('inline', [
    R('#sync'),
    T('Отозвать доступ'),
    C('.sync-devices .row-removed .undo-action'),
  ]),
  'FORM-079': plan('dialog', [R('#sync'), T('Сравнить версии')]),
  'FORM-080': plan('inline', [R('#settings'), V('.settings-fields')]),
  'FORM-081': plan('inline', [R('#settings'), V('#settings-monochrome')]),
  'FORM-082': settingsDialog('#settings-open-notifications'),
  'FORM-083': plan('inline', [R('#settings'), V('#settings-lock')]),
  'FORM-084': settingsDialog('#settings-open-recovery'),
  'FORM-085': settingsDialog('#settings-open-backup'),
  'FORM-086': settingsDialog('#settings-open-export'),
  'FORM-087': settingsDialog('#settings-open-delete'),
  'FORM-088': plan('inline', [
    R('#settings'),
    C('#settings-lock'),
    V('.settings-lock-preview'),
    T('Разблокировать'),
  ]),
  'FORM-089': plan('inline', [
    R('#settings'),
    C('#settings-open-recovery'),
    T('У меня есть копия или открытое устройство'),
  ]),
  'FORM-090': plan('dialog', [
    R('#settings'),
    C('#settings-open-backup'),
    T('Предпросмотр восстановления'),
  ]),
  'FORM-091': plan('page', [R('#settings'), C('.demo-state-settings button.quiet')]),
  'FORM-092': plan('inline', [R('#settings'), V('#widget-layout'), S('#widget-layout', 'compact')]),
};

const plans = new Map(Object.entries(entryPlans));

export const planFor = (id: string): EntryPlan | null => plans.get(id) ?? null;

export const planProblems = (scope: readonly InventoryEntry[]): readonly string[] => [
  ...scope.filter((entry) => planFor(entry.id) === null).map((entry) => `${entry.id}: нет плана`),
  ...Object.keys(entryPlans)
    .filter((id) => !scope.some((entry) => entry.id === id))
    .map((id) => `${id}: лишний план`),
];
