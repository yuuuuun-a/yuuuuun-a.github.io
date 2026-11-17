(function () {

  const INTRO_TYPE_CHAR_DELAY = 38;
  const INTRO_TYPE_PAUSE_DELAY = 240;
  const INTRO_TYPE_PAUSE_CHARS = ['.', '!', ','];

  // 타이핑 도중 화면을 한 번 더 클릭하면 남은 문장을 한꺼번에 보여준다.
  // 클릭이 그대로 아래 버튼까지 닿으면 "건너뛰기 + 버튼 동작"이 한 번에 일어나므로
  // (타이핑 중에도 버튼은 opacity 0일 뿐 눌리는 상태다) 캡처 단계에서 이벤트를 삼킨다.
  function listenSkipClick(skip) {
    const handler = (event) => {
      event.stopPropagation();
      event.preventDefault();
      skip();
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }

  // .intro-banner-point 같은 인라인 강조를 살린 채 한 글자씩 찍어야 해서, innerHTML을
  // 문자열로 자르지 않고 노드를 훑어 {ch, owner} 토큰을 만든다. owner는 그 글자를 감싸고
  // 있던 원본 엘리먼트(없으면 null)다. 템플릿 들여쓰기에서 들어온 공백은 여기서 정리한다.
  function tokenize(el) {
    const raw = [];

    const walk = (node, owner) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          // 소스 줄바꿈(\n)이 <br> 표식과 섞이지 않게 텍스트 안의 공백류는 전부 ' '로 바꿔 둔다
          [...child.textContent].forEach((ch) => raw.push({ ch: /\s/.test(ch) ? ' ' : ch, owner }));
        } else if (child.nodeName === 'BR') {
          raw.push({ ch: '\n', owner: null });
        } else {
          walk(child, child);
        }
      });
    };

    walk(el, null);

    const tokens = [];
    const dropTrailingSpace = () => {
      while (tokens.length && tokens[tokens.length - 1].ch === ' ') tokens.pop();
    };

    raw.forEach((token) => {
      if (token.ch === '\n') {
        dropTrailingSpace();
        tokens.push(token);
        return;
      }

      if (/\s/.test(token.ch)) {
        const prev = tokens[tokens.length - 1];
        if (!prev || prev.ch === '\n' || prev.ch === ' ') return;
        tokens.push({ ch: ' ', owner: token.owner });
        return;
      }

      tokens.push(token);
    });

    dropTrailingSpace();
    return tokens;
  }

  function initIntroTyping() {
    const el = document.querySelector('.intro-banner-text');
    const startFrame = document.querySelector('.intro-start-frame');
    if (!el) return;

    // 타이핑 도중 줄바꿈이 하나씩 추가되면서 높이가 늘어나 보이지 않도록,
    // 완성된 텍스트 기준 높이를 미리 고정해둠
    el.style.minHeight = `${el.offsetHeight}px`;

    const tokens = tokenize(el);

    el.textContent = '';
    let i = 0;
    let timer = null;
    let stopSkip = null;
    let host = null;      // 지금 글자가 들어갈 강조 엘리먼트(없으면 el에 바로 붙인다)
    let hostOwner = null; // host가 복제해 온 원본 엘리먼트

    function appendToken(token) {
      if (token.ch === '\n') {
        el.appendChild(document.createElement('br'));
        host = null;
        hostOwner = null;
        return;
      }

      if (token.owner !== hostOwner) {
        hostOwner = token.owner;
        host = token.owner ? el.appendChild(token.owner.cloneNode(false)) : null;
      }

      (host || el).appendChild(document.createTextNode(token.ch));
    }

    function finish() {
      clearTimeout(timer);
      if (stopSkip) stopSkip();
      stopSkip = null;
      startFrame?.classList.add('is-visible');
    }

    function skip() {
      while (i < tokens.length) {
        appendToken(tokens[i]);
        i += 1;
      }
      finish();
    }

    function typeNext() {
      if (i >= tokens.length) {
        finish();
        return;
      }

      const token = tokens[i];
      appendToken(token);

      i += 1;
      const delay = INTRO_TYPE_PAUSE_CHARS.includes(token.ch) ? INTRO_TYPE_PAUSE_DELAY : INTRO_TYPE_CHAR_DELAY;
      timer = setTimeout(typeNext, delay);
    }

    stopSkip = listenSkipClick(skip);
    timer = setTimeout(typeNext, 350);
  }

  window.initIntroTyping = initIntroTyping;
})();
