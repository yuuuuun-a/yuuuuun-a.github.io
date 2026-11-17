(function () {

  // 발문 이미지(.question-box-image)의 실제 크기를 읽어 1:1 / 4:3 / 16:9 중 가장 가까운 비율 클래스를
  // 감싸는 .question-box-media에 붙인다. 1:1은 기본값이라 클래스를 붙이지 않음.
  const RATIOS = [
    { value: 1, className: '' },
    { value: 4 / 3, className: 'question-box-media-4x3' },
    { value: 16 / 9, className: 'question-box-media-16x9' },
  ];

  function applyRatio(img) {
    const media = img.closest('.question-box-media');
    if (!media || !img.naturalWidth || !img.naturalHeight) return;

    const ratio = img.naturalWidth / img.naturalHeight;
    const nearest = RATIOS.reduce((best, r) =>
      Math.abs(r.value - ratio) < Math.abs(best.value - ratio) ? r : best);

    RATIOS.forEach((r) => r.className && media.classList.remove(r.className));
    if (nearest.className) media.classList.add(nearest.className);
  }

  function initQuestionBoxImage() {
    document.querySelectorAll('.question-box-media .question-box-image').forEach((img) => {
      // onerror로 샘플 이미지로 바뀌는 경우도 다시 재도록 load마다 계산
      img.addEventListener('load', () => applyRatio(img));
      if (img.complete) applyRatio(img);
    });
  }

  window.initQuestionBoxImage = initQuestionBoxImage;
})();
