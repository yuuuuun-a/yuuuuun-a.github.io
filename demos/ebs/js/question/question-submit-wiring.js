(function () {

  function diagnosisId() {
    const root = document.querySelector('.group-mcq[data-diagnosis-id]');
    return root ? root.dataset.diagnosisId : null;
  }

  function onSubmitClick(selector, handler) {
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.addEventListener('click', handler);
  }

  // 문항 설명(?) 팝업의 데모 마크업은 실제 상호작용 요소와 클래스/data-* 속성을 그대로 재사용하면서
  // 같은 .question-xxx 스코프 안에 렌더링된다(question-info-example.html). 제출값을 모을 때
  // 팝업 안쪽 요소까지 같이 잡히면 안 되므로 이 필터로 걸러낸다.
  function isInInfoPopup(el) {
    return !!el.closest('.question-info-popup');
  }

  // 답안을 하나도 안 넣고 "완료"를 누른 경우만 막는다. 일부만 채운 답안은 그대로 제출되고 서버가 오답 처리한다.
  // 답을 모르면 "이 문제 넘어가기"(skip)로 넘어간다.
  function isEmpty(values) {
    return Object.keys(values).length === 0;
  }

  // 하단 .question-action 버튼을 입력 상태에 맞춰 disabled로 둔다.
  // 완료 버튼은 canSubmit()이 false면, 다시 하기/전체 해제 버튼은 hasInput()이 false면 비활성.
  // 선택/드래그/키패드 상태는 각 상호작용 스크립트가 클래스·DOM으로만 바꾸므로 스코프 변화를 지켜보고 다시 계산한다.
  function syncActionState(scope, canSubmit, hasInput = canSubmit) {
    const action = [...scope.querySelectorAll('.question-action')].find((el) => !isInInfoPopup(el));
    if (!action) return;
    const primary = action.querySelector('.question-action-btn:not(.question-action-btn-secondary)');
    const secondary = action.querySelector('.question-action-btn-secondary');

    const update = () => {
      if (primary) primary.disabled = !canSubmit();
      if (secondary) secondary.disabled = !hasInput();
    };

    update();
    new MutationObserver(update).observe(scope, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  // OX: 선지마다 O/X 선택. 하나라도 안 골랐으면 막는다.
  function initOxSubmit() {
    const scope = document.querySelector('.question-ox');
    if (!scope) return;
    const id = diagnosisId();
    const rows = () => [...scope.querySelectorAll('.ox-row[data-statement-id]')].filter((el) => !isInInfoPopup(el));

    syncActionState(scope,
      () => rows().length > 0 && rows().every((row) => row.querySelector('.ox-toggle.is-selected')),
      () => rows().some((row) => row.querySelector('.ox-toggle.is-selected')));

    onSubmitClick('.question-ox .question-action-btn:not(.question-action-btn-secondary)', () => {
      const answers = {};
      let missing = false;
      rows().forEach((row) => {
        const statementId = row.dataset.statementId;
        const selected = row.querySelector('.ox-toggle.is-selected');
        if (!selected) { missing = true; return; }
        answers[statementId] = selected.classList.contains('ox-toggle-o');
      });
      if (missing) { alert('모든 선지에 O/X를 선택해주세요.'); return; }
      submitAnswer(id, 'submit-ox', { answers });
    });
  }

  // MCQ: 단일 선택.
  function initMcqSubmit() {
    const scope = document.querySelector('.question-mcq');
    if (!scope) return;
    const id = diagnosisId();
    const selected = () => [...scope.querySelectorAll('.option-box.is-selected')].find((el) => !isInInfoPopup(el));

    syncActionState(scope, () => !!selected());

    onSubmitClick('.question-mcq .question-action-btn', () => {
      const choice = selected();
      if (!choice) { alert('답을 선택해주세요.'); return; }
      submitAnswer(id, 'submit-mcq', { choiceNo: Number(choice.dataset.choiceId) });
    });
  }

  // MSQ: 다중 선택.
  function initMsqSubmit() {
    const scope = document.querySelector('.question-msq');
    if (!scope) return;
    const id = diagnosisId();
    const selected = () => [...scope.querySelectorAll('.answer-tile.is-selected')].filter((el) => !isInInfoPopup(el));

    syncActionState(scope, () => selected().length > 0);

    onSubmitClick('.question-msq .question-action-btn', () => {
      const tiles = selected();
      if (!tiles.length) { alert('답을 하나 이상 선택해주세요.'); return; }
      const choiceNos = tiles.map((el) => Number(el.dataset.choiceId));
      submitAnswer(id, 'submit-msq', { choiceNos });
    });
  }

  // CLASS: 카드를 존(zone)에 드래그해서 분류. 트레이에 남은 카드는 미배정으로 취급되어 오답 처리됨.
  function initClassSubmit() {
    const scope = document.querySelector('.question-class');
    if (!scope) return;
    const id = diagnosisId();
    const collect = () => {
      const values = {};
      scope.querySelectorAll('.classify-zone[data-category-id]').forEach((zone) => {
        if (isInInfoPopup(zone)) return;
        const categoryId = Number(zone.dataset.categoryId);
        zone.querySelectorAll('.classify-card[data-item-id]').forEach((card) => {
          values[card.dataset.itemId] = categoryId;
        });
      });
      return values;
    };

    syncActionState(scope, () => !isEmpty(collect()));

    onSubmitClick('.question-class .question-action-btn:not(.question-action-btn-secondary)', () => {
      const values = collect();
      if (isEmpty(values)) { alert('카드를 하나 이상 분류해주세요.'); return; }
      submitAnswer(id, 'submit-class', { values });
    });
  }

  // SORT: 트레이의 카드를 슬롯(.order-slot)에 드래그해서 순서대로 배열. 안 채운 슬롯은 미배정으로 취급되어 오답 처리됨.
  function initSortSubmit() {
    const scope = document.querySelector('.question-sort');
    if (!scope) return;
    const id = diagnosisId();
    const collect = () => {
      const values = {};
      scope.querySelectorAll('.order-slot[data-index]').forEach((slot) => {
        if (isInInfoPopup(slot)) return;
        const card = slot.querySelector('.order-card[data-item-id]');
        if (card) values[slot.dataset.index] = Number(card.dataset.itemId);
      });
      return values;
    };

    syncActionState(scope, () => !isEmpty(collect()));

    onSubmitClick('.question-sort .question-action-btn:not(.question-action-btn-secondary)', () => {
      const values = collect();
      if (isEmpty(values)) { alert('카드를 하나 이상 배열해주세요.'); return; }
      submitAnswer(id, 'submit-sort', { values });
    });
  }

  // MATCH: 선긋기(question-line-match.js가 관리하는 연결 상태를 읽어온다).
  function initMatchSubmit() {
    const scope = document.querySelector('.question-match');
    if (!scope) return;
    const id = diagnosisId();
    const collect = () => {
      const lineMatch = [...scope.querySelectorAll('.line-match')].find((el) => !isInInfoPopup(el));
      const connections = lineMatch?.getConnections ? lineMatch.getConnections() : [];
      const values = {};
      connections.forEach((c) => { values[c.itemId] = c.targetId; });
      return values;
    };

    syncActionState(scope, () => !isEmpty(collect()));

    onSubmitClick('.question-match .question-action-btn:not(.question-action-btn-secondary)', () => {
      const values = collect();
      if (isEmpty(values)) { alert('선을 하나 이상 연결해주세요.'); return; }
      submitAnswer(id, 'submit-match', { values });
    });
  }

  // FILL: 빈칸(.fill-slot)에 카드를 드래그해서 채운다. 안 채운 빈칸은 미배정으로 취급되어 오답 처리됨.
  function initFillSubmit() {
    const scope = document.querySelector('.question-fill');
    if (!scope) return;
    const id = diagnosisId();
    const collect = () => {
      const values = {};
      scope.querySelectorAll('.fill-slot[data-index]').forEach((slot) => {
        if (isInInfoPopup(slot)) return;
        const card = slot.querySelector('.fill-card[data-choice-id]');
        if (card) values[slot.dataset.index] = Number(card.dataset.choiceId);
      });
      return values;
    };

    syncActionState(scope, () => !isEmpty(collect()));

    onSubmitClick('.question-fill .question-action-btn:not(.question-action-btn-secondary)', () => {
      const values = collect();
      if (isEmpty(values)) { alert('빈칸을 하나 이상 채워주세요.'); return; }
      submitAnswer(id, 'submit-fill', { values });
    });
  }

  // EXP: 빈칸(.exp-slot)에 수식 카드를 드래그해서 채운다. 안 채운 빈칸은 미배정으로 취급되어 오답 처리됨.
  function initExpSubmit() {
    const scope = document.querySelector('.question-exp');
    if (!scope) return;
    const id = diagnosisId();
    const collect = () => {
      const values = {};
      scope.querySelectorAll('.exp-slot[data-index]').forEach((slot) => {
        if (isInInfoPopup(slot)) return;
        const card = slot.querySelector('.exp-card[data-choice-id]');
        if (card) values[slot.dataset.index] = Number(card.dataset.choiceId);
      });
      return values;
    };

    syncActionState(scope, () => !isEmpty(collect()));

    onSubmitClick('.question-exp .question-action-btn:not(.question-action-btn-secondary)', () => {
      const values = collect();
      if (isEmpty(values)) { alert('빈칸을 하나 이상 채워주세요.'); return; }
      submitAnswer(id, 'submit-exp', { values });
    });
  }

  // HOTSPOT: 좌표평면(.hotspot-board) 위 후보점(.hotspot-point) 중 선택된(is-selected) 것들을 그대로 제출.
  // 하나도 안 골랐으면 막는다(MSQ와 같음).
  function initHotspotSubmit() {
    const scope = document.querySelector('.question-hotspot');
    if (!scope) return;
    const id = diagnosisId();
    const collect = () => [...scope.querySelectorAll('.hotspot-board .hotspot-point.is-selected')]
      .filter((el) => !isInInfoPopup(el))
      .map((el) => Number(el.dataset.hotspotId));

    syncActionState(scope, () => collect().length > 0);

    onSubmitClick('.question-hotspot .question-action-btn:not(.question-action-btn-secondary)', () => {
      const hotspotNos = collect();
      if (!hotspotNos.length) { alert('점을 하나 이상 선택해주세요.'); return; }
      submitAnswer(id, 'submit-hotspot', { hotspotNos });
    });
  }

  // DRAG: 각도 게이지(.drag-gauge)의 현재 값(question-angle-dial.js가 dataset.value에 반영)을 그대로 제출.
  // 바늘을 한 번도 안 움직였으면(시작 각도 그대로 = question-angle-dial.js가 is-touched를 안 붙임) 막는다.
  function initDragSubmit() {
    const scope = document.querySelector('.question-drag');
    if (!scope) return;
    const id = diagnosisId();
    const gauge = () => [...scope.querySelectorAll('.drag-gauge')].find((el) => !isInInfoPopup(el));

    syncActionState(scope, () => !!gauge()?.classList.contains('is-touched'));

    onSubmitClick('.question-drag .question-action-btn', () => {
      const el = gauge();
      if (!el || !el.classList.contains('is-touched')) { alert('바늘을 움직여 각도를 맞춰주세요.'); return; }
      const angle = Number(el.dataset.value);
      submitAnswer(id, 'submit-drag', { angle });
    });
  }

  // NUM: 키패드에 입력된 숫자를 그대로 읽는다.
  function initNumSubmit() {
    const scope = document.querySelector('.question-num');
    if (!scope) return;
    const id = diagnosisId();
    const read = () => [...scope.querySelectorAll('.keypad-display-slot')]
      .filter((el) => !isInInfoPopup(el))
      .map((s) => s.textContent.trim())
      .join('');

    syncActionState(scope, () => {
      const value = read();
      return !!value && Number.isFinite(Number(value));
    });

    onSubmitClick('.question-num .question-action-btn', () => {
      const value = read();
      if (!value) { alert('답을 입력해주세요.'); return; }
      const num = Number(value);
      if (!Number.isFinite(num)) { alert('답을 입력해주세요.'); return; }
      submitAnswer(id, 'submit-num', { answer: num });
    });
  }

  // 이 문제 넘어가기: 답을 고르지 않고 넘어가므로 서버가 오답 처리 로직을 그대로 태운다.
  function initSkipSubmit() {
    const modal = document.querySelector('[data-question-modal="skip"]');
    const id = diagnosisId();
    if (!modal || !id) return;

    modal.querySelector('[data-question-skip-confirm]')?.addEventListener('click', () => {
      submitAnswer(id, 'skip', {});
    });
  }

  window.initSkipSubmit = initSkipSubmit;
  window.initOxSubmit = initOxSubmit;
  window.initMcqSubmit = initMcqSubmit;
  window.initMsqSubmit = initMsqSubmit;
  window.initClassSubmit = initClassSubmit;
  window.initSortSubmit = initSortSubmit;
  window.initMatchSubmit = initMatchSubmit;
  window.initFillSubmit = initFillSubmit;
  window.initExpSubmit = initExpSubmit;
  window.initNumSubmit = initNumSubmit;
  window.initHotspotSubmit = initHotspotSubmit;
  window.initDragSubmit = initDragSubmit;
})();
