(function () {

  // 정적 퍼블리싱 버전: 채점·저장 없이 다음 문항 화면으로만 넘어간다.
  // 다음 화면은 .group-mcq[data-next-page]에 적혀 있다(문항 → 문항 → … → 탐사 완료).
  function submitAnswer(diagnosisId, endpoint, payload) {
    const root = document.querySelector('.group-mcq[data-next-page]');
    const next = root ? root.dataset.nextPage : 'diagnosis-outro.html';
    console.info('[demo] 제출', endpoint, payload);
    // location.replace: 문항 하나하나가 뒤로가기 히스토리에 쌓이지 않게 한다(문항→문항 이동은 진행 방향만 있음).
    window.location.replace(next);
    return Promise.resolve();
  }

  window.submitAnswer = submitAnswer;
})();
