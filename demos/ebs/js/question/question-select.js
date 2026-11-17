(function () {

  // .option-box 클릭 시 같은 .question-options 안에서 .is-selected를 단일 선택으로 유지
  function initOptionSelect() {
    document.querySelectorAll('.question-options').forEach((group) => {
      const options = group.querySelectorAll('.option-box');

      options.forEach((option) => {
        option.addEventListener('click', () => {
          options.forEach((el) => el.classList.remove('is-selected'));
          option.classList.add('is-selected');
        });
      });
    });
  }

  // .answer-tile 클릭 시 각자 .is-selected를 개별 토글 — "모두 고르시오" 문항이라
  // option-box와 달리 여러 개를 동시에 선택할 수 있음(단일 선택 강제 안 함)
  function initAnswerGridSelect() {
    document.querySelectorAll('.answer-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        tile.classList.toggle('is-selected');
        if (tile.classList.contains('is-selected')) syncCornerPulse(tile);
      });
    });
  }

  // 선택된 타일들의 모서리 펄스가 선택 시점과 상관없이 같은 박자로 뛰도록
  // CSS 애니메이션 시작 시점을 문서 타임라인 0으로 통일
  function syncCornerPulse(tile) {
    tile.querySelectorAll('.answer-tile-corner').forEach((corner) => {
      corner.getAnimations().forEach((anim) => { anim.startTime = 0; });
    });
  }

  // question-hotspot: 좌표평면 위 후보 지점(.hotspot-point) 클릭 시 .is-selected를 토글해
  // hotspot-point-icon-active가 보이게 함(option-box와 같은 규칙 — 같은 좌표평면 안에서 단일 선택만 유지)
  function initHotspotSelect() {
    document.querySelectorAll('.hotspot-grid').forEach((grid) => {
      const points = grid.querySelectorAll('.hotspot-point');

      points.forEach((point) => {
        point.addEventListener('click', () => {
          points.forEach((p) => p.classList.remove('is-selected'));
          point.classList.add('is-selected');
        });
      });
    });
  }

  // .ox-toggle 클릭 시 같은 .ox-row-toggles 안에서 .is-selected를 단일 선택으로 유지(O/X 둘 중 하나).
  // "다시 하기" 버튼을 누르면 모든 행의 선택을 해제한다.
  function initOxToggle() {
    const toggleGroups = document.querySelectorAll('.ox-row-toggles');
    if (!toggleGroups.length) return;

    toggleGroups.forEach((group) => {
      const toggles = group.querySelectorAll('.ox-toggle');

      toggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
          toggles.forEach((el) => el.classList.remove('is-selected'));
          toggle.classList.add('is-selected');
        });
      });
    });

    document.querySelector('.question-action-btn-secondary')?.addEventListener('click', () => {
      document.querySelectorAll('.ox-toggle.is-selected').forEach((el) => el.classList.remove('is-selected'));
    });
  }

  // question-hotspot(실제 데이터): 우측 좌표평면(.hotspot-board) 위 후보점(.hotspot-point) 클릭 시 개별 토글.
  // 정답이 1개든 여러 개든 규칙은 같다(선택 집합이 정답 집합과 정확히 일치해야 정답) — hotspot-select와
  // 달리 단일 선택을 강제하지 않는다. 설명 팝업의 데모도 같은 .hotspot-point를 쓰지만 .hotspot-grid 안에 있어서
  // .hotspot-board로 범위를 좁혀 안 겹치게 한다.
  // select_flag=0인 점(.hotspot-point-fixed, <span>으로 렌더링됨)은 그래프 모양만 채우는 맥락용이라 제외.
  // "전체 해제" 버튼을 누르면 좌표평면 위 선택을 모두 해제한다.
  function initHotspotMarkerSelect() {
    const markers = document.querySelectorAll('.hotspot-board .hotspot-point:not(.hotspot-point-fixed)');
    markers.forEach((marker) => {
      marker.addEventListener('click', () => marker.classList.toggle('is-selected'));
    });

    document.querySelector('.question-hotspot .question-action-btn-secondary')?.addEventListener('click', () => {
      markers.forEach((marker) => marker.classList.remove('is-selected'));
    });
  }

  window.initOptionSelect = initOptionSelect;
  window.initAnswerGridSelect = initAnswerGridSelect;
  window.initHotspotSelect = initHotspotSelect;
  window.initHotspotMarkerSelect = initHotspotMarkerSelect;
  window.initOxToggle = initOxToggle;
})();
