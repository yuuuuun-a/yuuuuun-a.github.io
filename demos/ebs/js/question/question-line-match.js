(function () {

  // 시작점 클릭 → .is-armed로 대기, 이어서 도착점을 클릭하면 그 사이에 <svg><line>을 그림.
  // 이미 선이 있는 시작점/도착점을 다시 연결하면 기존 선은 지우고 새로 그림(둘 다 정원 1개)
  // root를 주면 그 안의 선 잇기만 다시 세팅한다 — 안내 팝업 예시는 한 바퀴마다 마크업이
  // 복원되면서 아래 root.demoLine이 날아가므로, question-info-demo.js가 다시 부른다.
  function initLineMatch(root) {
    (root || document).querySelectorAll('.line-match').forEach(setupLineMatch);
  }

  function setupLineMatch(root) {
    const svg = root.querySelector('.line-match-lines');
    const cards = [...root.querySelectorAll('.line-match-card')];
    if (!svg || !cards.length) return;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const connections = new Map();
    let armed = null;

    // 화면 좌표 -> <svg> 내부 좌표. 조상에 transform(안내 팝업의 scale 등)이 걸려 있으면
    // 화면 rect를 그대로 빼는 방식은 그 배율만큼 어긋나므로 getScreenCTM()으로 환산한다.
    // 변형이 없는 문항 본체에서는 결과가 예전과 같다.
    function toSvgPoint(clientX, clientY) {
      const ctm = svg.getScreenCTM && svg.getScreenCTM();
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const p = pt.matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
      }
      const svgRect = svg.getBoundingClientRect();
      return { x: clientX - svgRect.left, y: clientY - svgRect.top };
    }

    function dotCenter(card) {
      const dotRect = card.querySelector('.line-match-node-dot').getBoundingClientRect();
      return toSvgPoint(dotRect.left + dotRect.width / 2, dotRect.top + dotRect.height / 2);
    }

    function buildLineGradient(gradientId, from, to, colorsCss) {
      const colors = colorsCss.split(',').map((c) => c.trim()).filter(Boolean);
      if (colors.length < 2) return { stroke: colors[0] || 'var(--color-surface-glow)', element: null };

      const gradient = document.createElementNS(SVG_NS, 'linearGradient');
      gradient.setAttribute('id', gradientId);
      gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
      gradient.setAttribute('x1', from.x);
      gradient.setAttribute('y1', from.y);
      gradient.setAttribute('x2', to.x);
      gradient.setAttribute('y2', to.y);
      gradient.innerHTML = colors
        .map((c, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${c}" />`)
        .join('');
      svg.appendChild(gradient);
      return { stroke: `url(#${gradientId})`, element: gradient };
    }

    function redraw() {
      svg.innerHTML = '';

      connections.forEach((endCard, startCard) => {
        const from = dotCenter(startCard);
        const to = dotCenter(endCard);
        const startStyle = getComputedStyle(startCard);
        const gradientId = `line-match-grad-${startCard.dataset.lineId}`;
        const { stroke } = buildLineGradient(gradientId, from, to, startStyle.getPropertyValue('--line-gradient'));
        const shadow = startStyle.getPropertyValue('--line-shadow').trim();

        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);
        line.setAttribute('stroke', stroke);
        line.setAttribute('stroke-linecap', 'round');
        if (shadow) line.style.filter = `drop-shadow(${shadow})`;
        svg.appendChild(line);
      });
    }

    const DOT_COLOR_VARS = ['--line-color', '--line-color-light', '--dot-border', '--dot-bg', '--dot-shadow', '--dot-in-bg'];

    function disconnectStart(startCard) {
      const endCard = connections.get(startCard);
      if (!endCard) return;
      connections.delete(startCard);
      startCard.classList.remove('is-connected');
      endCard.classList.remove('is-connected');
      DOT_COLOR_VARS.forEach((name) => endCard.style.removeProperty(name));
    }

    function connect(startCard, endCard) {
      disconnectStart(startCard); // 시작점이 이미 다른 도착점과 연결돼 있었으면 해제
      connections.forEach((e, s) => { if (e === endCard) disconnectStart(s); }); // 도착점도 정원 1개

      connections.set(startCard, endCard);
      startCard.classList.add('is-connected');
      endCard.classList.add('is-connected');
      const startStyle = getComputedStyle(startCard);
      DOT_COLOR_VARS.forEach((name) => endCard.style.setProperty(name, startStyle.getPropertyValue(name).trim()));
      redraw();
    }

    function arm(card) {
      if (armed === card) {
        armed.classList.remove('is-armed');
        armed = null;
        return;
      }
      armed?.classList.remove('is-armed');
      armed = card;
      card.classList.add('is-armed');
    }

    function handleTap(card) {
      if (card.dataset.lineRole === 'start') {
        // 이미 선이 이어진 시작점을 다시 탭하면 대기 상태로 두지 않고 바로 그 선을 지움
        if (connections.has(card)) {
          if (armed === card) armed = null;
          card.classList.remove('is-armed');
          disconnectStart(card);
          redraw();
          return;
        }
        arm(card);
        return;
      }

      if (armed) {
        connect(armed, card);
        armed.classList.remove('is-armed');
        armed = null;
        return;
      }

      // 대기 중인 시작점 없이 이미 연결된 도착점을 탭하면 그 연결만 해제
      connections.forEach((e, s) => { if (e === card) disconnectStart(s); });
      redraw();
    }

    function svgPoint(evt) {
      return toSvgPoint(evt.clientX, evt.clientY);
    }

    function cardUnderPoint(evt, role) {
      const el = document.elementFromPoint(evt.clientX, evt.clientY);
      const card = el?.closest('.line-match-card');
      return card && cards.includes(card) && card.dataset.lineRole === role ? card : null;
    }

    function beginDragPreview(startCard) {
      const from = dotCenter(startCard);
      const startStyle = getComputedStyle(startCard);
      const gradientId = `line-match-drag-grad-${startCard.dataset.lineId}-${Math.random().toString(36).slice(2)}`;
      const { stroke, element } = buildLineGradient(gradientId, from, from, startStyle.getPropertyValue('--line-gradient'));
      const shadow = startStyle.getPropertyValue('--line-shadow').trim();
      dragGradient = element;

      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', from.x);
      line.setAttribute('y2', from.y);
      line.setAttribute('stroke', stroke);
      line.setAttribute('stroke-linecap', 'round');
      if (shadow) line.style.filter = `drop-shadow(${shadow})`;
      svg.appendChild(line);
      startCard.classList.add('is-armed');
      return line;
    }

    const DRAG_THRESHOLD = 6;
    let pointerId = null;
    let pressCard = null;
    let pressPoint = null;
    let dragRole = null;
    let dragLine = null;
    let dragGradient = null;
    let hoverTarget = null;

    function stopDrag() {
      dragLine?.remove();
      dragLine = null;
      dragGradient?.remove();
      dragGradient = null;
      hoverTarget?.classList.remove('is-drag-over');
      hoverTarget = null;
      pressCard?.classList.remove('is-armed');
      if (armed === pressCard) armed = null;
    }

    cards.forEach((card) => {
      card.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        // 크게 보기 아이콘을 누른 건 선 긋기로 치지 않음(포인터를 잡으면 아이콘 click이 카드로 넘어가 모달이 안 열림)
        if (event.target.closest('[data-image-zoom]')) return;

        // 탭으로 대기 중인 시작점이 있을 때 도착점을 누르는 건 "시작점 → 도착점" 탭 연결이므로 대기를 유지한다
        // (여기서 풀어 버리면 handleTap이 연결할 시작점을 잃어 탭으로는 선이 안 이어졌다).
        // 다른 시작점을 누른 경우는 handleTap의 arm()이, 끌기를 시작한 경우는 pointermove가 대기를 정리한다.

        pressCard = card;
        pressPoint = { x: event.clientX, y: event.clientY };
        dragRole = null;
        pointerId = event.pointerId;
        card.setPointerCapture(pointerId);
      });

      card.addEventListener('pointermove', (event) => {
        if (pressCard !== card || event.pointerId !== pointerId) return;
        const dx = event.clientX - pressPoint.x;
        const dy = event.clientY - pressPoint.y;

        if (!dragRole) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          dragRole = card.dataset.lineRole;

          // 탭으로 대기 중이던 다른 카드가 있으면 끌기를 시작하며 그 대기부터 해제
          if (armed && armed !== card) {
            armed.classList.remove('is-armed');
            armed = null;
          }

          // 이미 선이 이어진 카드를 다시 끌기 시작하면, 기존 실선과 새 미리보기 선이
          // 동시에 보이지 않도록 기존 선부터 지우고 미리보기만 남김
          if (dragRole === 'start') {
            if (connections.has(card)) disconnectStart(card);
          } else {
            connections.forEach((e, s) => { if (e === card) disconnectStart(s); });
          }
          redraw();

          dragLine = beginDragPreview(card);
        }

        event.preventDefault();
        const p = svgPoint(event);
        dragLine.setAttribute('x2', p.x);
        dragLine.setAttribute('y2', p.y);
        dragGradient?.setAttribute('x2', p.x);
        dragGradient?.setAttribute('y2', p.y);

        const targetRole = dragRole === 'start' ? 'end' : 'start';
        const hover = cardUnderPoint(event, targetRole);
        if (hover !== hoverTarget) {
          hoverTarget?.classList.remove('is-drag-over');
          hover?.classList.add('is-drag-over');
          hoverTarget = hover;
        }
      });

      card.addEventListener('pointerup', (event) => {
        if (pressCard !== card || event.pointerId !== pointerId) return;
        card.releasePointerCapture(pointerId);

        if (dragRole) {
          const target = cardUnderPoint(event, dragRole === 'start' ? 'end' : 'start');
          if (target) {
            if (dragRole === 'start') connect(card, target);
            else connect(target, card);
          }
          stopDrag();
        } else {
          handleTap(card);
        }

        pressCard = null;
        dragRole = null;
      });

      card.addEventListener('pointercancel', (event) => {
        if (pressCard !== card || event.pointerId !== pointerId) return;
        stopDrag();
        pressCard = null;
        dragRole = null;
      });
    });

    root.closest('.group-mcq')?.querySelector('.question-action-btn-secondary')
      ?.addEventListener('click', () => {
        armed?.classList.remove('is-armed');
        armed = null;
        [...connections.keys()].forEach(disconnectStart);
        redraw();
      });

    // 팝업 예시처럼 이 root가 통째로 교체되는 경우가 있어, 떨어져 나간 노드의 리스너는 스스로 걷어낸다.
    const onResize = () => {
      if (!root.isConnected) {
        window.removeEventListener('resize', onResize);
        return;
      }
      redraw();
    };
    window.addEventListener('resize', onResize);

    // 선은 그리는 순간의 점 좌표로 고정되므로, 창 크기가 그대로여도 이미지·폰트 로딩이나 수식 렌더링으로
    // 카드가 움직이면 선이 예전 자리에 남아 다른 카드를 가리키는 것처럼 보인다. 카드·영역 크기가 바뀌면 다시 그린다.
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => {
        if (!root.isConnected) {
          observer.disconnect();
          return;
        }
        // 끄는 중에는 redraw가 미리보기 선까지 지우므로 건너뛴다(놓을 때 connect가 다시 그린다)
        if (connections.size && !dragLine) redraw();
      });
      observer.observe(root);
      cards.forEach((card) => observer.observe(card));
    }

    // 안내 팝업 데모가 실제 선 그리기를 그대로 쓰기 위한 통로.
    // begin()이 미리보기 선을 만들고, to()로 끝점을 손끝까지 따라 옮기다가 drop()에서 확정한다.
    root.demoLine = {
      begin(startCard) {
        const line = beginDragPreview(startCard);
        const move = (clientX, clientY) => {
          const p = svgPoint({ clientX, clientY });
          line.setAttribute('x2', p.x);
          line.setAttribute('y2', p.y);
          dragGradient?.setAttribute('x2', p.x);
          dragGradient?.setAttribute('y2', p.y);
        };
        const clear = () => {
          startCard.classList.remove('is-armed');
          dragLine = line;
          stopDrag();
        };
        return {
          to: move,
          drop(endCard) {
            clear();
            if (endCard) connect(startCard, endCard);
          },
          cancel: clear,
        };
      },
      dotCenterClient(card) {
        const dot = card.querySelector('.line-match-node-dot').getBoundingClientRect();
        return { x: dot.left + dot.width / 2, y: dot.top + dot.height / 2 };
      },
    };

    // 제출 시점에 현재 연결 상태를 읽어가기 위한 용도(question-submit-wiring.js)
    root.getConnections = () => [...connections.entries()].map(([startCard, endCard]) => ({
      itemId: Number(startCard.dataset.lineId),
      targetId: Number(endCard.dataset.lineId),
    }));
  }

  window.initLineMatch = initLineMatch;
})();
