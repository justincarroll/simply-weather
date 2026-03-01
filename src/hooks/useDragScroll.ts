import { useEffect } from "react";

export function useDragScroll(ref: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      isDragging = true;
      startX = event.clientX;
      startScrollLeft = element.scrollLeft;
      element.classList.add("is-dragging");
      element.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - startX;
      element.scrollLeft = startScrollLeft - deltaX;
    };

    const endDrag = (event: PointerEvent) => {
      if (!isDragging) return;

      isDragging = false;
      element.classList.remove("is-dragging");
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", endDrag);
    element.addEventListener("pointercancel", endDrag);
    element.addEventListener("pointerleave", endDrag);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", endDrag);
      element.removeEventListener("pointercancel", endDrag);
      element.removeEventListener("pointerleave", endDrag);
      element.classList.remove("is-dragging");
    };
  }, [ref]);
}
