(function () {

  // 힌트 3단계 열람 흐름:
  // - 처음엔 1단계만 클릭 가능(OXX). 목록을 누르면 중앙에 "N단계 힌트를 확인할까요?" 확인 문구가 뜬다.
  // - "확인하기"를 누르면 해당 단계 내용이 보이고, 그 단계가 지금까지 연 것 중 가장 높은 단계였다면
  //   다음 단계 버튼이 열린다(OOX -> OOO).
  // - 이미 확인한 단계를 다시 누르면 재확인 없이 바로 그 내용이 보인다.
  function initQuestionHints() {
    const hintButtons = Array.from(document.querySelectorAll('.footer-hint'));
    const preview = document.querySelector('.footer-preview');
    if (!hintButtons.length || !preview) return;

    const compactText = preview.querySelector('.footer-preview-compact .footer-preview-text em');
    const confirmBtn = preview.querySelector('.footer-preview-btn');
    const levelText = preview.querySelector('.footer-preview-level');
    const descFull = preview.querySelector('.footer-preview-desc-full');
    const descShort = preview.querySelector('.footer-preview-desc-short');

    let unlockedLevel = 1;
    let selectedLevel = 1;
    const confirmedLevels = new Set();

    // 제출 때 서버로 보내는 "지금까지 확인한 힌트의 최고 단계"(0이면 하나도 안 봄).
    window.getUsedHintLevel = function () {
      return confirmedLevels.size ? Math.max(...confirmedLevels) : 0;
    };

    function render() {
      const button = hintButtons[selectedLevel - 1];
      const text = button ? button.dataset.text || '' : '';

      if (confirmedLevels.has(selectedLevel)) {
        preview.classList.add('has-confirmed');
        preview.classList.remove('is-collapsed');
        if (levelText) levelText.textContent = selectedLevel + '단계 힌트';
        if (descFull) descFull.textContent = text;
        if (descShort) descShort.textContent = text;
        window.renderMathIn?.(descFull);
        window.renderMathIn?.(descShort);
        window.updateFooterPreviewToggles?.();
      } else {
        preview.classList.remove('has-confirmed');
        if (compactText) compactText.textContent = selectedLevel + '단계 힌트';
      }
    }

    function unlockNext() {
      if (unlockedLevel >= hintButtons.length) return;
      unlockedLevel += 1;

      const nextButton = hintButtons[unlockedLevel - 1];
      nextButton.disabled = false;
      nextButton.classList.remove('footer-hint-inactive');
      nextButton.classList.add('footer-hint-active');

      const icon = nextButton.querySelector('img');
      if (icon) icon.src = icon.src.replace('hint-icon-inactive.png', 'hint-icon-active.png');
    }

    hintButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        const level = index + 1;
        if (level > unlockedLevel) return;
        selectedLevel = level;
        render();
      });
    });

    confirmBtn?.addEventListener('click', () => {
      const wasHighestUnlocked = selectedLevel === unlockedLevel;
      confirmedLevels.add(selectedLevel);
      if (wasHighestUnlocked) unlockNext();
      render();
    });

    render();
  }

  window.initQuestionHints = initQuestionHints;
})();
