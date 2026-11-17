(function () {

  // .partner-select-arrow 클릭 시 카드 3장이 실제로 서로 자리를 맞바꾸며 이동(FLIP). 화살표는
  // (1) 어느 카드가 is-selected가 될지, (2) 각 카드의 flex order를 바꿔서 왼쪽/가운데/오른쪽
  // 중 어디에 놓일지만 바꾼다
  function initPartnerCarousel() {
    const track = document.querySelector('.partner-select-track');
    if (!track) return;

    const cards = Array.from(track.querySelectorAll('.partner-select-card'));
    if (cards.length !== 3) return;

    // order[slot] = 그 자리(0 왼쪽, 1 가운데=선택, 2 오른쪽)에 놓인 카드 번호. 서버가 is-selected로 표시한
    // 기본 선택 카드(세미)가 가운데에 오도록, 순환 순서는 유지한 채 돌려서 시작한다
    const selectedIndex = cards.findIndex((card) => card.classList.contains('is-selected'));
    const initial = selectedIndex < 0 ? 1 : selectedIndex;
    let order = [(initial + 2) % 3, initial, (initial + 1) % 3];
    let animating = false;

    function applyOrder() {
      cards.forEach((card, i) => {
        const slot = order.indexOf(i);
        card.style.order = slot;
        card.classList.toggle('is-selected', slot === 1);
      });
    }

    function playFlip(mutateOrder, afterOrderChange) {
      if (animating) return;
      animating = true;

      const first = cards.map((card) => card.getBoundingClientRect());

      mutateOrder();
      applyOrder();
      afterOrderChange?.();

      const last = cards.map((card) => card.getBoundingClientRect());

      cards.forEach((card, i) => {
        const dx = first[i].left - last[i].left;
        const dy = first[i].top - last[i].top;
        const scale = last[i].width ? first[i].width / last[i].width : 1;

        card.style.transition = 'none';
        card.style.transformOrigin = 'top center';
        card.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cards.forEach((card) => {
            card.style.transition = 'transform 0.32s cubic-bezier(0.34, 1.2, 0.64, 1)';
            card.style.transform = '';
          });
        });
      });

      window.setTimeout(() => {
        cards.forEach((card) => { card.style.transition = ''; });
        animating = false;
      }, 340);
    }

    function rotate(dir) {
      playFlip(() => { order = dir < 0 ? [order[1], order[2], order[0]] : [order[2], order[0], order[1]]; });
    }

    applyOrder();

    document.querySelector('.partner-select-arrow-left')?.addEventListener('click', () => rotate(1));
    document.querySelector('.partner-select-arrow-right')?.addEventListener('click', () => rotate(-1));

    cards.forEach((card, i) => {
      card.addEventListener('click', () => {
        const slot = order.indexOf(i);
        if (slot === 0) rotate(1);
        else if (slot === 2) rotate(-1);
      });
    });
  }

  function initPartnerSelectConfirm() {
    const popup = document.querySelector('.partner-select-confirm-popup');
    const openBtn = document.querySelector('[data-confirm-open]');
    const closeBtn = popup?.querySelector('[data-confirm-close]');
    const titleEl = popup?.querySelector('.confirm-modal-title');
    const codeInput = document.getElementById('partnerCodeInput');
    if (!popup || !openBtn) return;

    openBtn.addEventListener('click', () => {
      const selected = document.querySelector('.partner-select-card.is-selected');
      if (selected) {
        if (codeInput) codeInput.value = selected.dataset.partner || '';
        const name = selected.querySelector('.partner-select-name')?.textContent?.trim();
        // 시안 문구("세미와 함께 탐사를 시작할까요?") 형식. 세미·한도·제로 모두 받침이 없어 조사는 "와"다.
        if (titleEl && name) titleEl.textContent = `${name}와 함께 탐사를 시작할까요?`;
      }
      popup.classList.add('is-open');
    });
    closeBtn?.addEventListener('click', () => popup.classList.remove('is-open'));
  }

  window.initPartnerCarousel = initPartnerCarousel;
  window.initPartnerSelectConfirm = initPartnerSelectConfirm;
})();
