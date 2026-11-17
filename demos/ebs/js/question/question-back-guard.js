(function () {

  // 태블릿/브라우저의 뒤로가기(하드웨어 버튼·제스처·브라우저 버튼)를 가로채 중단 확인 모달로 돌린다.
  // 뒤로가기 자체는 취소할 수 없으므로, 진입할 때 더미 히스토리를 한 칸 쌓아두고
  // popstate가 오면 그 칸을 다시 채워 넣는 방식으로 이탈을 붙잡는다.
  function initQuestionBackGuard() {
    // 실제 진단 문항에서만 붙잡는다 — 사전 훈련은 진단 세션(data-diagnosis-id)이 없어 이탈해도 잃을 게 없다
    const modal = document.querySelector('[data-question-modal="exit"]');
    if (!modal || !document.querySelector('.group-mcq[data-diagnosis-id]')) return;

    const pushGuard = () => history.pushState({ questionBackGuard: true }, '');

    pushGuard();

    const onPopState = () => {
      // 소비된 더미 칸을 곧바로 되채워, 다음 뒤로가기도 계속 여기서 받는다
      pushGuard();
      if (!modal.hasAttribute('hidden')) return;
      // 시간 초과로 끝난 뒤엔 "탐사 마치기"로만 나가야 하므로 중단 모달을 그 위에 겹쳐 띄우지 않는다
      if (document.querySelector('[data-question-modal="timeout"]:not([hidden])')) return;
      modal.removeAttribute('hidden');
      modal.querySelector('button')?.focus();
    };

    window.addEventListener('popstate', onPopState);

    // "탐사 끝내기"는 가드를 풀고 홈으로 내보낸다 — 가드를 안 풀면 이동이 다시 잡혀서 나갈 수 없음
    const confirmBtn = modal.querySelector('[data-question-exit-confirm]');
    confirmBtn?.addEventListener('click', () => {
      window.removeEventListener('popstate', onPopState);
      location.replace('home.html');
    });
  }

  window.initQuestionBackGuard = initQuestionBackGuard;
})();
