/*
 * 포트폴리오 데모 공통 스크립트. scripts/build-demos.mjs가 모든 데모 HTML <head>에 연결합니다.
 *
 * - 상단 안내 바: "← 케이스 스터디로" + "포트폴리오용 데모입니다 · 태블릿/데스크톱 권장" + ✕
 *   ✕를 누르면 안내 문구만 접고 돌아가기 버튼은 남깁니다(같은 탭에서는 접힌 상태 유지, sessionStorage).
 *   돌아갈 주소와 문구는 <script data-back-href data-back-label>로 받습니다.
 * - 원본의 "준비중입니다" alert를 "데모에서는 제공하지 않는 화면이에요" 안내창으로 바꿉니다.
 * - ?open=zoom / ?open=memo: 케이스 스터디 배너에서 들어올 때 문항 화면의 크게 보기·연습장을 연 상태로 시작합니다.
 * - ?open=report: Build Up 마이페이지의 월간 학습 리포트(지난 리포트 보기)를 연 상태로 시작합니다.
 * - ?step=N: EBS 사전 훈련을 N단계부터 시작합니다(크게 보기 안내는 5단계).
 * - window.demoToast(message): 잠깐 떴다 사라지는 안내(Readers Time 마이크 없음 등).
 * - ?embed=SCENE: 케이스 스터디 안에 iframe으로 넣을 때(DemoEmbed). 아래 "페이지 안에 넣기" 참고.
 */
(function () {
  var KEY = "demo-notice-collapsed";
  var script = document.currentScript;
  var EMBED = (/[?&]embed=([a-z-]+)/.exec(location.search) || [])[1] || null;
  if (EMBED) setupEmbed(EMBED);
  var backHref = (script && script.getAttribute("data-back-href")) || "/";
  var backLabel = (script && script.getAttribute("data-back-label")) || "← 포트폴리오로";

  function collapsed() {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function remember() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch (e) {}
  }

  // 일부 데모 화면(EBS 인트로 등)은 document 캡처 단계에서 클릭을 가로채므로,
  // 그보다 먼저 실행되는 window 캡처 단계에서 처리하고 아래 화면에는 클릭을 넘기지 않습니다.
  window.addEventListener(
    "click",
    function (event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var own = target.closest(".demo-notice, .demo-dialog");
      if (own) {
        event.stopPropagation();
        if (target.closest(".demo-notice-close")) {
          own.classList.add("is-collapsed");
          remember();
        }
        if (target.closest(".demo-dialog-close") || target === own) closeDialog();
        return;
      }

      // 데모 범위 밖 안내 페이지의 "이전 화면으로" 버튼
      if (target.closest("[data-demo-back]")) {
        if (history.length > 1) history.back();
        else window.close();
      }
    },
    true
  );

  /* 안내창: "준비중입니다" alert 대체 */
  var dialog = null;
  var lastFocus = null;

  function openDialog() {
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.className = "demo-dialog";
      dialog.hidden = true;
      dialog.innerHTML =
        '<div class="demo-dialog-box" role="alertdialog" aria-modal="true" aria-labelledby="demo-dialog-title">' +
        '<p class="demo-dialog-title" id="demo-dialog-title">데모에서는 제공하지 않는 화면이에요.</p>' +
        '<p class="demo-dialog-text">다른 기능을 체험해 보세요.</p>' +
        '<button type="button" class="demo-dialog-close">확인</button>' +
        "</div>";
      document.body.appendChild(dialog);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && dialog && !dialog.hidden) closeDialog();
      });
    }
    lastFocus = document.activeElement;
    dialog.hidden = false;
    dialog.querySelector(".demo-dialog-close").focus();
  }

  function closeDialog() {
    if (!dialog) return;
    dialog.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  var nativeAlert = window.alert;
  window.alert = function (message) {
    if (/준비\s*중/.test(String(message))) {
      if (document.body) openDialog();
      return;
    }
    return nativeAlert.apply(window, arguments);
  };

  /* 잠깐 떴다 사라지는 안내 */
  window.demoToast = function (message) {
    var toast = document.createElement("div");
    toast.className = "demo-toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.add("is-hidden");
    }, 4000);
    setTimeout(function () {
      toast.remove();
    }, 4400);
  };

  /*
   * ?step=N: EBS 사전 훈련을 N단계(data-step)부터 시작합니다. (케이스 스터디 "크게 보기" 배너 → 5단계)
   * 온보딩은 DOMContentLoaded에서 .is-active인 단계부터 시작하므로, 그 전에(이 스크립트는 defer) 표시만 옮깁니다.
   */
  (function startOnboardingAt() {
    var match = /[?&]step=(\d+)/.exec(location.search);
    if (!match) return;
    var target = document.querySelector('.onboarding-step[data-step="' + match[1] + '"]');
    if (!target) return;
    document.querySelectorAll(".onboarding-step.is-active").forEach(function (el) {
      el.classList.remove("is-active");
    });
    target.classList.add("is-active");
  })();

  /* ?open=zoom|memo|report */
  var OPEN_TARGETS = { zoom: ".image-zoom-btn", memo: "[data-note-toggle]", report: ".btn-report" };

  function openFromQuery() {
    var match = /[?&]open=([a-z]+)/.exec(location.search);
    var selector = match && OPEN_TARGETS[match[1]];
    if (!selector) return;
    var tries = 0;
    (function attempt() {
      var el = document.querySelector(selector);
      // 문항 화면은 수식·이미지 준비가 끝날 때까지 본문을 숨겨 두므로 보일 때까지 기다립니다.
      if (el && el.getClientRects().length && !document.documentElement.classList.contains("math-pending")) {
        // 크게 보기는 click이 아니라 "짧은 탭"(pointerdown → pointerup)으로 열리므로 둘 다 보냅니다.
        var opts = { bubbles: true, cancelable: true, pointerType: "mouse", isPrimary: true };
        el.dispatchEvent(new PointerEvent("pointerdown", opts));
        el.dispatchEvent(new PointerEvent("pointerup", opts));
        el.click();
        return;
      }
      if (++tries < 40) setTimeout(attempt, 150);
    })();
  }

  function mount() {
    if (EMBED) return;
    if (!document.querySelector(".demo-notice")) {
      var bar = document.createElement("div");
      bar.className = "demo-notice" + (collapsed() ? " is-collapsed" : "");
      bar.setAttribute("role", "note");
      var back = document.createElement("a");
      back.className = "demo-notice-back";
      back.href = backHref;
      back.textContent = backLabel;
      bar.appendChild(back);
      bar.insertAdjacentHTML(
        "beforeend",
        '<span class="demo-notice-text">포트폴리오용 데모입니다 · 태블릿/데스크톱 권장</span>' +
          '<button type="button" class="demo-notice-close" aria-label="안내 접기">✕</button>'
      );
      document.body.appendChild(bar);
    }
    if (document.readyState === "complete") openFromQuery();
    else window.addEventListener("load", openFromQuery);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  /*
   * 단어 낚시(I Spy Sight Words) 말풍선: 원본 이미지 문구가 "Tab the word!"(오타)라
   * 같은 글꼴·크기·위치로 "Tap the word!"를 다시 그린 이미지로 바꿈 (scripts/build-tap-bubble.mjs로 만듦)
   */
  document.querySelectorAll('.speech-bubble-tab img[src*="speech-bubble-tab"]').forEach(function (img) {
    img.src = "/demos/_shared/img/speech-bubble-tap.png";
  });

  /*
   * 먼슬리 테스트: 이전/다음 버튼을 화면 세로 가운데에 고정(demo-notice.css)할 때 가로 기준이 될 카드 위치.
   * 스크롤바가 .wrap 안에 있어 CSS 계산만으로는 몇 px 어긋나므로 실제 카드 위치를 재서 넘김.
   */
  (function pinMonthlyNav() {
    var card = document.querySelector(".monthly-header") && document.querySelector(".wrap .inner");
    if (!card) return;
    var root = document.documentElement;
    function update() {
      var rect = card.getBoundingClientRect();
      root.style.setProperty("--demo-card-left", rect.left + "px");
      root.style.setProperty("--demo-card-right", root.clientWidth - rect.right + "px");
    }
    update();
    window.addEventListener("resize", update);
    if (window.ResizeObserver) new ResizeObserver(update).observe(card);
  })();

  /*
   * ── 페이지 안에 넣기: ?embed=SCENE ──
   * 케이스 스터디가 이 화면을 iframe으로 넣어 "움직이는 화면"으로 보여 줄 때 씁니다.
   * - 안내 바 없음. 소리는 음소거로 재생(게임은 효과음이 끝나야 다음 단계로 넘어가므로 재생 자체는 해야 함)
   * - 사람의 클릭·터치·키보드, 페이지 이동, 창 닫기는 모두 막음 (보기 전용)
   * - SCENE에 따라 원하는 장면까지 스스로 진행하고 멈춘 뒤 부모에게 "demo-embed-ready"를 보냄
   *   (부모는 그때까지 정지 이미지를 보여 줌)
   * 이 스크립트는 defer라 게임 스크립트가 다 읽힌 뒤, DOMContentLoaded 직전에 실행됩니다.
   * 그래서 게임의 전역 함수(playG 등)를 시작 전에 바꿔 끼울 수 있습니다.
   */
  function setupEmbed(scene) {
    var noop = function () {};
    var style = document.createElement("style");
    // 케이스 스터디 안(작게 줄여 보임)에서는 SUITE를 한 단계 얇게: 같은 굵기 이름에 한 단계 얇은 파일을 다시 연결
    // (나중에 정의한 @font-face가 이김). 체험하기(embed 없음)는 원래 굵기 그대로
    var suite = { 400: "Light", 500: "Regular", 600: "Medium", 700: "SemiBold", 800: "Bold", 900: "ExtraBold" };
    var lighter = Object.keys(suite)
      .map(function (w) {
        return '@font-face{font-family:"SUITE";src:url("/demos/ebs/fonts/suite/SUITE-' + suite[w] + '.woff2") format("woff2");font-weight:' + w + ";font-display:swap}";
      })
      .join("");
    style.textContent = lighter + ".demo-notice,.demo-dialog,.demo-toast,.ios-listening-btn-area{display:none!important}";
    document.head.appendChild(style);

    // 소리는 실제로 재생하지 않고(iframe 안에서는 음소거여도 자동 재생이 막힘), 그 길이만큼 기다렸다가
    // "ended"만 보내서 "소리가 끝나면 다음 단계" 흐름이 그대로 이어지게 함.
    // freezeAudio면 ended를 보내지 않아 흐름을 처음에서 세움(결과 장면을 바로 띄울 때)
    var nativePlay = HTMLMediaElement.prototype.play;
    var nativePause = HTMLMediaElement.prototype.pause;
    var freezeAudio = false;
    var fastAudio = false; // true면 소리 길이를 기다리지 않고 바로 ended (시작 연출 건너뛰기)
    HTMLMediaElement.prototype.play = function () {
      var media = this;
      media.muted = true;
      if (media.tagName !== "AUDIO") return nativePlay.apply(media, arguments);
      clearTimeout(media.__embedEnd);
      if (freezeAudio || media.loop) return Promise.resolve();
      var src = media.src;
      var finish = function () {
        media.__embedEnd = setTimeout(function () {
          if (media.src === src) media.dispatchEvent(new Event("ended"));
        }, fastAudio ? 0 : isFinite(media.duration) ? media.duration * 1000 : 300);
      };
      if (media.readyState >= 1 || media.error) finish();
      else {
        media.addEventListener("loadedmetadata", finish, { once: true });
        media.addEventListener("error", finish, { once: true });
      }
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      clearTimeout(this.__embedEnd);
      return nativePause.apply(this, arguments);
    };

    // 보기 전용: 사람이 만든 입력은 전부 막고, 이동·닫기 함수는 아무것도 하지 않게
    ["click", "pointerdown", "pointerup", "mousedown", "touchstart", "keydown", "wheel"].forEach(function (type) {
      window.addEventListener(
        type,
        function (e) {
          if (!e.isTrusted) return;
          e.stopImmediatePropagation();
          if (type !== "wheel") e.preventDefault();
        },
        { capture: true, passive: false }
      );
    });
    window.redirectToContent = noop;
    window.redirectToWithBookNo = noop;
    window.open = noop;
    window.close = noop;
    window.alert = noop;

    var readySent = false;
    function ready() {
      if (readySent) return;
      readySent = true;
      try {
        parent.postMessage({ type: "demo-embed-ready", scene: scene }, location.origin);
      } catch (e) {}
    }
    function whenLoaded(fn) {
      if (document.readyState === "complete") fn();
      else window.addEventListener("load", fn);
    }
    // cond()가 참이 될 때까지 기다림 (최대 timeout ms)
    function waitFor(cond, fn, timeout) {
      var start = Date.now();
      (function tick() {
        var value;
        try {
          value = cond();
        } catch (e) {}
        if (value) return fn(value);
        if (Date.now() - start < (timeout || 20000)) setTimeout(tick, 100);
      })();
    }
    // lottie-web으로 만든 애니메이션을 담은 요소 id로 찾아 끝없이 반복 (원래는 한 번 재생 후 다음 단계로 넘어감)
    function loopLottieIn(ids) {
      if (!window.lottie) return;
      lottie.getRegisteredAnimations().forEach(function (anim) {
        var wrapper = anim.wrapper;
        if (!wrapper || ids.indexOf(wrapper.id) < 0) return;
        anim.onComplete = null;
        if (anim.setLoop) anim.setLoop(true);
        else anim.loop = true;
      });
    }
    // 페이지의 전역 let/const(window 속성이 아님)를 이름으로 읽기. 없으면 null
    function pageGlobal(name) {
      try {
        return new Function("return typeof " + name + ' !== "undefined" ? ' + name + " : null")();
      } catch (e) {
        return null;
      }
    }
    // 이 스크립트보다 먼저 시작된 소리(시작 화면 효과음 등)는 끔
    ["g_audio", "game_audio", "game_bg"].forEach(function (name) {
      var audio = pageGlobal(name);
      if (audio && audio.pause) {
        audio.muted = true;
        audio.pause();
      }
    });
    function lottieIn(id) {
      if (!window.lottie) return null;
      return (
        lottie.getRegisteredAnimations().filter(function (anim) {
          return anim.wrapper && anim.wrapper.id === id;
        })[0] || null
      );
    }
    // from ↔ to 구간을 앞뒤로 계속 오감 (처음 재생은 그대로, to에 닿은 뒤부터)
    function pingPong(anim, from, to) {
      if (!anim) return;
      var dir = 1;
      anim.addEventListener("enterFrame", function () {
        var frame = Math.round(anim.currentFrame);
        if (dir === 1 && frame >= to) dir = -1;
        else if (dir === -1 && frame <= from) dir = 1;
        else return;
        anim.setDirection(dir);
        setTimeout(function () { anim.play(); }, 10);
      });
    }
    // 한 번 끝까지 재생한 뒤 from → to 구간만 반복
    function loopTail(anim, from, to) {
      if (!anim) return;
      anim.addEventListener("complete", function once() {
        anim.removeEventListener("complete", once);
        anim.setLoop ? anim.setLoop(true) : (anim.loop = true);
        anim.playSegments([from, to], true);
      });
    }
    // 단어 낚시: 고른 물고기를 6번 당겨 성공·실패 연출을 띄움
    function reelIn(btn, randomValue) {
      var nativeRandom = Math.random;
      if (randomValue != null) Math.random = function () { return randomValue; };
      try {
        for (var i = 0; i < 6; i++) window.selectFish(btn);
      } finally {
        Math.random = nativeRandom;
      }
    }
    function fishButtons() {
      var buttons = document.querySelectorAll("#game_wrap.in-game .fish-list .btn-fish");
      return buttons.length === 3 ? buttons : null;
    }
    // 단어 낚시 시작 연출(안내 음성 → 낚시터 등장)을 빨리 넘김. 원래 약 8초 동안 정지 이미지만 보이던 문제
    function skipFishIntro() {
      fastAudio = true;
      waitFor(function () { return lottieIn("fishingport"); }, function (port) {
        port.setSpeed(12);
      });
      waitFor(fishButtons, function () {
        fastAudio = false;
      });
    }
    function questionWord() {
      var q = document.querySelector("#question");
      return q ? q.textContent.trim() : "";
    }
    function fishWord(btn) {
      return btn.querySelector("span").textContent.trim();
    }

    // ── EBS 터치 유도(손 가이드) ─────────────────────────────────────────────
    // 디자이너가 준 손 이미지(_shared/img/guide/)를 데모 위에 띄워 "여기를 누르세요/끄세요"를 보여 줌.
    // 손은 pointer-events 없음(화면 판정에 안 걸림). 실제 반응이 필요한 장면은 가짜(신뢰되지 않은) 포인터 이벤트로 조작.
    // 손 이미지마다 손끝(터치 지점)이 이미지 안 어디인지(ax, ay 비율)와 표시 폭
    var GUIDE = "/demos/_shared/img/guide/";
    var HANDS = {
      tap: { src: "tap.webp", width: 120, ax: 0.447, ay: 0.443 },
      // 작은 카드 위 버튼용(카드 그림을 덜 가리게)
      "tap-sm": { src: "tap.webp", width: 84, ax: 0.447, ay: 0.443 },
      "tap-wide": { src: "tap-wide.webp", width: 150, ax: 0.5, ay: 0.497 },
      "swipe-v": { src: "swipe-v.webp", width: 70, ax: 0.241, ay: 0.6 },
      // 세로 스와이프 이미지에서 꼬리(하늘색 픽셀)를 지우고 손만 남긴 것(위로 끌 때 꼬리 방향이 반대로 보이지 않게)
      hand: { src: "hand.webp", width: 70, ax: 0.241, ay: 0.07 },
      "swipe-h": { src: "swipe-h.webp", width: 210, ax: 0.579, ay: 0.219 },
    };
    function guideStyle() {
      var css = document.createElement("style");
      css.textContent =
        // 데모 공통 CSS가 img 높이를 늘리는 경우가 있어 손·아이콘 이미지는 원래 비율로 고정
        ".demo-guide,.demo-guide-glow{height:auto!important;max-width:none!important;max-height:none!important;min-height:0!important}" +
        ".demo-guide{position:fixed;z-index:2147483646;pointer-events:none;opacity:0;transition:opacity .3s ease}" +
        // 끄는 손 뒤 파란 선: 디자이너 스와이프 이미지(jpg/ebsmath-5·6)의 선 색·둥근 끝 그대로. 손이 간 만큼만 늘어나며 드러나고,
        // 손끝 뒤 짧은 꼬리만(최대 TRAIL_MAX). 회선과 겹쳐도 탁하지 않게 밝은 시안을 반투명하게 얹음
        ".demo-guide-trail{position:fixed;z-index:2147483645;pointer-events:none;height:30px;border-radius:15px;" +
        "background:linear-gradient(to right,rgba(110,214,245,0),rgba(110,214,245,.45) 50%,rgba(150,228,250,.8));" +
        "box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);transition:opacity .35s ease}" +
        // 꾹 누르는 동안만 손끝에 생기는 물결 원(대각선 꼬리 없이). 누르면 살짝 커지며 나타남
        ".demo-guide-press{position:fixed;z-index:2147483645;pointer-events:none;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;" +
        "border:2px solid rgba(80,200,240,.85);background:rgba(110,214,245,.22);animation:demo-guide-press .25s cubic-bezier(.33,1,.68,1);transition:opacity .3s ease}" +
        "@keyframes demo-guide-press{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}" +
        ".demo-guide.is-on{opacity:1}" +
        ".demo-guide-tap{animation:demo-guide-tap 1.4s cubic-bezier(.33,1,.68,1) infinite}" +
        "@keyframes demo-guide-tap{0%,100%{scale:1}35%{scale:.88}55%{scale:1.02}}" +
        ".demo-guide-glow{position:fixed;z-index:2147483645;pointer-events:none;animation:demo-guide-glow 1.4s ease-out infinite}" +
        "@keyframes demo-guide-glow{0%,100%{scale:1;filter:brightness(1)}35%{scale:1.03;filter:brightness(1.1)}}" +
        // 탭 물결: 손끝에서 손가락이 눌리는 순간(35%) 옅은 시안 원 두 겹이 퍼지며 사라짐. 시선을 뺏지 않게 옅게
        ".demo-guide-ripple{position:fixed;z-index:2147483645;pointer-events:none;border-radius:50%}" +
        ".demo-guide-ripple::before,.demo-guide-ripple::after{content:\"\";position:absolute;inset:0;border-radius:50%;" +
        "border:2px solid rgba(80,200,240,.85);background:rgba(110,214,245,.22);opacity:0;scale:.3;" +
        "animation:demo-guide-ripple 1.4s cubic-bezier(.33,1,.68,1) infinite}" +
        ".demo-guide-ripple::after{animation-delay:.16s}" +
        // 한 번만 누르는 손(탭할 때마다 새로 붙임)
        ".demo-guide-ripple.is-once::before,.demo-guide-ripple.is-once::after{animation-iteration-count:1}" +
        ".demo-guide-tap-once{animation:demo-guide-tap 1.4s cubic-bezier(.33,1,.68,1) 1}" +
        "@keyframes demo-guide-ripple{0%,30%{opacity:0;scale:.3}38%{opacity:.85}100%{opacity:0;scale:1.6}}";
      document.head.appendChild(css);
    }
    // 문항 글자만 흐리게(PDF와 같은 보안 마스킹). UI·손 동작은 또렷하게
    function maskQuestions() {
      var css = document.createElement("style");
      css.textContent =
        ".header-text,.question-box-text,.classify-card-value,.order-card-value,.line-match-card-text,.fill-zone-line,.fill-card-value,.option-box-text{filter:blur(5px)}";
      document.head.appendChild(css);
    }
    function makeHand(kind) {
      var spec = HANDS[kind];
      var img = document.createElement("img");
      img.src = GUIDE + spec.src;
      img.alt = "";
      img.className = "demo-guide";
      img.style.width = spec.width + "px";
      document.body.appendChild(img);
      // 손끝이 (x, y)에 오도록 이미지 왼쪽 위를 옮김
      img.moveTo = function (x, y) {
        var h = img.naturalHeight ? (spec.width * img.naturalHeight) / img.naturalWidth : spec.width;
        img.style.left = x - spec.width * spec.ax + "px";
        img.style.top = y - h * spec.ay + "px";
        img.style.transformOrigin = spec.width * spec.ax + "px " + h * spec.ay + "px";
      };
      return img;
    }
    // 화면에 실제로 보이는 첫 요소(안내 팝업 예시 등 숨은 복제본 제외)
    function visibleEl(selector) {
      var list = document.querySelectorAll(selector);
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && !list[i].closest("[hidden]")) return list[i];
      }
      return null;
    }
    function centerOf(el) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    // 요소 위에 손이 계속 톡톡 누름(화면은 반응하지 않음). glowSrc가 있으면 그 이미지(버튼·아이콘 디자인)를 대상 위에 겹쳐 함께 눌림
    // 손(물결 없는 손 이미지) + 손끝에서 퍼지는 물결 원. size = 물결 원 지름
    function tapLoop(target, kind, glow, size) {
      var hand = makeHand(kind || "hand");
      var p = centerOf(target);
      var tip = { x: p.x + (target.dataset.guideDx | 0), y: p.y + (target.dataset.guideDy | 0) };
      var d = size || 84;
      var ripple = document.createElement("i");
      ripple.className = "demo-guide-ripple";
      ripple.style.cssText += ";left:" + (tip.x - d / 2) + "px;top:" + (tip.y - d / 2) + "px;width:" + d + "px;height:" + d + "px";
      if (glow) {
        var g = document.createElement("img");
        g.src = GUIDE + glow.src;
        g.alt = "";
        g.className = "demo-guide-glow";
        var r = target.getBoundingClientRect();
        var w = r.width * glow.scale;
        g.style.width = w + "px";
        g.style.left = p.x - w / 2 + "px";
        g.style.top = p.y - (w / glow.ratio) / 2 + "px";
        document.body.appendChild(g);
      }
      var place = function () {
        document.body.appendChild(ripple);
        hand.moveTo(tip.x, tip.y);
        hand.classList.add("is-on", "demo-guide-tap");
      };
      if (hand.complete) place();
      else hand.onload = place;
      return hand;
    }
    // 손이 나타나 한 번 누르고(물결) 실제로 클릭한 뒤 사라짐. 손가락이 눌리는 순간(1.4초의 35%)에 클릭
    var onceHand = null;
    function tapOnce(target, size) {
      if (!onceHand) onceHand = makeHand("hand");
      var hand = onceHand;
      var p = centerOf(target);
      var tip = { x: p.x + (target.dataset.guideDx | 0), y: p.y + (target.dataset.guideDy | 0) };
      var d = size || 84;
      var ripple = document.createElement("i");
      ripple.className = "demo-guide-ripple is-once";
      ripple.style.cssText += ";left:" + (tip.x - d / 2) + "px;top:" + (tip.y - d / 2) + "px;width:" + d + "px;height:" + d + "px";
      hand.classList.remove("demo-guide-tap-once");
      hand.moveTo(tip.x, tip.y);
      hand.classList.add("is-on");
      return wait(350)
        .then(function () {
          void hand.offsetWidth;
          hand.classList.add("demo-guide-tap-once");
          document.body.appendChild(ripple);
          return wait(490);
        })
        .then(function () {
          target.click();
          return wait(800);
        })
        .then(function () {
          hand.classList.remove("is-on");
          ripple.remove();
          return wait(300);
        });
    }
    // 가짜 포인터 이벤트. 원래 코드의 setPointerCapture가 가짜 pointerId에서 오류를 내지 않게 막아 둠
    (function () {
      ["setPointerCapture", "releasePointerCapture"].forEach(function (name) {
        var native = Element.prototype[name];
        Element.prototype[name] = function () {
          try {
            return native.apply(this, arguments);
          } catch (e) {}
        };
      });
    })();
    function pointer(type, el, x, y) {
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 7,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
          buttons: type === "pointerup" ? 0 : 1,
        })
      );
    }
    function wait(ms) {
      return new Promise(function (resolve) {
        setTimeout(resolve, ms);
      });
    }
    // 손이 from 요소를 눌러 to 지점까지 끌고 가서 놓음(실제 화면이 반응). 끄는 동안 손이 손끝 기준으로 따라감
    // 파란 선: 출발점에서 손끝까지만 보이게 늘어나며(그어지는 느낌) 끄는 방향으로 기울어짐. 둥근 머리가 손끝에 옴
    var TRAIL_MAX = 110;
    function makeTrail(a, b) {
      var R = 15;
      var ang = Math.atan2(b.y - a.y, b.x - a.x);
      var trail = document.createElement("i");
      trail.className = "demo-guide-trail";
      trail.style.left = a.x - R + "px";
      trail.style.top = a.y - R + "px";
      trail.style.width = 2 * R + "px";
      trail.style.transformOrigin = R + "px " + R + "px";
      trail.style.rotate = (ang * 180) / Math.PI + "deg";
      document.body.appendChild(trail);
      // 꼬리 시작점을 손끝에서 최대 TRAIL_MAX 뒤로 당겨 와 길이를 제한(머리는 늘 손끝)
      trail.reach = function (x, y) {
        var d = Math.hypot(x - a.x, y - a.y);
        var back = Math.max(0, d - TRAIL_MAX);
        trail.style.left = a.x + Math.cos(ang) * back - R + "px";
        trail.style.top = a.y + Math.sin(ang) * back - R + "px";
        trail.style.width = d - back + 2 * R + "px";
      };
      return trail;
    }
    // press: 꼬리선 대신 누르는 동안만 손끝에 물결 원(대각선으로 끌 때 꼬리선이 어색해서 FILL 장면에서 씀)
    function makePress(a) {
      var dot = document.createElement("i");
      dot.className = "demo-guide-press";
      dot.style.left = a.x + "px";
      dot.style.top = a.y + "px";
      document.body.appendChild(dot);
      // 나타난 뒤 끄는 동안 천천히 살짝 작아짐(꾹 누른 채 움직이는 느낌)
      setTimeout(function () {
        dot.style.transition = "transform .9s ease-out, opacity .3s ease";
        dot.style.transform = "scale(.7)";
      }, 260);
      dot.reach = function (x, y) {
        dot.style.left = x + "px";
        dot.style.top = y + "px";
      };
      return dot;
    }
    function drag(hand, fromEl, toPoint, duration, press) {
      var a = centerOf(fromEl);
      var b = toPoint;
      var trail = null;
      hand.moveTo(a.x, a.y);
      hand.classList.add("is-on");
      return wait(450)
        .then(function () {
          pointer("pointerdown", fromEl, a.x, a.y);
          trail = press ? makePress(a) : makeTrail(a, b);
          return wait(180);
        })
        .then(function () {
          return new Promise(function (resolve) {
            var start = performance.now();
            (function step(now) {
              var t = Math.min(1, (now - start) / duration);
              var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
              var x = a.x + (b.x - a.x) * e;
              var y = a.y + (b.y - a.y) * e;
              hand.moveTo(x, y);
              pointer("pointermove", fromEl, x, y);
              trail.reach(x, y);
              if (t < 1) requestAnimationFrame(step);
              else resolve();
            })(start);
          });
        })
        .then(function () {
          pointer("pointerup", fromEl, b.x, b.y);
          return wait(250);
        })
        .then(function () {
          // 물결 원(FILL)이 다 사라진 뒤에 손이 사라짐. 꼬리선 장면은 바로
          if (press) setTimeout(function () { hand.classList.remove("is-on"); }, 500);
          else hand.classList.remove("is-on");
          var t = trail;
          // 물결 원(FILL)은 놓는 순간 바깥으로 퍼지며 사라짐. 꼬리선은 그대로 옅어짐
          if (press) {
            t.style.transition = "opacity .5s ease, transform .5s cubic-bezier(.33,1,.68,1)";
            t.style.transform = "scale(2)";
          }
          t.style.opacity = "0";
          setTimeout(function () {
            t.remove();
          }, press ? 550 : 400);
          return wait(press ? 800 : 500);
        });
    }
    // 크게 보기: PDF 기준 MSQ(부품 고르기) 문항. 보기 카드 4장 모두 그림 + 크게 보기 버튼(퍼블리싱 구조 그대로:
    // .answer-tile-fraction.image-zoom[data-img-scope] 안에 버튼 + img, 그림이 있으면 data-img-fallback(분수)은 숨기고
    // data-img-active-class를 붙임). 첫 카드만 실제 문항 그림(디자이너 원본 jpg/I-05-S2-G-05-003), 나머지는 같은 그림을 가우시안으로 흐림(item-blur.webp, 다른 장면의 blur(5px)와 같은 느낌 — 모자이크는 튀어서 바꿈 2026-11-15)
    function zoomCards() {
      var scopes = document.querySelectorAll(".question-msq .answer-grid .image-zoom[data-img-scope]");
      var first = null;
      [].forEach.call(scopes, function (scope, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "image-zoom-btn";
        btn.setAttribute("data-image-zoom", "");
        btn.setAttribute("aria-label", "크게 보기");
        var img = document.createElement("img");
        img.src = GUIDE + (i === 0 ? "item-zoom.webp" : "item-blur.webp");
        img.alt = i === 0 ? "꼭짓점 기호가 있는 정육면체" : "";
        // 그림 원본(720px)이 카드 폭 계산에 끼지 않게: Safari는 이 크기만큼 문제 판을 넓혀 오른쪽 여백이 사라짐.
        // 폭 0 + 최소 폭 100%로 카드 칸은 그대로 채우고 판 폭은 Chrome과 같게
        img.style.width = "0";
        img.style.minWidth = "100%";
        var fallback = scope.querySelector("[data-img-fallback]");
        scope.insertBefore(btn, fallback);
        scope.insertBefore(img, fallback);
        if (fallback) fallback.style.display = "none";
        if (scope.dataset.imgActiveClass) scope.classList.add(scope.dataset.imgActiveClass);
        if (i === 0) {
          // 손이 누르는 버튼만 키워 잘 보이게(왼쪽 위 원래 자리 기준)
          btn.style.scale = "1.5";
          btn.style.transformOrigin = "0 0";
          first = btn;
        }
      });
      return first;
    }
    function zoomScene(open) {
      whenLoaded(function () {
        waitFor(
          function () {
            return visibleEl(".question-msq .answer-grid .image-zoom");
          },
          function () {
            guideStyle();
            maskQuestions();
            var btn = zoomCards();
            setTimeout(function () {
              if (!open) {
                btn.dataset.guideDx = 9;
                btn.dataset.guideDy = 9;
                tapLoop(btn, "hand", null, 72);
                ready();
                return;
              }
              // 딤드(어두운 배경)가 먼저 깔린 상태에서 시작 → 잠시 뒤 그림이 팝업으로 튀어나오고(원래 열림 모션) → 바깥을 손이 톡톡 반복.
              // 팝업과 안내 문구는 display:none으로 숨겨 뒀다가 보이게 하면 열림 모션이 그때 재생됨
              var modal = document.querySelector('[data-question-modal="image-zoom"]');
              var panel = modal && modal.querySelector(".image-zoom-panel");
              var guide = modal && modal.querySelector(".image-zoom-guide");
              if (panel) panel.style.display = "none";
              if (guide) guide.style.display = "none";
              btn.click();
              // 딤이 깔릴 시간을 주고 데모를 보이게 함
              setTimeout(function () {
                ready();
                setTimeout(function () {
                  if (panel) panel.style.display = "";
                  if (guide) guide.style.display = "";
                  setTimeout(function () {
                    var spot = document.createElement("i");
                    spot.style.cssText = "position:fixed;left:780px;top:118px;width:1px;height:1px";
                    document.body.appendChild(spot);
                    tapLoop(spot, "hand", null, 100);
                  }, 700);
                }, 900);
              }, 500);
            }, 500);
          }
        );
      });
    }
    function resetQuestion() {
      var btn = document.querySelector(".group-mcq .question-action-btn-secondary");
      if (btn) btn.click();
      // 다시 하기는 옮겼던 카드를 트레이 맨 뒤에 붙임 → 반복할 때마다 순서가 바뀌어 수직으로 올린 카드가 엉뚱한 칸에 들어감.
      // 원래 순서(data-item-id)로 다시 정렬해 매 바퀴 같은 자리에서 시작
      var tray = visibleEl(".classify-tray");
      if (tray) {
        [].slice
          .call(tray.querySelectorAll(".classify-card"))
          .sort(function (x, y) {
            return x.dataset.itemId - y.dataset.itemId;
          })
          .forEach(function (card) {
            tray.appendChild(card);
          });
      }
    }

    var scenes = {
      // ── EBS 케이스 스터디(1024×768): 손으로 터치 유도 ──
      // 사전 훈련 시작: "사전 훈련 건너뛰기" 버튼을 손이 계속 톡톡(화면 반응 없음). 버튼 디자인 이미지를 겹쳐 함께 눌림
      "onboarding-skip": function () {
        whenLoaded(function () {
          waitFor(
            function () {
              return visibleEl(".onboarding-skip");
            },
            function (btn) {
              guideStyle();
              maskQuestions();
              // 크게 키운 버튼과 손은 데모 칸 밖으로 튀어나와야 해서 페이지 쪽(DemoEmbed callout)에서 그림.
              // 원래 작은 버튼은 이 장면에서만 숨김(위에 겹친 큰 버튼과 이중으로 보이지 않게)
              btn.style.visibility = "hidden";
              ready();
            }
          );
        });
      },
      // 크게 보기: PDF 기준 MSQ 문항(question-msq.html) 보기 카드에 그림 + 크게 보기 버튼을 넣음(zoomCards 참고).
      // 데이터에 그림이 없는 데모 문항이라 장면에서 채움
      "zoom-tap": function () {
        zoomScene(false);
      },
      // 크게 보기(오른쪽): 그림이 크게 열린 뒤, 바깥 영역을 손이 계속 톡톡(닫히지 않음)
      "zoom-open": function () {
        zoomScene(true);
      },
      // SORT 분류: 손이 보석 카드를 끌어 짝수·홀수 보관함에 실제로 넣음 → 다시 하기 → 반복
      "class-drag": function () {
        whenLoaded(function () {
          waitFor(
            function () {
              return document.querySelectorAll(".classify-tray .classify-card").length >= 2 && document.querySelectorAll(".classify-zone").length >= 2;
            },
            function () {
              guideStyle();
              maskQuestions();
              var hand = makeHand("hand");
              var zones = document.querySelectorAll(".classify-zone");
              function zoneSpot(zone, i) {
                var r = zone.getBoundingClientRect();
                return { x: r.left + r.width * (i ? 0.62 : 0.38), y: r.top + r.height * 0.55 };
              }
              function round() {
                var cards = document.querySelectorAll(".classify-tray .classify-card");
                // 수직으로만 끌어 올림: 짝수 칸 바로 아래의 12 → 짝수, 홀수 칸 바로 아래의 9 → 홀수
                // (12를 옮기면 트레이가 왼쪽으로 당겨지므로 9의 위치는 그때 다시 잼)
                function up(id, zone) {
                  var card = document.querySelector(".classify-tray .classify-card[data-item-id=\"" + id + "\"]");
                  if (!card) return Promise.resolve();
                  var c = centerOf(card);
                  var z = zone.getBoundingClientRect();
                  return drag(hand, card, { x: c.x, y: z.top + z.height * 0.55 }, 900);
                }
                return up(1, zones[0])
                  .then(function () {
                    return up(6, zones[1]);
                  })
                  .then(function () {
                    return wait(1600);
                  })
                  .then(function () {
                    resetQuestion();
                    return wait(1200);
                  })
                  .then(round);
              }
              setTimeout(function () {
                ready();
                round();
              }, 500);
            }
          );
        });
      },
      // FILL: 손이 숫자 카드를 끌어 수식 속 빈칸에 실제로 넣음 → 다시 하기 → 반복
      "fill-drag": function () {
        whenLoaded(function () {
          waitFor(
            function () {
              return document.querySelectorAll(".fill-tray .fill-card").length >= 2 && document.querySelectorAll(".fill-slot").length >= 2;
            },
            function () {
              guideStyle();
              maskQuestions();
              var hand = makeHand("hand");
              function put(choiceId, slotIndex) {
                var card = document.querySelector(".fill-tray .fill-card[data-choice-id=\"" + choiceId + "\"]");
                var slot = document.querySelectorAll(".fill-slot")[slotIndex];
                if (!card || !slot) return Promise.resolve();
                return drag(hand, card, centerOf(slot), 1000, true);
              }
              function round() {
                // 3 + 7 = 10, 10 − 6 = 4
                return put(1, 0)
                  .then(function () {
                    return put(2, 1);
                  })
                  .then(function () {
                    return wait(1600);
                  })
                  .then(function () {
                    var btn = document.querySelector(".question-action-btn-secondary");
                    if (btn) btn.click();
                    return wait(1200);
                  })
                  .then(round);
              }
              setTimeout(function () {
                ready();
                round();
              }, 500);
            }
          );
        });
      },
      // MATCH: 손이 왼쪽 식에서 오른쪽 답까지 선을 실제로 이음 → 다시 하기 → 반복
      "match-drag": function () {
        whenLoaded(function () {
          waitFor(
            function () {
              return document.querySelectorAll(".line-match-card").length >= 8;
            },
            function () {
              guideStyle();
              maskQuestions();
              var hand = makeHand("hand");
              var cards = document.querySelectorAll(".line-match-card");
              var dot = function (card) {
                return centerOf(card.querySelector(".line-match-node-dot") || card);
              };
              function link(fromCard, toCard) {
                var d = fromCard.querySelector(".line-match-node-dot") || fromCard;
                return drag(hand, d, dot(toCard), 1000);
              }
              // 왼쪽 0~3, 오른쪽 4~7 (6×7 → 42, 8×4 → 32)
              function round() {
                return link(cards[0], cards[5])
                  .then(function () {
                    return link(cards[1], cards[4]);
                  })
                  .then(function () {
                    return wait(1600);
                  })
                  .then(function () {
                    resetQuestion();
                    return wait(1200);
                  })
                  .then(round);
              }
              setTimeout(function () {
                ready();
                round();
              }, 500);
            }
          );
        });
      },

      // Service concept: 탐사 홈 등장 → 미션 카드가 저절로 한 장씩 넘어감(손 없음, 반복).
      // 넘어갈 때마다 "다음 카드" 번호를 페이지에 알림 → 페이지가 화면 밖으로 넘친 다음 카드를 옅게 이어 그림(PDF 13쪽처럼)
      "home-tour": function () {
        whenLoaded(function () {
          ready();
          waitFor(
            function () {
              return document.querySelectorAll(".home-carousel-dot").length > 1 && document.querySelectorAll(".home-carousel-dot");
            },
            function (dots) {
              var cards = document.querySelectorAll(".home-mission-card");
              function postPeek() {
                var next = document.querySelector(".home-mission-card-next");
                try {
                  parent.postMessage({ type: "demo-embed-peek", index: [].indexOf.call(cards, next) }, location.origin);
                } catch (e) {}
              }
              postPeek();
              function loop() {
                var active = [].findIndex.call(dots, function (d) {
                  return d.classList.contains("is-active");
                });
                dots[(active + 1) % dots.length].click();
                postPeek();
                setTimeout(loop, 3200);
              }
              setTimeout(loop, 3000);
            }
          );
        });
      },

      // EBS 탐사 홈: 들어올 때 배경·캐릭터·제목·미션 카드가 등장하고, 그 뒤 캐릭터 숨쉬기·버튼 반짝임·말풍선 떠다니기가
      // 원래 CSS 반복 애니메이션으로 계속 움직임. 클릭·카드 넘기기·이동은 위에서 막음
      home: function () {
        whenLoaded(ready);
      },

      // 시작 화면 그대로 (타이틀·캐릭터 등장, Start 버튼은 눌리지 않음). 등장 뒤에는 제자리 동작만 반복
      intro: function () {
        // Phonics Time: 58프레임부터 ^^ 눈. 원본은 89↔47을 오가며 눈을 떴다 감아 시선이 돌아가 보이므로 ^^ 구간만
        pingPong(pageGlobal("cha_ani"), 58, 89);
        // Word Hunt: 원본에 주석으로 남아 있던 제자리 구간
        pingPong(pageGlobal("intro_ani"), 72, 89);
        whenLoaded(ready);
      },

      // 먼슬리 테스트 결과 Excellent! (등장 뒤 꽃가루·캐릭터 구간 반복)
      "monthly-end": function () {
        whenLoaded(function () {
          loopTail(lottieIn("excellent"), 30, 83);
          ready();
        });
      },

      // Word Hunt 진행: 카드를 3초 보여 주고 뒤집은 뒤 한 장만 열린 상태. 몇 초마다 다시 반복
      "word-board": function () {
        var nativeCardTimer = window.cardTimer;
        window.cardTimer = function () { return nativeCardTimer(3); };
        window.stopwatch = function (seconds) {
          var wrap = document.querySelector(".stopwatch-wrap");
          wrap.querySelector(".time").textContent = seconds;
          var bar = wrap.querySelector(".time-bar");
          bar.style.setProperty("--progress", "100%");
          bar.max = seconds;
          bar.value = seconds;
          wrap.classList.add("show");
        };
        // 왼쪽 아래 말풍선(기억하기·시작·카운트다운)은 같은 자리에 겹치므로 한 번에 하나만
        function onlyBubble(selector) {
          [".remember-msg-box", ".img-start-msg", ".time-box"].forEach(function (s) {
            var el = document.querySelector(s);
            if (el && s !== selector) el.classList.remove("on");
          });
          var keep = selector && document.querySelector(selector);
          if (keep) keep.classList.add("on");
        }
        var nativeGameReady = window.gameReady;
        window.gameReady = function () {
          onlyBubble(null);
          nativeGameReady();
          onlyBubble(".time-box");
        };
        // 카운트다운이 끝나면 카드를 모두 뒤집은 뒤, 잠시 후 한 장만 다시 열어 "한 장 고른" 순간을 보여 줌
        window.startRound = function () {
          var cards = document.querySelectorAll("#round_1 .card-item");
          cards.forEach(function (card) {
            card.classList.remove("on");
          });
          setTimeout(function () {
            cards[cards.length - 1].classList.add("on");
          }, 900);
          onlyBubble(".img-start-msg");
          // 원래는 효과음이 끝나야 타이머가 뜨는데, 반복 주기가 효과음보다 짧아 여기서 바로 띄움
          window.stopwatch(10);
          setTimeout(function () { window.gameReady(); }, 4000);
        };
        whenLoaded(ready);
      },

      // Phonics Time 진행: 컨베이어 벨트로 카드가 흘러감 (원래 흐름 그대로)
      "phonics-play": function () {
        whenLoaded(ready);
      },

      // Phonics Time 결과 Great job!
      "phonics-end": function () {
        freezeAudio = true;
        whenLoaded(function () {
          var content = document.querySelector("#content_div");
          content.classList.remove("start");
          content.classList.add("ending");
          var ending = lottieIn("play_ending");
          pingPong(ending, 49, 89); // 49프레임부터 Great job! + ^^ 눈 제자리 동작
          if (ending) ending.play();
          ready();
        });
      },

      // 단어 낚시 진행: 가운데 물고기에 찌가 떨어지고(물 튀김) 흔들리는 장면만 계속 반복.
      // 시작 연출은 건너뛰고(그동안 부모는 정지 이미지) 이 장면부터 보여 줌
      "fish-play": function () {
        skipFishIntro();
        waitFor(fishButtons, function (buttons) {
          window.selectFish(buttons[1]);
          ready();
          var dropEl = document.getElementById("bobber_center_drop");
          var wiggleEl = document.getElementById("bobber_center_wiggle");
          setInterval(function () {
            var drop = lottieIn("bobber_center_drop");
            var wiggle = lottieIn("bobber_center_wiggle");
            if (!drop || !wiggle) return;
            wiggleEl.classList.remove("on");
            dropEl.classList.add("on");
            drop.goToAndPlay(0, true);
            drop.addEventListener("complete", function done() {
              drop.removeEventListener("complete", done);
              dropEl.classList.remove("on");
              wiggleEl.classList.add("on");
              wiggle.goToAndPlay(0, true);
            });
          }, 5000);
        });
      },

      // 단어 낚시 성공: 정답 물고기를 끝까지 당겨 봉지에 담긴 물고기
      "fish-success": function () {
        skipFishIntro();
        waitFor(fishButtons, function (buttons) {
          var answer = Array.prototype.filter.call(buttons, function (b) { return fishWord(b) === questionWord(); })[0];
          reelIn(answer || buttons[0]);
          loopLottieIn(["correct_bg", "correct_01"]);
          ready();
        });
      },

      // 단어 낚시 실패: 오답 물고기를 끝까지 당겨 낚여 올라온 타이어 (4가지 중 타이어로 고정)
      "fish-fail": function () {
        skipFishIntro();
        waitFor(fishButtons, function (buttons) {
          var wrong = Array.prototype.filter.call(buttons, function (b) { return fishWord(b) !== questionWord(); })[0];
          reelIn(wrong || buttons[0], 0.9);
          loopLottieIn(["incorrect_bg", "incorrect_04"]);
          ready();
        });
      },
    };

    (scenes[scene] || scenes.intro)();
  }
})();
