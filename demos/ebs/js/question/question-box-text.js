(function () {

  // 발문(.question-box-text)이 두 줄 이상으로 넘어가면 .question-box에 .is-multiline을 붙인다.
  // 줄 수는 높이 / line-height로 세고, 수식 렌더링·폰트 로딩·화면 크기 변화로 높이가 바뀔 때마다 다시 잰다.
  function updateLines(text) {
    const box = text.closest('.question-box');
    if (!box) return;

    const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
    const height = text.getBoundingClientRect().height;
    box.classList.toggle('is-multiline', !!lineHeight && height > lineHeight * 1.5);
  }

  function initQuestionBoxText() {
    document.querySelectorAll('.question-box-text').forEach((text) => {
      updateLines(text);
      if ('ResizeObserver' in window) {
        new ResizeObserver(() => updateLines(text)).observe(text);
      }
    });
  }

  window.initQuestionBoxText = initQuestionBoxText;
})();
