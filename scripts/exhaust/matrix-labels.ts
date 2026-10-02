/** Английские подписи шагов матрицы: приложение локализовано, шаги заданы по-русски. */

const englishLabels = new Map<string, string>([
  ['Добавить операцию', 'Add transaction'],
  ['О приватности', 'About privacy'],
  ['Ручная оценка', 'Manual valuation'],
  ['Экспорт отчёта', 'Export report'],
  ['Сбросить', 'Reset'],
  ['Подробнее', 'Details'],
  ['Изменить', 'Edit'],
  ['Удалить', 'Delete'],
  ['В архив', 'Archive'],
  ['Создать портфель', 'Create portfolio'],
  ['Добавить счёт', 'Add account'],
  ['Создать группу', 'Create group'],
  ['Настроить', 'Configure'],
  ['Изменить настройки', 'Edit settings'],
  ['Сохранить', 'Save'],
  ['Отключить', 'Disconnect'],
  ['Отозвать доступ', 'Revoke access'],
  ['Режим синхронизации', 'Sync mode'],
  ['Сравнить версии', 'Compare versions'],
  ['Заблокировать экран (пример)', 'Lock the screen (sample)'],
  ['Разблокировать', 'Unlock'],
  ['У меня есть копия или открытое устройство', 'I have a copy or unlocked device'],
  ['Отменить импорт', 'Undo import'],
  ['Показать на Обзоре', 'Show on Overview'],
  ['Предпросмотр восстановления', 'Preview restore'],
]);

export const localize = (name: string, language: 'ru' | 'en'): string =>
  language === 'en' ? (englishLabels.get(name) ?? name) : name;
