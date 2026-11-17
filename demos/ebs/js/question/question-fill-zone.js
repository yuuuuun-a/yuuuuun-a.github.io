(function () {

  // 빈칸 채우기 문장(.fill-zone-line)이 세 줄 이상으로 넘어가면 .fill-zone에 .is-3lines를 붙인다.
  // 빈칸(.fill-slot)이 글자보다 키가 커서 높이 / line-height로는 못 세므로, 줄 안 조각들의 박스를 위에서부터
  // 훑어 세로로 겹치지 않는 묶음이 몇 개인지로 센다(KaTeX 수식은 바깥 span의 줄별 조각만 본다).
  const MIN_LINES = 3;

  function countLines(line) {
    const rects = [...line.children]
      .flatMap((el) => [...el.getClientRects()])
      .filter((rect) => rect.height > 0)
      .sort((a, b) => a.top - b.top);

    let count = 0;
    let bottom = -Infinity;
    rects.forEach((rect) => {
      if (rect.top >= bottom - 1) {
        count++;
        bottom = rect.bottom;
      } else {
        bottom = Math.max(bottom, rect.bottom);
      }
    });
    return count;
  }

  // 여백이 바뀌면 줄 폭도 바뀌어 줄 수가 다시 달라질 수 있으므로, 항상 기본 여백 상태에서 재고 붙인다.
  function updateLines(line) {
    const zone = line.closest('.fill-zone');
    if (!zone) return;

    zone.classList.remove('is-3lines');
    zone.classList.toggle('is-3lines', countLines(line) >= MIN_LINES);
  }

  function initFillZoneLines() {
    document.querySelectorAll('.fill-zone-line').forEach((line) => {
      updateLines(line);
      if ('ResizeObserver' in window) {
        new ResizeObserver(() => updateLines(line)).observe(line);
      }
    });
  }

  window.initFillZoneLines = initFillZoneLines;
})();
