(function () {

  // 문항 화면 공통 모달(모르겠어요 / 중단 확인 / 시간 초과) 열고 닫기.
  // 여는 쪽은 data-question-modal-open="<이름>", 닫는 쪽은 모달 안의 data-question-modal-close로만 잡는다
  // — 버튼이 늘어나도 JS는 그대로 두고 마크업에 표식만 달면 됨.
  function initQuestionModal() {
    const modals = document.querySelectorAll('[data-question-modal]');
    if (!modals.length) return;

    // 닫은 뒤 원래 눌렀던 버튼으로 포커스를 돌려주기 위해 기억해 둠
    let lastTrigger = null;

    const open = (name, trigger) => {
      const modal = document.querySelector(`[data-question-modal="${name}"]`);
      if (!modal) return;
      lastTrigger = trigger || null;
      modal.removeAttribute('hidden');
      // 모달 안에서 처음 만나는 버튼으로 포커스를 옮겨 키보드로도 바로 쓸 수 있게 함
      modal.querySelector('button')?.focus();
    };

    const close = (modal) => {
      if (!modal || modal.hasAttribute('hidden')) return;
      modal.setAttribute('hidden', '');
      if (lastTrigger) {
        lastTrigger.focus();
        lastTrigger = null;
      }
    };

    // 시간 초과처럼 반드시 버튼으로만 빠져나가야 하는 모달(data-question-modal-persistent)은 Esc로 닫지 않는다
    const closeAll = () => modals.forEach((modal) => {
      if (!modal.hasAttribute('data-question-modal-persistent')) close(modal);
    });

    // "이 문제는 넘어가기"는 진단 세션(data-diagnosis-id)이 있어야 서버에 넘김으로 기록된다.
    // 사전 훈련처럼 세션이 없는 화면에서는 확인해도 넘어갈 수 없으므로 모달 자체를 열지 않는다.
    const hasDiagnosis = !!document.querySelector('.group-mcq[data-diagnosis-id]');

    document.querySelectorAll('[data-question-modal-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.questionModalOpen;
        if (name === 'skip' && !hasDiagnosis) return;
        open(name, btn);
      });
    });

    // 딤 영역과 "조금 더 생각해보기" 같은 되돌리기 버튼은 모두 같은 표식으로 닫음
    modals.forEach((modal) => {
      modal.querySelectorAll('[data-question-modal-close]').forEach((el) => {
        el.addEventListener('click', () => close(modal));
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });

    // 타이머 종료처럼 버튼 클릭 없이 스크립트에서 직접 열어야 하는 경우(예: timeout)를 위한 진입점
    window.openQuestionModal = open;
  }

  window.initQuestionModal = initQuestionModal;
})();
