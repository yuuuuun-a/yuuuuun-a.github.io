(function () {

  // 우측 상단 시험 타이머. 남은 초(data-remaining-seconds)를 받아 1초마다 카운트다운한다.
  // 0초가 되면 시간 초과 모달을 띄우고, "탐사 마치기"로 시간 초과용 탐사 완료 화면(outro)에 보낸다.
  function initExamTimer() {
    const chip = document.querySelector('.header-chip-time');
    if (!chip || chip.dataset.remainingSeconds === undefined) return;

    document.querySelector('[data-question-timeout-confirm]')?.addEventListener('click', () => {
      // replace: 끝난 문항 화면이 뒤로가기 히스토리에 남지 않게 한다
      location.replace('diagnosis-outro-timeout.html');
    });

    const initialRemaining = parseInt(chip.dataset.remainingSeconds, 10);
    const deadline = Date.now() + initialRemaining * 1000;

    function render(remainingSeconds) {
      const clamped = Math.max(0, remainingSeconds);
      const minutes = Math.floor(clamped / 60);
      const seconds = clamped % 60;
      chip.textContent = (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
    }

    render(initialRemaining);
    if (initialRemaining <= 0) {
      window.openQuestionModal?.('timeout');
      return;
    }

    const timer = setInterval(() => {
      const remainingSeconds = Math.round((deadline - Date.now()) / 1000);
      render(remainingSeconds);
      if (remainingSeconds <= 0) {
        clearInterval(timer);
        window.openQuestionModal?.('timeout');
      }
    }, 1000);
  }

  window.initExamTimer = initExamTimer;
})();
