/**
 * 데모 소리 자동 재생이 막혔을 때 게임이 멈추지 않게 하는 안전장치(모든 데모 <head> 맨 앞, defer 없이).
 *
 * 퍼블리셔 게임은 intro → content로 "페이지를 넘긴 뒤" 안내 음성을 틀고, 음성이 끝나야(ended) 다음 단계로 갑니다.
 * 브라우저(특히 Safari)는 새 페이지에서 아직 누른 적이 없으면 play()를 막아서, 음성이 시작되지 않고 게임이 그 자리에서 멈춥니다.
 * → play()가 NotAllowedError로 막히면 그 재생을 보류하고 "화면을 눌러 시작" 막을 띄웁니다. 한 번 누르면 보류한 소리를 순서대로 다시 틀고
 *   (원래 play() 약속도 그때 이행), 멈춰 있던 AudioContext도 깨웁니다. 게임 흐름은 원본 그대로 이어집니다.
 * 케이스 스터디 안에 박힌 보기 전용 데모(?embed=)는 소리가 없어야 하므로 막만 띄우지 않고 조용히 넘깁니다(소리 없이 진행은 원본 동작).
 */
(function () {
  if (window.__demoAutoplayGate) return;
  window.__demoAutoplayGate = true;
  var embedded = /[?&]embed=/.test(location.search);
  var Media = window.HTMLMediaElement && HTMLMediaElement.prototype;
  if (!Media) return;
  var originalPlay = Media.play;
  var pending = [];
  var contexts = [];
  var unlocked = false;
  var gate = null;

  // AudioContext가 만들어지면 기억해 두었다가 누를 때 깨움
  ["AudioContext", "webkitAudioContext"].forEach(function (name) {
    var Ctx = window[name];
    if (!Ctx) return;
    window[name] = function () {
      var ctx = new (Function.prototype.bind.apply(Ctx, [null].concat([].slice.call(arguments))))();
      contexts.push(ctx);
      return ctx;
    };
    window[name].prototype = Ctx.prototype;
  });

  // 안내는 클릭을 막지 않음(pointer-events: none): 어디를 눌러도 원래 버튼이 눌리고, 그 누름으로 소리가 풀림.
  // Start 버튼이 있는 intro 화면은 누를 곳이 이미 보이므로 안내를 띄우지 않고, 게임 화면에서 0.8초 뒤에도 막혀 있을 때만
  var isIntro = /\/intro\.html$/.test(location.pathname);
  var timer = 0;
  function showGate() {
    if (gate || unlocked || embedded || isIntro || timer) return;
    timer = setTimeout(function () {
      timer = 0;
      if (unlocked || !pending.length || !document.body) return;
      gate = document.createElement("div");
      gate.className = "demo-autoplay-gate";
      gate.setAttribute("role", "status");
      gate.innerHTML = '<span class="demo-autoplay-gate-card"><span class="demo-autoplay-gate-icon" aria-hidden="true">▶</span><span>화면을 눌러 시작하기</span><small>소리가 함께 나와요</small></span>';
      document.body.appendChild(gate);
    }, 800);
  }

  function unlock() {
    unlocked = true;
    if (gate) {
      gate.remove();
      gate = null;
    }
    contexts.forEach(function (ctx) {
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
    });
    var queue = pending;
    pending = [];
    queue.forEach(function (item) {
      originalPlay.call(item.el).then(item.resolve, item.reject);
    });
  }

  Media.play = function () {
    var el = this;
    var result;
    try {
      result = originalPlay.call(el);
    } catch (error) {
      return Promise.reject(error);
    }
    if (!result || typeof result.then !== "function") return result;
    return result.catch(function (error) {
      if (!error || error.name !== "NotAllowedError" || unlocked) throw error;
      if (embedded) throw error;
      return new Promise(function (resolve, reject) {
        // 같은 요소가 여러 번 막히면 마지막 것만 남김
        pending = pending.filter(function (item) {
          if (item.el !== el) return true;
          item.resolve();
          return false;
        });
        pending.push({ el: el, resolve: resolve, reject: reject });
        showGate();
      });
    });
  };

  // 첫 누름(어디든)에서 풀기
  ["pointerdown", "keydown"].forEach(function (type) {
    window.addEventListener(type, function () {
      if (!unlocked) unlock();
    }, { capture: true });
  });
})();
