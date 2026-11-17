(function () {

  // 이미지 크게 보기. .image-zoom 안의 [data-image-zoom] 버튼을 누르면 같은 .image-zoom 안의 img를
  // 공통 모달(data-question-modal="image-zoom")에 띄운다.
  // 카드가 드래그 대상이거나 선지 버튼 안에 있어도 되도록 document 캡처 단계에서 먼저 가로채고,
  // 아이들 오터치를 줄이려고 "짧고 제자리에서 뗀 탭"일 때만 연다.
  const TAP_MAX_MOVE = 10;
  const TAP_MAX_MS = 500;
  const OPEN_GUARD_MS = 300;
  const DRAG_COOLDOWN_MS = 300;

  function initImageZoom() {
    const modal = document.querySelector('[data-question-modal="image-zoom"]');
    const view = modal?.querySelector('[data-image-zoom-view]');
    if (!modal || !view) return;

    let down = null;
    let dragging = false;
    let openedAt = 0;

    const findTrigger = (target) => target.closest?.('[data-image-zoom]');

    const open = (trigger) => {
      const img = trigger.closest('.image-zoom')?.querySelector('img');
      if (!img) return;
      // onerror로 샘플 이미지로 바뀐 경우까지 그대로 보이도록 실제 로드된 주소를 씀
      view.src = img.currentSrc || img.src;
      openedAt = Date.now();
      if (window.openQuestionModal) {
        window.openQuestionModal('image-zoom', trigger);
      } else {
        modal.removeAttribute('hidden');
      }
    };

    document.addEventListener('pointerdown', (event) => {
      const trigger = findTrigger(event.target);
      down = trigger ? { trigger, x: event.clientX, y: event.clientY, t: Date.now() } : null;
    }, true);

    // 카드를 끌다가 다른 카드의 아이콘 위에서 놓아도 열리지 않게 드래그 중·직후는 막음
    document.addEventListener('dragstart', () => { dragging = true; }, true);
    document.addEventListener('dragend', () => {
      setTimeout(() => { dragging = false; }, DRAG_COOLDOWN_MS);
    }, true);

    document.addEventListener('click', (event) => {
      // 열리자마자 연타로 닫히는 것 방지
      if (!modal.hidden && Date.now() - openedAt < OPEN_GUARD_MS && modal.contains(event.target)) {
        event.stopPropagation();
        return;
      }

      const trigger = findTrigger(event.target);
      if (!trigger) return;

      // 아이콘을 누른 건 선지 선택으로 이어지면 안 되므로 탭 판정과 상관없이 여기서 끊음
      event.stopPropagation();
      event.preventDefault();

      const isKeyboard = event.detail === 0;
      if (!isKeyboard) {
        if (dragging || !down || down.trigger !== trigger) return;
        const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
        if (moved > TAP_MAX_MOVE || Date.now() - down.t > TAP_MAX_MS) return;
      }
      down = null;
      open(trigger);
    }, true);

    // 선지 버튼(button) 안에서는 아이콘이 span[role=button]이라 키보드 조작을 직접 붙임
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const trigger = findTrigger(event.target);
      if (!trigger || trigger.tagName === 'BUTTON') return;
      event.preventDefault();
      event.stopPropagation();
      open(trigger);
    }, true);
  }

  window.initImageZoom = initImageZoom;
})();
