(function () {

  // 문항 유형 안내 팝업(question-info-popup.js가 만든 .question-wrap 복제본) 위에서
  // 손 커서를 움직여 "이 유형은 이렇게 푼다"를 반복 재생한다.
  //
  // 복제본은 inert라 실제 리스너가 없고, 여기서도 이벤트를 합성하지 않는다.
  // 카드 드래그 유형이 HTML5 DnD(dragstart + setDragImage)라 스크립트로 진짜 드래그를
  // 일으킬 수 없고, 복제본에 유형별 리스너를 다시 바인딩하면 "데모인데 실제로 동작하는"
  // 상태까지 따라오기 때문이다. 대신 손을 좌표로 옮기고 그 타이밍에 각 유형이 원래 쓰는
  // 상태 클래스(is-selected / is-dragging / is-drag-over / is-moved)를 직접 붙였다 뗀다.

  const STEP_GAP = 620;      // 동작 하나가 끝나고 다음 동작까지
  const LOOP_GAP = 1400;     // 한 바퀴가 끝나고 처음으로 되돌아가기까지
  const MOVE_DURATION = 520; // 손이 다음 타깃까지 미끄러지는 시간(SCSS transition과 맞출 것)
  const PRESS_DOWN = 150;    // 누르는 모션(손이 작아졌다가)
  const PRESS_UP = 170;      // 떼는 모션
  const DRAG_DURATION = 780; // 카드를 집고 목적지까지 끌고 가는 시간
  const DRAG_HOLD = 220;     // 집은 직후 / 놓기 직전에 잠깐 멈추는 시간

  // 탭 커서는 click.json(Lottie, 500x500)이고 손은 캔버스 한가운데 부근에만 그려져 있다.
  // 손끝을 타깃에 맞추려면 요소 좌상단이 아니라 캔버스 안 손 위치를 기준으로 잡아야 한다.
  // 아래 비율은 첫 프레임(파장이 아직 없을 때)의 잉크 경계를 실측한 값 — 손은 캔버스의
  // (43.1%, 43.5%)에서 시작해 18.9% x 23.8%를 차지한다. JSON을 갈아끼우면 다시 재야 한다.
  const HAND_IN_CANVAS = { x: 0.52, y: 0.53 };

  // 손끝이 타깃 정중앙이면 가려서 안 보이므로 살짝 오른쪽 아래로 내려 찍는다(타깃 크기 대비 비율).
  const TAP_BIAS = { x: 0.18, y: 0.22 };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 유형별 시연 대본. key는 .group-mcq에 함께 붙는 question-* 스코프 클래스.
  // 몇 번째 요소인지는 nth-of-type이 아니라 index로 고른다 — 선지 사이에 장식용 형제가
  // 끼어 있으면 nth-of-type이 엉뚱한 걸 집기 때문이다.
  //   tap  = 눌러서 고르는 유형. 같은 묶음에서 하나만 남겨야 하면 exclusive: true,
  //          키패드처럼 선택 상태가 남지 않으면 press: true
  //   drag  = 카드를 끌어다 놓는 유형. from을 to 안(into가 있으면 그 자식)으로 옮긴다
  //   trace = 선 잇기. from 카드에서 to 카드까지 선을 따라 그린다
  //   dial  = 각도 게이지. 손잡이를 잡고 호를 따라 to(도) 까지 돌린다
  //   within/withinIndex = 그 안에서만 찾고 exclusive도 그 안에서만 푼다(O/X처럼 줄별로 답하는 유형)
  const DEMOS = {
    'question-mcq': [
      { type: 'tap', target: '.option-box', index: 1, exclusive: true },
    ],
    'question-msq': [
      { type: 'tap', target: '.answer-tile', index: 0 },
      { type: 'tap', target: '.answer-tile', index: 2 },
    ],
    'question-ox': [
      { type: 'tap', within: '.ox-row', withinIndex: 0, target: '.ox-toggle', index: 0, exclusive: true },
      { type: 'tap', within: '.ox-row', withinIndex: 1, target: '.ox-toggle', index: 1, exclusive: true },
    ],
    'question-hotspot': [
      { type: 'tap', target: '.hotspot-point', index: 2, exclusive: true },
    ],
    'question-num': [
      { type: 'tap', target: '.keypad-key', index: 2, press: true, feed: true },
      { type: 'tap', target: '.keypad-key', index: 6, press: true, feed: true },
    ],
    'question-class': [
      { type: 'drag', from: '.classify-card', to: '.classify-zone', into: '.classify-zone-cards', placed: 'classify-card-placed' },
    ],
    'question-sort': [
      { type: 'drag', from: '.order-card', to: '.order-slot' },
    ],
    'question-fill': [
      { type: 'drag', from: '.fill-card', to: '.fill-slot' },
    ],
    'question-exp': [
      { type: 'drag', from: '.exp-card', to: '.exp-slot' },
    ],
    'question-match': [
      { type: 'trace', from: '.line-match-column-start .line-match-card', fromIndex: 0,
        to: '.line-match-column-end .line-match-card', toIndex: 1 },
    ],
    'question-drag': [
      { type: 'dial', to: 120 },
    ],
  };

  // 어떤 유형이든 마지막은 하단 완료 버튼을 누르는 것으로 끝난다 — 대본마다 적지 않고 여기서 붙인다.
  // '다시 하기'(secondary)가 같이 있는 유형도 있어서 주 버튼만 골라 누른다.
  // press: true — 버튼은 눌린 표시만 하고 선택 상태로 남지 않는다.
  const SUBMIT_STEP = {
    type: 'tap',
    target: '.question-action-btn:not(.question-action-btn-secondary)',
    press: true,
  };

  function initQuestionInfoDemo() {
    const popup = document.querySelector('[data-question-info-popup]');
    const stage = popup && popup.querySelector('[data-question-info-popup-stage]');
    const hand = popup && popup.querySelector('[data-question-info-popup-hand]');
    if (!popup || !stage || !hand) return;

    const scope = popup.closest('.group-mcq');
    const scopeClass = scope && [...scope.classList].find((c) => DEMOS[c]);
    const script = scopeClass && DEMOS[scopeClass].concat(SUBMIT_STEP);

    // 대본이 없는 유형(선 잇기·각도 게이지처럼 따라 그려지는 요소가 있어 아직 대본을 안 쓴 것 포함)은
    // 기존처럼 정지 화면 + 손 한 장으로 둔다.
    if (!script || !script.length) return;

    hand.classList.add('is-demo');

    // 팝업이 hidden인 동안에는 예시 요소들의 크기가 0이라, 좌표를 재서 그리는 격자는
    // 페이지 로드 시점에 비어 있다. 그래서 처음 열릴 때 예시 안쪽만 한 번 더 그려 주고,
    // 되돌릴 기준 상태(snapshot)도 그 뒤에 뜬다 — 먼저 뜨면 한 바퀴 돌 때마다 격자가 지워진다.
    let snapshot = null;

    const ensureReady = () => {
      if (snapshot !== null) return;
      if (stage.querySelector('.hotspot-grid')) window.initHotspotGrid?.(stage);
      window.lockTrayWidths?.('.fill-tray, .exp-tray', stage);
      snapshot = stage.innerHTML;
    };

    let runToken = 0;

    // 팝업 좌표계 기준으로 손을 옮긴다. stage는 scale(0.64)이 걸려 있지만
    // getBoundingClientRect()는 변형까지 반영한 실제 화면 px라 따로 환산하지 않아도 된다.
    // 손끝을 화면 좌표 (clientX, clientY)에 얹기 위한 팝업 기준 위치.
    // 손 크기는 offsetWidth/Height로 재야 한다 — getBoundingClientRect()는 누르는 중의
    // scale(0.84)까지 반영해서 그만큼 어긋난 값을 돌려준다.
    const handSpotFor = (clientX, clientY) => {
      const popupRect = popup.getBoundingClientRect();
      return {
        x: clientX - popupRect.left - hand.offsetWidth * HAND_IN_CANVAS.x,
        y: clientY - popupRect.top - hand.offsetHeight * HAND_IN_CANVAS.y,
      };
    };

    const placeHand = (target, bias) => {
      const rect = target.getBoundingClientRect();
      return handSpotFor(
        rect.left + rect.width * (0.5 + bias.x),
        rect.top + rect.height * (0.5 + bias.y)
      );
    };

    // 지금 손끝이 놓인 화면 좌표 — 연출을 손 움직임에 맞춰 따라붙일 때 쓴다.
    const handTipNow = () => {
      const r = hand.getBoundingClientRect();
      return {
        x: r.left + r.width * HAND_IN_CANVAS.x,
        y: r.top + r.height * HAND_IN_CANVAS.y,
      };
    };

    const moveHand = (x, y, scale) => {
      hand.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    };

    const setHandDuration = (ms) => {
      hand.style.transitionDuration = `${ms}ms`;
    };

    // 각 재생마다 runToken을 올려서, 팝업이 닫히거나 다시 열리면 진행 중인 대본이 스스로 멈추게 한다.
    const alive = (token) => token === runToken && !popup.hasAttribute('hidden');

    const scopeOf = (step) => (step.within
      ? stage.querySelectorAll(step.within)[step.withinIndex || 0]
      : stage) || null;

    const pick = (root, selector, index) => (root ? root.querySelectorAll(selector)[index || 0] : null) || null;

    // 키패드는 누른 티가 입력창에 남아야 "입력하는 유형"이라는 게 보인다.
    // 팝업 예시에는 question-keypad.js가 안 걸려 있으므로 같은 결과만 손으로 흉내 낸다.
    const feedKeypad = (root, key) => {
      const field = root.querySelector('.keypad-display-field');
      const cursor = field?.querySelector('.keypad-display-cursor');
      if (!field || !cursor) return;

      const slot = document.createElement('span');
      slot.className = 'keypad-display-slot';
      slot.textContent = key.textContent.trim();
      field.insertBefore(slot, cursor);
    };

    async function playTap(step, token) {
      const root = scopeOf(step);
      const target = pick(root, step.target, step.index);
      if (!target) return;

      const spot = placeHand(target, TAP_BIAS);
      setHandDuration(MOVE_DURATION);
      moveHand(spot.x, spot.y, 1);
      await sleep(MOVE_DURATION);
      if (!alive(token)) return;

      setHandDuration(PRESS_DOWN);
      moveHand(spot.x, spot.y, 0.84);
      target.classList.add('is-demo-press');
      window.playTapLottie?.(hand);
      await sleep(PRESS_DOWN);
      if (!alive(token)) return;

      if (step.exclusive) {
        root.querySelectorAll(step.target).forEach((el) => el.classList.remove('is-selected'));
      }
      // 키패드처럼 누른 순간 모양만 바뀌고 선택 상태가 남지 않는 유형은 press만 준다.
      if (!step.press) target.classList.toggle('is-selected');
      if (step.feed) feedKeypad(root, target);

      setHandDuration(PRESS_UP);
      moveHand(spot.x, spot.y, 1);
      target.classList.remove('is-demo-press');
      await sleep(PRESS_UP);
    }

    async function playDrag(step, token) {
      const root = scopeOf(step);
      const card = pick(root, step.from, step.fromIndex);
      const target = pick(root, step.to, step.toIndex);
      if (!card || !target) return;

      const grabSpot = placeHand(card, { x: 0, y: 0 });
      setHandDuration(MOVE_DURATION);
      moveHand(grabSpot.x, grabSpot.y, 1);
      await sleep(MOVE_DURATION);
      if (!alive(token)) return;

      const dropZone = (step.into && target.querySelector(step.into)) || target;
      const stageRect = stage.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      // 카드가 실제로 놓일 자리를 미리 재 둔다. 칸 중앙으로 날려 보내면 분류함처럼
      // 칸이 카드보다 큰 유형에서 카드가 목록 맨 앞에 붙어, 착지 순간 눈에 보이게 튄다.
      // 그래서 잠깐 옮겨 놓고 재 본 뒤 원래 자리로 되돌린다(화면에는 안 보이게).
      const landRect = (() => {
        const parent = card.parentNode;
        const next = card.nextSibling;
        card.style.visibility = 'hidden';
        if (step.placed) card.classList.add(step.placed);
        dropZone.appendChild(card);
        const rect = card.getBoundingClientRect();
        if (step.placed) card.classList.remove(step.placed);
        parent.insertBefore(card, next);
        card.style.visibility = '';
        return rect;
      })();

      // stage에 scale(0.64)이 걸려 있어서, 화면 px로 잰 값을 stage 안 좌표로 되돌려 써야 한다.
      const scale = cardRect.width / (card.offsetWidth || cardRect.width) || 1;

      // 트레이가 전부 overflow: hidden이라 카드를 그 자리에서 밀면 칸을 벗어나는 순간 잘린다.
      // 실제 드래그는 브라우저가 DOM 밖에 고스트를 그려서 이 문제가 없으므로, 여기서도
      // 복제본을 stage 바닥에 절대배치로 띄워 날리고 원본은 실제와 똑같이 흐린 채 자리를 지킨다.
      const flyer = card.cloneNode(true);
      flyer.classList.add('is-demo-drag');
      flyer.style.position = 'absolute';
      flyer.style.margin = '0';
      flyer.style.left = `${(cardRect.left - stageRect.left) / scale}px`;
      flyer.style.top = `${(cardRect.top - stageRect.top) / scale}px`;
      flyer.style.width = `${card.offsetWidth}px`;
      flyer.style.height = `${card.offsetHeight}px`;
      stage.appendChild(flyer);

      card.classList.add('is-dragging');
      setHandDuration(PRESS_DOWN);
      moveHand(grabSpot.x, grabSpot.y, 0.84);
      await sleep(DRAG_HOLD);
      if (!alive(token)) { flyer.remove(); return; }

      const shiftX = (landRect.left + landRect.width / 2 - (cardRect.left + cardRect.width / 2)) / scale;
      const shiftY = (landRect.top + landRect.height / 2 - (cardRect.top + cardRect.height / 2)) / scale;

      const dropSpot = handSpotFor(landRect.left + landRect.width / 2, landRect.top + landRect.height / 2);
      flyer.style.transition = `transform ${DRAG_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      flyer.style.transform = `translate(${shiftX}px, ${shiftY}px) scale(1.04)`;
      setHandDuration(DRAG_DURATION);
      moveHand(dropSpot.x, dropSpot.y, 0.84);
      target.classList.add('is-drag-over');
      await sleep(DRAG_DURATION);
      if (!alive(token)) { flyer.remove(); return; }

      // 착지 — 날아온 복제본을 걷어내고 원본을 실제 위치로 옮긴다(실제 drop 핸들러와 같은 결과).
      flyer.remove();
      card.classList.remove('is-dragging');
      target.classList.remove('is-drag-over');
      if (step.placed) card.classList.add(step.placed);
      dropZone.appendChild(card);
      card.classList.add('is-moved');

      // 손은 이미 착지 자리에 와 있으므로 누르던 손만 편다(다시 옮기면 그게 곧 튀는 모션이 된다).
      setHandDuration(PRESS_UP);
      moveHand(dropSpot.x, dropSpot.y, 1);
      await sleep(DRAG_HOLD);
    }

    // CSS transition으로는 못 맞추는 연출(선을 따라 그리기, 바늘 회전)용.
    // 매 프레임 진행률을 넘겨 주고, 팝업이 닫히면 중간에 멈춘다.
    function animate(duration, token, onFrame) {
      return new Promise((resolve) => {
        const start = performance.now();
        const tick = () => {
          const raw = Math.min(1, (performance.now() - start) / duration);
          // 손이 쓰는 cubic-bezier(0.4, 0, 0.2, 1)과 대충 맞는 ease-in-out
          const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
          onFrame(eased);
          if (raw < 1 && alive(token)) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    }

    async function playTrace(step, token) {
      const root = stage.querySelector('.line-match');
      const ctrl = root && root.demoLine;
      const from = pick(stage, step.from, step.fromIndex);
      const to = pick(stage, step.to, step.toIndex);
      if (!ctrl || !from || !to) return;

      // 선은 카드 중앙이 아니라 연결점(dot)에서 나가므로 손도 그 점에 맞춘다.
      const a = ctrl.dotCenterClient(from);
      const b = ctrl.dotCenterClient(to);

      const grab = handSpotFor(a.x, a.y);
      setHandDuration(MOVE_DURATION);
      moveHand(grab.x, grab.y, 1);
      await sleep(MOVE_DURATION);
      if (!alive(token)) return;

      setHandDuration(PRESS_DOWN);
      moveHand(grab.x, grab.y, 0.84);
      const stroke = ctrl.begin(from);
      await sleep(DRAG_HOLD);
      if (!alive(token)) { stroke.cancel(); return; }

      // 손은 CSS transition(cubic-bezier)으로 미끄러진다. 선에 같은 곡선을 다시 구현하면
      // 어긋나므로, 매 프레임 손끝의 실제 위치를 읽어 거기까지 선을 그린다.
      const dropSpot = handSpotFor(b.x, b.y);
      setHandDuration(DRAG_DURATION);
      moveHand(dropSpot.x, dropSpot.y, 0.84);
      to.classList.add('is-drag-over');

      await animate(DRAG_DURATION, token, () => {
        const tip = handTipNow();
        stroke.to(tip.x, tip.y);
      });
      if (!alive(token)) { stroke.cancel(); return; }

      stroke.to(b.x, b.y);

      to.classList.remove('is-drag-over');
      stroke.drop(to);

      setHandDuration(PRESS_UP);
      moveHand(dropSpot.x, dropSpot.y, 1);
      await sleep(DRAG_HOLD);
    }

    async function playDial(step, token) {
      const wrap = stage.querySelector('.drag-gauge');
      const ctrl = wrap && wrap.demoDial;
      if (!ctrl) return;

      const fromDeg = Number(wrap.dataset.value) || 0;
      const toDeg = step.to;

      // 손잡이는 호를 그리며 움직이므로, 각도마다 좌표를 다시 계산해 손을 따라 붙인다.
      const handTo = (deg, scale) => {
        const pt = ctrl.handleAt(deg);
        const spot = handSpotFor(pt.x, pt.y);
        moveHand(spot.x, spot.y, scale);
      };

      setHandDuration(MOVE_DURATION);
      handTo(fromDeg, 1);
      await sleep(MOVE_DURATION);
      if (!alive(token)) return;

      setHandDuration(PRESS_DOWN);
      handTo(fromDeg, 0.84);
      ctrl.setDragging(true);
      await sleep(DRAG_HOLD);
      if (!alive(token)) { ctrl.setDragging(false); return; }

      // 회전 중에는 손도 매 프레임 옮겨야 하므로 transition을 끈다.
      setHandDuration(0);
      await animate(DRAG_DURATION, token, (t) => {
        const deg = fromDeg + (toDeg - fromDeg) * t;
        ctrl.setAngle(deg);
        handTo(deg, 0.84);
      });
      ctrl.setDragging(false);
      if (!alive(token)) return;

      setHandDuration(PRESS_UP);
      handTo(toDeg, 1);
      await sleep(DRAG_HOLD);
    }

    // 한 바퀴를 시작할 때 손을 첫 동작 자리에 미리 갖다 놓기 위한 좌표.
    // 유형마다 시작점이 다르다(선지 위 / 카드 위 / 연결점 / 바늘 손잡이).
    // 이걸 못 구하면 손이 팝업 왼쪽 위 기본 자리에 잠깐 서 있다가 날아온다.
    function startSpotFor(step) {
      if (step.type === 'trace') {
        const root = stage.querySelector('.line-match');
        const from = pick(stage, step.from, step.fromIndex);
        if (!root || !root.demoLine || !from) return null;
        const dot = root.demoLine.dotCenterClient(from);
        return handSpotFor(dot.x, dot.y);
      }

      if (step.type === 'dial') {
        const wrap = stage.querySelector('.drag-gauge');
        if (!wrap || !wrap.demoDial) return null;
        const pt = wrap.demoDial.handleAt(Number(wrap.dataset.value) || 0);
        return handSpotFor(pt.x, pt.y);
      }

      const root = scopeOf(step);
      if (step.type === 'drag') {
        const card = pick(root, step.from, step.fromIndex);
        return card ? placeHand(card, { x: 0, y: 0 }) : null;
      }

      const target = pick(root, step.target, step.index);
      return target ? placeHand(target, TAP_BIAS) : null;
    }

    async function play() {
      const token = ++runToken;
      ensureReady();

      while (alive(token)) {
        stage.innerHTML = snapshot;
        hand.style.transitionDuration = '0ms';
        hand.style.opacity = '0';

        // 되돌린 직후 한 프레임 쉬어야 새 노드의 레이아웃이 잡혀서 첫 좌표가 어긋나지 않는다.
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!alive(token)) return;

        // 트레이 폭은 창 크기에 따라 달라지므로, snapshot에 굳어 있는 값 대신 매 바퀴 다시 잰다.
        window.lockTrayWidths?.('.fill-tray, .exp-tray', stage);

        // 선 잇기/각도 게이지는 마크업에 달아 둔 데모 통로(root.demoLine, wrap.demoDial)로 움직이는데,
        // snapshot 복원으로 노드가 새로 만들어지면 그 통로가 사라지므로 매 바퀴 다시 붙인다.
        if (stage.querySelector('.line-match')) window.initLineMatch?.(stage);
        if (stage.querySelector('.drag-gauge')) window.initAngleDial?.(stage);

        // 위에서 SVG를 다시 그렸으니 한 프레임 더 쉬어야 그 크기가 잡힌다.
        // 바로 재면 손을 얹을 좌표가 SVG 좌상단 쪽으로 쏠린 엉뚱한 값이 나온다.
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!alive(token)) return;

        const spot = startSpotFor(script[0]);
        if (spot) {
          moveHand(spot.x, spot.y + 40, 1);
          // 이 0ms 배치를 여기서 확정시킨다. 바로 다음에 첫 동작이 transition을 걸며
          // 같은 프레임에 transform을 또 바꾸는데, 그 사이에 리플로우가 없으면
          // 브라우저는 배치된 값을 렌더하지 않고 이전 위치에서 날아오게 만든다.
          void hand.offsetWidth;
        }
        hand.style.opacity = '';

        for (const step of script) {
          if (!alive(token)) return;
          if (step.type === 'drag') await playDrag(step, token);
          else if (step.type === 'trace') await playTrace(step, token);
          else if (step.type === 'dial') await playDial(step, token);
          else await playTap(step, token);
          if (!alive(token)) return;
          await sleep(STEP_GAP);
        }

        await sleep(LOOP_GAP);
      }
    }

    const stop = () => {
      runToken += 1;
      hand.style.transitionDuration = '0ms';
      hand.style.opacity = '0';
    };

    // 팝업은 question-info-popup.js와 온보딩이 hidden 속성만 건드려 여닫으므로,
    // 클릭을 따로 듣지 않고 속성 변화만 보고 재생/정지한다.
    new MutationObserver(() => {
      if (popup.hasAttribute('hidden')) stop();
      else play();
    }).observe(popup, { attributes: true, attributeFilter: ['hidden'] });

    if (!popup.hasAttribute('hidden')) play();
    else stop();
  }

  window.initQuestionInfoDemo = initQuestionInfoDemo;
})();
