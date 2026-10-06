/** «Виден» для фокуса — только пересечение с вьюпортом: checkVisibility()
    не ловит элемент, уехавший за экран прокруткой страницы под диалогом. */
export function elementInViewport(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  return (
    element.checkVisibility() &&
    box.bottom > 0 &&
    box.top < window.innerHeight &&
    box.right > 0 &&
    box.left < window.innerWidth
  );
}
