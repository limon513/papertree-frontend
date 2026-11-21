/**
 * Rows that scroll sideways (product rows, the category and brand rows): arrow buttons on computers,
 * hidden at the ends. Markup: an element with class "rail" holding the <ul> and two .rail-arrow buttons.
 *
 * With a mouse the row can also be dragged sideways. Rows marked data-wheel (short rows of tiles) also
 * move sideways with the mouse wheel, until their end; then the page scrolls on as usual.
 */
/** Sets up every row on the page not set up yet (rows added later, like the home page's personal rows, too). */
export function setUpRails() {
  for (const rail of document.querySelectorAll<HTMLElement>(".rail")) {
    if (rail.dataset.ready) continue;
    rail.dataset.ready = "1";
    const list = rail.querySelector("ul")!;
    const [prev, next] =
      rail.querySelectorAll<HTMLButtonElement>(".rail-arrow");
    const update = () => {
      const atStart = list.scrollLeft < 8;
      const atEnd = list.scrollLeft + list.clientWidth > list.scrollWidth - 8;
      prev!.classList.toggle("opacity-0", atStart);
      prev!.classList.toggle("pointer-events-none", atStart);
      next!.classList.toggle("opacity-0", atEnd);
      next!.classList.toggle("pointer-events-none", atEnd);
    };
    for (const button of [prev!, next!]) {
      button.addEventListener("click", () =>
        list.scrollBy({
          left: Number(button.dataset.dir) * list.clientWidth * 0.9,
          behavior: "smooth",
        }),
      );
    }
    list.addEventListener("scroll", update, { passive: true });
    // Rows further down are skipped by the browser until they come near the screen: check again then.
    rail
      .closest("section")
      ?.addEventListener("contentvisibilityautostatechange", update);
    rail.addEventListener("pointerenter", update);
    addEventListener("resize", update);
    update();

    // Snapping fights the hand (and the wheel) while moving; it comes back after, settling on a tile.
    const pauseSnap = () => (list.style.scrollSnapType = "none");
    const settle = () => {
      const left = list.scrollLeft;
      list.style.scrollSnapType = "";
      list.scrollLeft = left;
    };

    // ---- Drag with the mouse (touch screens swipe on their own) ----
    let startX = 0;
    let startLeft = 0;
    let pointer: number | null = null;
    let dragged = false;
    list.addEventListener("pointerdown", (e) => {
      if (
        e.pointerType !== "mouse" ||
        e.button !== 0 ||
        list.scrollWidth <= list.clientWidth
      )
        return;
      pointer = e.pointerId;
      startX = e.clientX;
      startLeft = list.scrollLeft;
      dragged = false;
    });
    list.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointer) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) < 6) return; // still a click, not a drag
      if (!dragged) {
        dragged = true;
        list.setPointerCapture(e.pointerId);
        pauseSnap();
        list.style.cursor = "grabbing";
      }
      list.scrollLeft = startLeft - dx;
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (!dragged) return;
      list.style.cursor = "";
      settle();
    };
    list.addEventListener("pointerup", release);
    list.addEventListener("pointercancel", release);
    // A drag that ends over a product is not a click on it.
    list.addEventListener(
      "click",
      (e) => {
        if (!dragged) return;
        e.preventDefault();
        e.stopPropagation();
        dragged = false;
      },
      true,
    );
    // Pictures and links would otherwise be picked up by the browser's own drag and drop.
    list.addEventListener("dragstart", (e) => e.preventDefault());

    // ---- Mouse wheel (rows marked data-wheel) ----
    if (rail.dataset.wheel === undefined) continue;
    let timer: ReturnType<typeof setTimeout> | undefined;
    list.addEventListener(
      "wheel",
      (e) => {
        // Touchpads already scroll sideways; only turn a plain up/down wheel.
        if (e.ctrlKey || e.shiftKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY))
          return;
        const max = list.scrollWidth - list.clientWidth;
        const goingOn =
          e.deltaY > 0 ? list.scrollLeft < max - 1 : list.scrollLeft > 1;
        if (max <= 0 || !goingOn) return; // nothing more this way: the page scrolls
        e.preventDefault();
        pauseSnap();
        list.scrollLeft += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
        clearTimeout(timer);
        timer = setTimeout(settle, 150);
      },
      { passive: false },
    );
  }
}

setUpRails();
