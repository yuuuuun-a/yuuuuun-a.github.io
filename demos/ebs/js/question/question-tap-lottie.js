(function () {

  // 탭 커서(손 + 클릭 파장)를 Lottie로 재생한다. 대상은 [data-tap-lottie]를 가진 요소이고
  // 값은 애니메이션 JSON 경로다. 예전에는 click-cursor.png 한 장을 얹었다.
  //
  // lottie-web은 커서가 실제로 있는 페이지에서만 내려받는다(문항 페이지가 아니면 안 받음).
  // sockjs/stompjs와 같은 방식으로 jsDelivr에서 가져오고, SVG 렌더러만 쓰므로 light 빌드로 충분하다.
  const LOTTIE_SRC = '../vendor/lottie-web-5.12.2/lottie_light.min.js';

  let pending = null;

  function loadLottie() {
    if (window.lottie) return Promise.resolve(window.lottie);
    if (pending) return pending;

    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = LOTTIE_SRC;
      script.async = true;
      script.onload = () => resolve(window.lottie);
      script.onerror = () => reject(new Error('lottie load failed'));
      document.head.appendChild(script);
    });

    return pending;
  }

  // data-tap-lottie-loop이 붙어 있으면 계속 돈다(온보딩처럼 가만히 놓인 커서).
  // 없으면 첫 프레임에 멈춰 있고, 누르는 순간에 맞춰 밖에서 재생시킨다
  // (안내 팝업 데모 — 드래그 구간에서 클릭 파장이 계속 터지면 안 되므로).
  function initTapCursors() {
    const hosts = Array.from(document.querySelectorAll('[data-tap-lottie]'));
    if (!hosts.length) return;

    loadLottie().then((lottie) => {
      hosts.forEach((host) => {
        if (host.dataset.tapLottieReady) return;
        host.dataset.tapLottieReady = '1';

        const loop = host.hasAttribute('data-tap-lottie-loop');
        const anim = lottie.loadAnimation({
          container: host,
          renderer: 'svg',
          loop,
          autoplay: loop,
          path: host.dataset.tapLottie,
        });

        host.tapLottie = anim;
        if (!loop) anim.addEventListener('DOMLoaded', () => anim.goToAndStop(0, true));
      });
    }).catch(() => {
      // 네트워크가 막혀 있으면 커서 없이 진행한다 — 선택/이동 상태 변화만으로도 조작은 읽힌다.
    });
  }

  // 클릭 파장을 한 번 터뜨린다(멈춰 있는 커서용).
  function playTapLottie(host) {
    const anim = host && host.tapLottie;
    if (!anim) return;
    anim.goToAndPlay(0, true);
  }

  window.initTapCursors = initTapCursors;
  window.playTapLottie = playTapLottie;
})();
