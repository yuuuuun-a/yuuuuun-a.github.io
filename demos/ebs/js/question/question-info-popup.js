(function () {

  // 헤더 오른쪽 '?' 버튼으로 여닫는 문항 유형 안내 팝업.
  // 내용은 layout/question-info-example.html이 서버에서 미리 넣어 둔 유형별 고정 예시라
  // 여기서는 여닫기만 한다(예전에는 지금 문항의 .question-wrap을 복제해 넣었는데,
  // 그러면 밖의 문항이 바뀔 때마다 안내 내용까지 같이 바뀌어서 예시 구실을 못 했다).
  // 여닫는 상태는 hidden 속성 하나로만 나타내서 온보딩 쪽에서도 그대로 열어 볼 수 있다.
  function initQuestionInfoPopup() {
    const popup = document.querySelector('[data-question-info-popup]');
    if (!popup) return;

    const button = document.querySelector('.question-info-btn');

    const isOpen = () => !popup.hasAttribute('hidden');

    const syncButton = () => {
      if (button) button.setAttribute('aria-expanded', String(isOpen()));
    };

    // 온보딩처럼 이 컴포넌트를 거치지 않고 hidden만 건드려 여는 경우에도
    // 버튼 상태가 어긋나지 않도록 속성 변화를 따라간다.
    new MutationObserver(syncButton).observe(popup, {
      attributes: true,
      attributeFilter: ['hidden'],
    });

    syncButton();

    if (button) {
      button.addEventListener('click', () => {
        if (isOpen()) popup.setAttribute('hidden', '');
        else popup.removeAttribute('hidden');
      });
    }

    // 열려 있을 때 팝업 안 아무 곳을 눌러도 닫는다 — 뒤쪽 딤이든 예시 패널이든 상관없다.
    // 안쪽 예시는 inert + pointer-events: none이라 클릭이 막히지 않고 여기까지 올라온다.
    // 딤이 '?' 버튼까지 덮으므로 그 자리를 눌러도 여기로 들어온다.
    popup.addEventListener('click', () => popup.setAttribute('hidden', ''));
  }

  window.initQuestionInfoPopup = initQuestionInfoPopup;
})();
