(function () {

  // 문항/보기 이미지는 서버가 내려준 마크업에서부터 style="display:none"으로 숨겨서 시작한다.
  // (엑박이 잠깐이라도 뜨는 걸 막으려면 "성공하면 보여주기"만 써야지, "실패하면 숨기기"로는
  //  onerror 스크립트가 아직 안 붙었을 때 레이스가 나서 화면에 엑박이 그대로 남는 경우가 생김)
  // 그래서 로딩에 성공했을 때만 handleQuestionImageLoad를 불러서 보여주고, 실패하면 아무것도
  // 안 해도 원래 숨겨진 상태 그대로라 항상 안전하다.
  //
  // 마크업 계약:
  //   data-img-scope        이미지 + (있다면) 대체 텍스트를 함께 담는 가장 가까운 컨테이너
  //   data-img-fallback     이미지가 없을 때 보여줄 텍스트 요소(기본 상태로 이미 보임). 로딩 성공하면 숨김
  //   data-img-hide         이미지와 같이 나타나야 하는 요소(크게 보기 버튼 등). 기본은 숨김, 로딩 성공하면 보임
  //   data-img-hide-self    이 속성이 있는 scope는 대체 텍스트 없이 통째로 숨겨져 있다가 로딩 성공하면 scope 전체를 보여줌
  //   data-img-active-class 로딩에 성공했을 때만 scope에 붙일 클래스 이름(이미지 전용 레이아웃 등)
  function handleQuestionImageLoad(img) {
    const scope = img.closest('[data-img-scope]') || img.parentElement;
    if (!scope) {
      img.style.removeProperty('display');
      return;
    }

    if (scope.hasAttribute('data-img-hide-self')) {
      scope.style.removeProperty('display');
      return;
    }

    img.style.removeProperty('display');
    scope.querySelectorAll('[data-img-hide]').forEach((el) => {
      el.style.removeProperty('display');
    });

    const activeClass = scope.getAttribute('data-img-active-class');
    if (activeClass) scope.classList.add(activeClass);

    const fallback = scope.querySelector('[data-img-fallback]');
    if (fallback) fallback.style.display = 'none';
  }

  window.handleQuestionImageLoad = handleQuestionImageLoad;

  // 이 파일은 head에서 먼저 읽히므로(layout.html headAssets) 보통은 onload가 놓칠 일이 없다. 그래도 캐시 등으로
  // 함수가 생기기 전에 이미 로딩이 끝난 이미지가 있으면 숨겨진 채로 남으므로, 본문을 다 읽은 뒤 한 번 더 훑는다.
  // 같은 이미지에 두 번 불려도 결과가 같아서 안전하다.
  function showAlreadyLoadedImages() {
    document.querySelectorAll('img[onload*="handleQuestionImageLoad"]').forEach((img) => {
      if (img.complete && img.naturalWidth > 0) handleQuestionImageLoad(img);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showAlreadyLoadedImages);
  } else {
    showAlreadyLoadedImages();
  }
})();
