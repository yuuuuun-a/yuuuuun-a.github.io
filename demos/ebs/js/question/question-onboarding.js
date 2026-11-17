(function () {

  // 아래 숫자는 전부 Figma 온보딩 타임라인(3.8s 루프)의 키프레임을 ms로 환산한 값이다.
  const TYPE_START_DELAY = 450;
  const TYPE_CHAR_DELAY = 30;
  const TYPE_SENTENCE_PAUSE = 290; // . ! ? 뒤
  const TYPE_CLAUSE_PAUSE = 130;   // , 뒤 그리고 문장부호 없이 줄이 바뀔 때
  const SENTENCE_END = ['.', '!', '?'];

  // 타이핑이 끝나고 스포트라이트 대상이 한 번 튀기까지의 간격(56.842% → 67.632%).
  const TARGET_POP_DELAY = 410;
  const TARGET_POP_DURATION = 340;

  // 스크림은 레터박스까지 포함해 화면 전체를 덮고, 현재 스텝 타깃만 도려낸다.
  // 시안을 같은 해상도로 겹쳐 재보면 배경 아트·헤더·바닥도 카드와 똑같은 비율(약 0.54배)로
  // 어두워지고 선명도도 1/4로 떨어진다 — 즉 스포트라이트 대상 말고는 전부 딤드 + 블러다.
  const DESIGN_WIDTH = 1024;

  // 탭 커서(.onboarding-tap) 좌상단을 타깃 우하단 기준으로 얼마나 당겨 놓을지.
  // 커서는 click.json(Lottie, 500x500)이고 손은 캔버스의 (43.1%, 43.5%)에서 시작해
  // 18.9% x 23.8%를 차지한다(첫 프레임 잉크 실측). 요소를 vw(225)로 두면 손이
  // 시안 크기(45x51)에 가깝고, 그때 손은 요소 안에서 (97, 98)부터 시작한다.
  // 시안에서 손 좌상단은 타깃 우하단 기준 (-19, -8)이므로 여기에 그만큼 더한다.
  const TAP_OFFSET_X = 116;
  const TAP_OFFSET_Y = 106;

  // 커서 캔버스(정사각) 대비 손 그림이 차지하는 비율 — 화면 밖으로 안 나가게 clamp할 때 쓴다.
  const HAND_IN_CANVAS = { left: 0.431, top: 0.435, right: 0.620, bottom: 0.673 };
  const TAP_EDGE_MARGIN = 4;

  // 사전 훈련은 홈의 "훈련 출발"에서 들어오므로 나갈 때도 홈으로 돌아간다.
  const HOME_URL = 'home.html';

  // 타이핑 도중 화면을 한 번 더 클릭하면 남은 글자를 한꺼번에 드러낸다.
  // 클릭이 그대로 아래 버튼까지 닿으면 "건너뛰기 + 다음 스텝"이 한 번에 일어나므로
  // (타이핑 중에도 .onboarding-next는 opacity 0일 뿐 눌리는 상태다) 캡처 단계에서 이벤트를 삼킨다.
  function listenSkipClick(skip) {
    const handler = (event) => {
      event.stopPropagation();
      event.preventDefault();
      skip();
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }

  const selectorList = (value) => (value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const elementsFor = (value) => selectorList(value)
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  // <svg>는 HTMLElement가 아니라서 el.hidden 프로퍼티가 content attribute에 반영되지 않는다.
  // (프로퍼티만 바뀌고 [hidden] 선택자는 계속 매칭됨) 그래서 속성으로 직접 토글한다.
  const setHidden = (el, hidden) => {
    if (!el) return;
    if (hidden) el.setAttribute('hidden', '');
    else el.removeAttribute('hidden');
  };

  // 한 글자를 찍은 뒤 다음 글자까지 쉬는 시간. 시안에서 pause는 기본 간격에 더해지는 게
  // 아니라 기본 간격을 대체한다(문장부호 290ms, 쉼표/줄바꿈 130ms).
  function delayAfter(token, next) {
    if (token.ch === '\n') return 0; // 줄바꿈은 다음 글자와 같은 프레임에 찍힌다
    if (SENTENCE_END.indexOf(token.ch) !== -1) return TYPE_SENTENCE_PAUSE;
    if (token.ch === ',' || (next && next.ch === '\n')) return TYPE_CLAUSE_PAUSE;
    return TYPE_CHAR_DELAY;
  }

  // <em> 같은 인라인 강조를 살린 채 한 글자씩 찍어야 해서, innerHTML을 자르지 않고
  // 노드를 훑어 {ch, tag} 토큰을 만든다. 템플릿 들여쓰기에서 들어온 공백은 여기서 정리한다.
  function tokenizeText(el) {
    const raw = [];

    const walk = (node, tag) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          [...child.textContent].forEach((ch) => raw.push({ ch, tag }));
        } else if (child.nodeName === 'BR') {
          raw.push({ ch: '\n', tag: null });
        } else if (child.nodeName === 'IMG') {
          raw.push({ ch: '', img: child.cloneNode(true), tag });
        } else {
          walk(child, child.nodeName.toLowerCase());
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
        tokens.push({ ch: ' ', tag: token.tag });
        return;
      }

      tokens.push(token);
    });

    dropTrailingSpace();
    return tokens;
  }

  // 글자를 하나씩 '추가'하면 줄바꿈이 늘어나며 말풍선이 출렁이므로, Figma가 그랬던 것처럼
  // 완성된 문장을 미리 다 깔아 두고 각 글자를 visibility로만 드러낸다(레이아웃 고정).
  // 공백과 <br>은 늘 보이는 상태로 두고, 뒤따르는 글자와 같은 프레임에 찍힌다.
  function buildTypingChars(el) {
    const tokens = tokenizeText(el);
    const items = [];
    let host = null;
    let hostTag = null;

    el.textContent = '';

    tokens.forEach((token) => {
      if (token.ch === '\n') {
        el.appendChild(document.createElement('br'));
        host = null;
        hostTag = null;
        items.push({ ch: token.ch, span: null });
        return;
      }

      if (token.tag !== hostTag) {
        hostTag = token.tag;
        host = token.tag ? el.appendChild(document.createElement(token.tag)) : null;
      }

      if (token.ch === ' ') {
        (host || el).appendChild(document.createTextNode(' '));
        items.push({ ch: token.ch, span: null });
        return;
      }

      // 문장 속 도구 아이콘(<img>)도 글자와 같은 순서로 드러나야 해서 글자 span에 담아 둔다.
      if (token.img) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'onboarding-typing-char';
        iconSpan.appendChild(token.img);
        (host || el).appendChild(iconSpan);
        items.push({ ch: token.ch, span: iconSpan });
        return;
      }

      const span = document.createElement('span');
      span.className = 'onboarding-typing-char';
      span.textContent = token.ch;
      (host || el).appendChild(span);
      items.push({ ch: token.ch, span });
    });

    return items;
  }

  // 온보딩 스텝의 타이핑 대상(data-onboarding-typing)을 한 글자씩 보여준다.
  // 모든 스텝에 걸려 있고(Figma 주석 "모션: 타이핑 · 1회"), 끝나면 onDone을 부른다.
  // 진행 중인 타이머를 멈출 수 있도록 취소 함수를 돌려준다.
  function typeStepText(step, onDone) {
    const el = step.querySelector('[data-onboarding-typing]');
    if (!el || el.dataset.typed) {
      onDone();
      return null;
    }
    el.dataset.typed = '1';

    const items = buildTypingChars(el);
    let i = 0;
    let timer = null;
    let stopSkip = null;

    // 스텝을 벗어날 때(showStep)도 불리므로, 타이머와 건너뛰기 리스너를 같이 정리한다.
    function stop() {
      clearTimeout(timer);
      if (stopSkip) stopSkip();
      stopSkip = null;
    }

    function typeNext() {
      if (i >= items.length) {
        stop();
        onDone();
        return;
      }

      const item = items[i];
      if (item.span) item.span.classList.add('is-typed');

      i += 1;
      timer = setTimeout(typeNext, item.span ? delayAfter(item, items[i]) : 0);
    }

    stopSkip = listenSkipClick(() => {
      for (; i < items.length; i += 1) {
        if (items[i].span) items[i].span.classList.add('is-typed');
      }
      stop();
      onDone();
    });

    timer = setTimeout(typeNext, TYPE_START_DELAY);
    return stop;
  }

  // 스텝 0~2(.onboarding-intro-continued)는 한 장면이 계속 이어지는 것처럼 보여야 하는데,
  // .onboarding-step이 display: none <-> block으로 갈아 끼워지는 탓에 무한 루프 애니메이션이
  // 스텝을 넘길 때마다 0프레임부터 다시 시작한다(캐릭터가 툭 내려앉고 말풍선 테두리 빛도 처음부터 흐름).
  // 공용 시계(performance.now) 기준으로 음수 delay를 넣어 끊긴 위상에서 이어 붙인다.
  const LOOP_SYNC_SELECTOR = '.onboarding-intro-character, .onboarding-dialog-line';

  function syncLoops(step) {
    if (!step.classList.contains('onboarding-intro-continued')) return;

    step.querySelectorAll(LOOP_SYNC_SELECTOR).forEach((el) => {
      // 여러 애니메이션이 걸린 스텝은 위에서 걸러지므로 첫 번째 duration만 보면 된다.
      const duration = parseFloat(getComputedStyle(el).animationDuration) * 1000;
      if (!duration) return;
      el.style.animationDelay = `${-(performance.now() % duration)}ms`;
    });
  }

  function initOnboarding() {
    const root = document.querySelector('[data-onboarding]');
    if (!root) return;

    const wrap = document.querySelector('.mcq-wrap');
    const scrim = root.querySelector('[data-onboarding-scrim]');
    const tap = root.querySelector('[data-onboarding-tap]');
    const steps = Array.from(root.querySelectorAll('.onboarding-step'));
    if (!steps.length) return;

    let current = steps.findIndex((step) => step.classList.contains('is-active'));
    if (current === -1) current = 0;

    let cancelTyping = null;
    let popTimer = null;
    let popped = [];
    let shown = [];
    let lifted = [];

    // 좌표는 스크림 박스(= 화면 전체) 기준 CSS px. clip-path: path()가 쓰는 좌표계와 같다.
    const designMetrics = () => ({ originRect: scrim.getBoundingClientRect() });

    const NO_RADIUS = { rx: 0, ry: 0 };

    // "8px" 또는 "8px 12px"(타원) 꼴
    const cornerRadius = (value) => {
      const parts = String(value || '').split(' ');
      const rx = parseFloat(parts[0]) || 0;
      const ry = parseFloat(parts.length > 1 ? parts[1] : parts[0]) || 0;
      return { rx, ry };
    };

    // 한 변의 두 반지름 합이 변 길이를 넘으면 전체를 같은 비율로 줄이는 CSS 규칙
    const fitRadii = (radii, w, h) => {
      const ratios = [
        [w, radii.tl.rx + radii.tr.rx],
        [w, radii.bl.rx + radii.br.rx],
        [h, radii.tl.ry + radii.bl.ry],
        [h, radii.tr.ry + radii.br.ry],
      ].filter(([, sum]) => sum > 0).map(([side, sum]) => side / sum);

      const f = ratios.length ? Math.min(1, ...ratios) : 1;
      if (f >= 1) return radii;

      const shrink = (c) => ({ rx: c.rx * f, ry: c.ry * f });
      return { tl: shrink(radii.tl), tr: shrink(radii.tr), br: shrink(radii.br), bl: shrink(radii.bl) };
    };

    const designRect = (el, metrics) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      const style = getComputedStyle(el);

      return {
        x: rect.left - metrics.originRect.left,
        y: rect.top - metrics.originRect.top,
        w: rect.width,
        h: rect.height,
        radii: fitRadii({
          tl: cornerRadius(style.borderTopLeftRadius),
          tr: cornerRadius(style.borderTopRightRadius),
          br: cornerRadius(style.borderBottomRightRadius),
          bl: cornerRadius(style.borderBottomLeftRadius),
        }, rect.width, rect.height),
      };
    };

    const n = (value) => value.toFixed(2);

    // 딤 영역과 구멍 모두 요소의 border-radius를 그대로 따라간다.
    // 시안에서도 딤드가 버튼/칩의 둥근 모서리에 딱 붙는다.
    const rectPath = (r) => {
      const { x, y, w, h } = r;
      const { tl, tr, br, bl } = r.radii;

      if (!tl.rx && !tl.ry && !tr.rx && !tr.ry && !br.rx && !br.ry && !bl.rx && !bl.ry) {
        return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
      }

      const arc = (c, ex, ey) => (c.rx || c.ry ? `A${n(c.rx)} ${n(c.ry)} 0 0 1 ${n(ex)} ${n(ey)}` : '');

      return `M${n(x + tl.rx)} ${n(y)}`
        + `H${n(x + w - tr.rx)}` + arc(tr, x + w, y + tr.ry)
        + `V${n(y + h - br.ry)}` + arc(br, x + w - br.rx, y + h)
        + `H${n(x + bl.rx)}` + arc(bl, x, y + h - bl.ry)
        + `V${n(y + tl.ry)}` + arc(tl, x + tl.rx, y)
        + 'Z';
    };

    // 화면 전체를 덮는 딤 사각형 + 타깃 구멍을 한 경로에 넣고 evenodd로 도려낸다.
    // data-onboarding-dim="full"인 스텝은 구멍 없이 화면 전체를 균일하게 딤 처리한다.
    const paintScrim = (step) => {
      const dimFull = step.dataset.onboardingDim === 'full';
      const targets = elementsFor(step.dataset.onboardingTarget);
      if (!scrim || !wrap || (!targets.length && !dimFull)) {
        setHidden(scrim, true);
        return;
      }

      // clip-path를 걸기 전 크기를 재야 해서 먼저 보이게 한다.
      setHidden(scrim, false);

      const metrics = designMetrics();
      const full = {
        x: 0,
        y: 0,
        w: metrics.originRect.width,
        h: metrics.originRect.height,
        radii: { tl: NO_RADIUS, tr: NO_RADIUS, br: NO_RADIUS, bl: NO_RADIUS },
      };

      const rects = [full];
      if (!dimFull) {
        targets.forEach((el) => {
          const hole = designRect(el, metrics);
          if (hole) rects.push(hole);
        });
      }

      scrim.style.clipPath = `path(evenodd, "${rects.map(rectPath).join('')}")`;
    };

    const placeTap = (step) => {
      if (!tap) return;

      const target = elementsFor(step.dataset.onboardingTap)[0];
      if (!target || !wrap) {
        setHidden(tap, true);
        return;
      }

      // 탭 커서는 스크림이 아니라 .onboarding(=wrap) 안에 놓이므로 wrap 기준으로 잰다.
      const wrapRect = wrap.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        setHidden(tap, true);
        return;
      }

      const scale = wrapRect.width / DESIGN_WIDTH;
      setHidden(tap, false);
      const size = tap.getBoundingClientRect().width;

      let x;
      let y;
      if (step.dataset.onboardingTapCenter !== undefined) {
        // 선지 카드처럼 넓은 타깃은 우하단 기준 오프셋 대신 손 그림 자체의 중심을
        // 타깃 중앙에 맞춘다(HAND_IN_CANVAS 잉크 범위의 평균 지점 기준).
        const handCenterX = (HAND_IN_CANVAS.left + HAND_IN_CANVAS.right) / 2;
        const handCenterY = (HAND_IN_CANVAS.top + HAND_IN_CANVAS.bottom) / 2;
        x = rect.left + rect.width / 2 - wrapRect.left - handCenterX * size;
        y = rect.top + rect.height / 2 - wrapRect.top - handCenterY * size;
      } else {
        x = rect.right - wrapRect.left - TAP_OFFSET_X * scale;
        y = rect.bottom - wrapRect.top - TAP_OFFSET_Y * scale;
      }

      // 화면 아래·오른쪽 끝에 붙은 타깃('이 문제는 넘어가기')에서는 손이 밖으로 밀려난다.
      // 시안도 그럴 땐 커서를 버튼 위쪽으로 올려 두므로, 손 그림이 wrap 안에 남도록 당긴다.
      const margin = TAP_EDGE_MARGIN * scale;
      x = Math.min(x, wrapRect.width - margin - HAND_IN_CANVAS.right * size);
      x = Math.max(x, margin - HAND_IN_CANVAS.left * size);
      y = Math.min(y, wrapRect.height - margin - HAND_IN_CANVAS.bottom * size);
      y = Math.max(y, margin - HAND_IN_CANVAS.top * size);

      // data-onboarding-tap-offset="x,y": 화면 끝에 붙은 타깃(연습장 버튼처럼 오른쪽으로
      // 반쯤 잘려 있는 것)은 위 보정만으로는 손끝이 타깃 밖에 떨어진다. 그럴 때만
      // 스텝에서 설계 px 단위로 밀어 준다(+x 오른쪽, +y 아래). clamp 뒤에 더하므로
      // 손이 화면 밖으로 조금 나가는 것도 허용된다.
      const nudge = selectorList(step.dataset.onboardingTapOffset).map(Number);
      if (nudge.length === 2 && nudge.every((value) => !Number.isNaN(value))) {
        x += nudge[0] * scale;
        y += nudge[1] * scale;
      }

      tap.style.left = `${(x / wrapRect.width) * 100}%`;
      tap.style.top = `${(y / wrapRect.height) * 100}%`;
    };

    const clearPop = () => {
      clearTimeout(popTimer);
      popped.forEach((el) => {
        el.classList.remove('is-onboarding-pop');
        el.style.transformOrigin = '';
      });
      popped = [];
    };

    // transform으로 자리를 잡은 요소(예: .header-wrap-center의 translate(-50%, -50%))를
    // 기본 원점(요소 중앙)으로 확대하면 그 이동량까지 같이 커져서 옆으로 밀린다.
    // 원점을 이동량만큼 옮겨 두면 어떤 요소든 제자리에서 커진다.
    const popOrigin = (el) => {
      const transform = getComputedStyle(el).transform;
      if (!transform || transform === 'none') return '';

      const values = transform.slice(transform.indexOf('(') + 1, -1).split(',').map(Number);
      const tx = values.length === 16 ? values[12] : values[4];
      const ty = values.length === 16 ? values[13] : values[5];
      if (!tx && !ty) return '';

      return `calc(50% + ${tx}px) calc(50% + ${ty}px)`;
    };

    // 타이핑이 끝난 뒤 스포트라이트 대상이 한 번 톡 튀는 모션.
    // data-onboarding-pop으로 대상을 따로 지정할 수 있고, "none"이면 건너뛴다.
    // data-onboarding-select: 탭 커서가 누르는 시늉을 하는 시점(같은 타이밍)에 맞춰
    // 그 선지를 실제로 고른 것처럼 .is-selected를 붙인다(처음엔 아무 선지도 선택돼 있지 않다가
    // 클릭 모션이 들어간 곳만 선택 상태가 됨).
    const popTarget = (step) => {
      const raw = step.dataset.onboardingPop === undefined
        ? step.dataset.onboardingTarget
        : step.dataset.onboardingPop;
      const selectTargets = elementsFor(step.dataset.onboardingSelect);
      const skipPop = !raw || raw === 'none';
      const targets = skipPop ? [] : elementsFor(raw);
      if (!targets.length && !selectTargets.length) return;

      popTimer = setTimeout(() => {
        popped = targets;
        targets.forEach((el) => {
          const origin = popOrigin(el);
          if (origin) el.style.transformOrigin = origin;
          el.classList.add('is-onboarding-pop');
        });
        selectTargets.forEach((el) => el.classList.add('is-selected'));
        popTimer = setTimeout(clearPop, TARGET_POP_DURATION + 50);
      }, TARGET_POP_DELAY);
    };

    const revealNext = (step) => {
      step.querySelectorAll('[data-onboarding-next]').forEach((btn) => {
        const reveal = btn.closest('[data-onboarding-reveal]') || btn;
        reveal.classList.add('is-visible');
      });
    };

    // data-onboarding-show: 그 스텝에서만 함께 띄워 두는 문항 UI(유형 안내 팝업 등).
    // 스텝을 벗어나면 다시 감춘다.
    const applyShow = (step) => {
      shown.forEach((el) => setHidden(el, true));
      shown = elementsFor(step.dataset.onboardingShow);
      shown.forEach((el) => setHidden(el, false));
    };

    // data-onboarding-lift: data-onboarding-dim="full"로 화면 전체가 균일하게 딤 처리될 때도
    // 이 요소만은 스크림 위로 끌어올려(is-onboarding-lift → z-index) 밝게 남긴다.
    const applyLift = (step) => {
      lifted.forEach((el) => el.classList.remove('is-onboarding-lift'));
      lifted = elementsFor(step.dataset.onboardingLift);
      lifted.forEach((el) => el.classList.add('is-onboarding-lift'));
    };

    // 스텝에 맞춰 따로 움직여야 하는 시연(연습장 필기 등)에 알린다.
    // onboarding:leave = 그 스텝을 벗어남, onboarding:play = 말풍선 타이핑이 끝나 시연을 시작할 때.
    let playing = null;
    const notify = (type, step) => {
      if (!step) return;
      root.dispatchEvent(new CustomEvent(type, { detail: { step } }));
    };

    const leaveStep = () => {
      notify('onboarding:leave', playing);
      playing = null;
    };

    const showStep = (index) => {
      const step = steps[index];

      if (cancelTyping) cancelTyping();
      clearPop();
      leaveStep();

      steps.forEach((item, i) => item.classList.toggle('is-active', i === index));
      syncLoops(step);
      // 스포트라이트가 크기를 재려면 먼저 띄워 놓아야 한다.
      applyShow(step);
      applyLift(step);
      paintScrim(step);
      placeTap(step);

      cancelTyping = typeStepText(step, () => {
        revealNext(step);
        popTarget(step);
        playing = step;
        notify('onboarding:play', step);
      });
    };

    showStep(current);

    window.addEventListener('resize', () => {
      paintScrim(steps[current]);
      placeTap(steps[current]);
    });

    root.querySelectorAll('[data-onboarding-next]').forEach((btn) => {
      btn.addEventListener('click', () => {
        current += 1;
        if (current >= steps.length) {
          if (cancelTyping) cancelTyping();
          clearPop();
          leaveStep();
          shown.forEach((el) => setHidden(el, true));
          shown = [];
          lifted.forEach((el) => el.classList.remove('is-onboarding-lift'));
          lifted = [];
          root.classList.add('is-done');
          return;
        }
        showStep(current);
      });
    });

    // 상단 버튼. 건너뛰기는 마지막 스텝으로, 뒤로(나가기)는 홈으로 간다.
    root.querySelectorAll('.onboarding-skip').forEach((btn) => {
      btn.addEventListener('click', () => {
        current = steps.length - 1;
        showStep(current);
      });
    });

    root.querySelectorAll('.onboarding-back').forEach((btn) => {
      btn.addEventListener('click', () => {
        location.href = HOME_URL;
      });
    });
  }

  window.initOnboarding = initOnboarding;
})();
