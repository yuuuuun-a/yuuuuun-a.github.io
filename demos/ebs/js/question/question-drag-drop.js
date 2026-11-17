(function () {

  const QUESTION_SCOPE_CLASS_RE = /^question-(mcq|msq|class|sort|match|fill|num|exp)$/;

  // 문항 설명(?) 팝업의 데모 마크업(question-info-example.html)은 실제 문항과 같은 .group-mcq
  // 스코프 안에서 draggable 카드로 렌더링된다. "다시 하기"가 스코프 전체를 훑을 때 데모 카드까지
  // 실제 트레이로 옮겨버리는 걸 막기 위한 필터(question-submit-wiring.js의 isInInfoPopup과 동일).
  function isInInfoPopup(el) {
    return !!el.closest('.question-info-popup');
  }

  function findQuestionScopeClass(el) {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const match = [...node.classList].find((c) => QUESTION_SCOPE_CLASS_RE.test(c));
      if (match) return match;
    }
    return null;
  }

  const GHOST_SCALE = 0.6;

  // 마우스는 HTML5 Drag and Drop(dragstart/drop), 터치·펜은 Pointer Events로 처리한다. iOS Safari / Android Chrome은
  // HTML5 DnD를 터치에서 제대로 발화시키지 않는다. UA 문자열로 모바일을 가르면 iPad(iPadOS 13+는 Mac으로 보고)와
  // 안드로이드 "데스크톱 사이트" 모드를 놓치므로, 기기가 아니라 이벤트의 pointerType으로 가른다.
  function initCardDragDrop(cardClass, dropSelector, onDrop) {
    const cards = document.querySelectorAll(`.${cardClass}[draggable="true"]`);
    const dropTargets = document.querySelectorAll(dropSelector);
    if (!cards.length || !dropTargets.length) return;

    attachPointerDragHandlers(cards, dropSelector, onDrop);

    cards.forEach((card) => {
      card.addEventListener('dragstart', (event) => {
        // 터치로 끄는 중이면(안드로이드 Chrome은 길게 누르면 기본 드래그를 시작한다) Pointer Events 경로에 맡긴다
        if (card.dataset.touchDragging === 'true') {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', '');

        const scopeClass = findQuestionScopeClass(card);
        const rect = card.getBoundingClientRect();

        const allRects = [card, ...card.querySelectorAll('*')].map((node) => node.getBoundingClientRect());
        const unionLeft = Math.min(...allRects.map((r) => r.left));
        const unionTop = Math.min(...allRects.map((r) => r.top));
        const unionWidth = Math.max(...allRects.map((r) => r.right)) - unionLeft;
        const unionHeight = Math.max(...allRects.map((r) => r.bottom)) - unionTop;

        const ghost = card.cloneNode(true);
        ghost.classList.remove('is-dragging');
        ghost.style.position = 'absolute';
        ghost.style.margin = '0';
        ghost.style.left = `${rect.left - unionLeft}px`;
        ghost.style.top = `${rect.top - unionTop}px`;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;

        const stage = document.createElement('div');
        stage.style.position = 'relative';
        stage.style.width = `${unionWidth}px`;
        stage.style.height = `${unionHeight}px`;
        stage.style.transformOrigin = 'top left';
        stage.style.transform = `scale(${GHOST_SCALE})`;
        stage.appendChild(ghost);

        const container = document.createElement('div');
        container.style.width = `${unionWidth * GHOST_SCALE}px`;
        container.style.height = `${unionHeight * GHOST_SCALE}px`;
        container.style.overflow = 'hidden';
        container.appendChild(stage);

        const wrapper = document.createElement('div');
        if (scopeClass) wrapper.className = scopeClass;
        wrapper.style.position = 'fixed';
        wrapper.style.top = '-9999px';
        wrapper.style.left = '-9999px';
        wrapper.appendChild(container);
        document.body.appendChild(wrapper);

        event.dataTransfer.setDragImage(
          container,
          (event.clientX - unionLeft) * GHOST_SCALE,
          (event.clientY - unionTop) * GHOST_SCALE
        );
        setTimeout(() => wrapper.remove(), 0);

        // dragstart 핸들러 안에서 바로 is-dragging을 추가하면 브라우저가 그 상태 그대로 고스트 이미지를 찍어버리므로, 한 프레임 늦춰서 붙임
        requestAnimationFrame(() => card.classList.add('is-dragging'));
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
      });
    });

    dropTargets.forEach((target) => {
      target.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        target.classList.add('is-drag-over');
      });

      target.addEventListener('dragleave', (event) => {
        if (target.contains(event.relatedTarget)) return; // 자식 요소로 옮겨간 것뿐이면 is-drag-over를 유지
        target.classList.remove('is-drag-over');
      });

      target.addEventListener('drop', (event) => {
        event.preventDefault();
        target.classList.remove('is-drag-over');

        const card = document.querySelector(`.${cardClass}.is-dragging`);
        if (!card) return;

        onDrop(card, target);
      });
    });
  }

  // 터치·펜 경로(Pointer Events). 선긋기(question-line-match.js)·각도 조절(question-angle-dial.js)과 같은 방식이라
  // 모바일에서 같은 조건으로 동작한다:
  //  - setPointerCapture로 손가락을 뗄 때까지 이 카드가 이벤트를 받는다.
  //  - 카드에 touch-action: none을 걸어 끄는 동안 브라우저가 화면 스크롤로 가로채지(pointercancel) 않게 한다.
  //  - 원래 카드는 DOM에서 옮기지 않고 그 자리에서 숨기기만 한다(visibility). 터치 중인 요소를 DOM에서 떼어 옮기면
  //    iOS Safari 등이 이후 move/up 이벤트를 제대로 보내지 않는다 — 예전 Touch Events 구현이 모바일에서 안 되던 원인.
  //    손가락을 따라오는 건 복제본(고스트)이다. fill-tray/exp-tray 등은 overflow가 걸려 있어 트레이 밖으로 나가면 잘리므로
  //    고스트는 scope class를 가진 wrapper에 담아 body에 fixed로 띄운다(데스크톱 고스트와 같은 패턴).
  //  - DRAG_THRESHOLD만큼 움직여야 드래그로 본다(그 전에 떼면 탭 — 이미지 크게 보기 등이 그대로 동작).
  const DRAG_THRESHOLD = 6;

  function attachPointerDragHandlers(cards, dropSelector, onDrop) {
    cards.forEach((card) => {
      card.style.touchAction = 'none';
      let press = null;

      function hover(target) {
        if (target === press.overTarget) return;
        press.overTarget?.classList.remove('is-drag-over');
        target?.classList.add('is-drag-over');
        press.overTarget = target;
      }

      function dropTargetAt(x, y) {
        const under = document.elementFromPoint(x, y);
        return under ? under.closest(dropSelector) : null;
      }

      function startGhost() {
        const rect = card.getBoundingClientRect();
        const ghost = card.cloneNode(true);
        ghost.removeAttribute('draggable');
        ghost.classList.remove('is-dragging', 'is-moved');
        ghost.style.margin = '0';
        ghost.style.transition = 'none';
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;

        const scopeClass = findQuestionScopeClass(card);
        const wrapper = document.createElement('div');
        if (scopeClass) wrapper.className = scopeClass;
        wrapper.style.position = 'fixed';
        wrapper.style.left = `${rect.left}px`;
        wrapper.style.top = `${rect.top}px`;
        wrapper.style.zIndex = '9999';
        // 고스트 밑의 드롭존을 elementFromPoint가 집도록 포인터를 통과시킨다
        wrapper.style.pointerEvents = 'none';
        wrapper.appendChild(ghost);
        document.body.appendChild(wrapper);

        card.style.visibility = 'hidden';
        press.wrapper = wrapper;
      }

      function finish() {
        if (!press) return;
        press.overTarget?.classList.remove('is-drag-over');
        press.wrapper?.remove();
        card.style.visibility = '';
        delete card.dataset.touchDragging;
        press = null;
      }

      card.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' || !event.isPrimary) return; // 마우스는 HTML5 DnD 경로
        // 크게 보기 아이콘을 누른 건 드래그로 치지 않음(포인터를 잡으면 아이콘 click이 카드로 넘어가 모달이 안 열림)
        if (event.target.closest('[data-image-zoom]')) return;
        press = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
                  dragging: false, overTarget: null, wrapper: null };
        card.dataset.touchDragging = 'true';
        card.setPointerCapture(event.pointerId);
      });

      card.addEventListener('pointermove', (event) => {
        if (!press || event.pointerId !== press.pointerId) return;
        const dx = event.clientX - press.startX;
        const dy = event.clientY - press.startY;
        if (!press.dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          press.dragging = true;
          startGhost();
        }
        event.preventDefault();
        press.wrapper.style.transform = `translate(${dx}px, ${dy}px)`;
        hover(dropTargetAt(event.clientX, event.clientY));
      });

      card.addEventListener('pointerup', (event) => {
        if (!press || event.pointerId !== press.pointerId) return;
        if (card.hasPointerCapture(event.pointerId)) card.releasePointerCapture(event.pointerId);
        const target = press.dragging ? dropTargetAt(event.clientX, event.clientY) : null;
        finish();
        if (target) onDrop(card, target); // 콜백이 target.appendChild(card)로 카드를 트레이/슬롯에 옮긴다
      });

      card.addEventListener('pointercancel', (event) => {
        if (!press || event.pointerId !== press.pointerId) return;
        finish(); // 드롭 실패: 카드는 원래 자리에 그대로 있다
      });
    });
  }

  // 카드 이동 시 잠깐 반짝이는 is-moved 효과 — 연달아 옮겨도 재생되도록 클래스를 지웠다 리플로우를 강제한 뒤 다시 붙임
  function flashCard(card) {
    card.classList.remove('is-moved');
    void card.offsetWidth; // 리플로우를 강제해서 클래스 제거 직후 재추가해도 애니메이션이 처음부터 다시 시작되게 함
    card.classList.add('is-moved');
  }

  document.addEventListener('animationend', (event) => {
    if (['classify-card-move-flash', 'order-card-move-flash', 'fill-card-move-flash', 'exp-card-move-flash'].includes(event.animationName)) {
      event.target.classList.remove('is-moved');
    }
  });

  function initClassifyDragDrop() {
    initCardDragDrop('classify-card', '.classify-tray, .classify-zone', (card, target) => {
      if (target.classList.contains('classify-tray')) {
        card.classList.remove('classify-card-placed');
        target.appendChild(card);
      } else {
        const list = target.querySelector('.classify-zone-cards');
        if (!list) return;
        card.classList.add('classify-card-placed');
        list.appendChild(card);
      }
      flashCard(card);
    });
  }

  function initOrderDragDrop() {
    initCardDragDrop('order-card', '.order-tray, .order-slot', (card, target) => {
      if (target.classList.contains('order-tray')) {
        target.appendChild(card);
        flashCard(card);
        return;
      }

      const existing = target.querySelector('.order-card');
      if (existing && existing !== card) {
        document.querySelector('.order-tray')?.appendChild(existing);
      }
      target.appendChild(card);
      flashCard(card);
    });
  }

  // 트레이는 카드가 빠져나가도 폭이 줄지 않게 처음 폭을 인라인으로 굳혀 둔다.
  // 단 0으로 재지는 트레이는 건너뛴다 — 안내 팝업 예시처럼 아직 hidden인 트레이를
  // 0px로 굳히면 패딩만 남아 납작하게 찌그러진다(그 뒤로는 절대 펴지지 않는다).
  // root를 주면 그 안의 트레이만 다시 잰다(팝업이 열릴 때 question-info-demo.js가 호출).
  function lockTrayWidths(selector, root) {
    (root || document).querySelectorAll(selector).forEach((tray) => {
      const locked = tray.style.width;
      tray.style.width = '';
      const width = tray.getBoundingClientRect().width;
      if (!width) {
        tray.style.width = locked;
        return;
      }
      tray.style.width = `${width}px`;
    });
  }

  function initFillDragDrop() {
    lockTrayWidths('.fill-tray');
    window.addEventListener('resize', () => lockTrayWidths('.fill-tray'));

    initCardDragDrop('fill-card', '.fill-tray, .fill-slot', (card, target) => {
      if (target.classList.contains('fill-tray')) {
        target.appendChild(card);
        flashCard(card);
        return;
      }

      const existing = target.querySelector('.fill-card');
      if (existing && existing !== card) {
        document.querySelector('.fill-tray')?.appendChild(existing);
      }
      target.appendChild(card);
      flashCard(card);
    });
  }

  function initExpDragDrop() {
    lockTrayWidths('.exp-tray');
    window.addEventListener('resize', () => lockTrayWidths('.exp-tray'));

    initCardDragDrop('exp-card', '.exp-tray, .exp-slot', (card, target) => {
      if (target.classList.contains('exp-tray')) {
        target.appendChild(card);
        flashCard(card);
        return;
      }

      const existing = target.querySelector('.exp-card');
      if (existing && existing !== card) {
        document.querySelector('.exp-tray')?.appendChild(existing);
      }
      target.appendChild(card);
      flashCard(card);
    });
  }

  function initResetButton() {
    document.querySelectorAll('.question-action-btn-secondary').forEach((btn) => {
      if (isInInfoPopup(btn)) return;
      const scope = btn.closest('.group-mcq');
      const tray = [...(scope?.querySelectorAll('.classify-tray, .order-tray, .fill-tray, .exp-tray') || [])]
        .find((el) => !isInInfoPopup(el));
      if (!tray) return;

      const isClassify = tray.classList.contains('classify-tray');
      const cardSelector = isClassify ? '.classify-card'
        : tray.classList.contains('order-tray') ? '.order-card'
        : tray.classList.contains('fill-tray') ? '.fill-card'
        : '.exp-card';

      btn.addEventListener('click', () => {
        scope.querySelectorAll(cardSelector).forEach((card) => {
          if (isInInfoPopup(card)) return;
          if (tray.contains(card)) return;
          if (isClassify) card.classList.remove('classify-card-placed');
          tray.appendChild(card);
          flashCard(card);
        });
      });
    });
  }

  window.lockTrayWidths = lockTrayWidths;
  window.initClassifyDragDrop = initClassifyDragDrop;
  window.initOrderDragDrop = initOrderDragDrop;
  window.initFillDragDrop = initFillDragDrop;
  window.initExpDragDrop = initExpDragDrop;
  window.initResetButton = initResetButton;
})();
