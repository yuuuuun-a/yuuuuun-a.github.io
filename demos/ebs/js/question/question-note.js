(function () {

  // 문항 카드 위에 덮이는 연습장(필기 캔버스).
  // 여닫는 상태는 .note-pad의 hidden 속성 하나로만 나타낸다 — 버튼 아이콘(연필/X)과 도구 바는 거기에 맞춰 따라간다.
  //
  // 획은 비트맵이 아니라 "0~1 비율 좌표 배열"로 들고 있는다. 레이아웃이 vw() 기반이라 창 크기가 바뀌면
  // 캔버스 픽셀 크기도 같이 바뀌는데, 비트맵만 갖고 있으면 그때 필기가 늘어지거나 날아간다.
  // 그래서 그릴 때는 방금 늘어난 선분만 이어 그리고(매번 전체를 다시 그리면 획이 길어질수록 느려진다),
  // 크기가 바뀔 때만 저장해 둔 획을 처음부터 다시 그린다.
  // 지우개는 같은 획 목록에 destination-out으로 섞어 두기 때문에 다시 그려도 지운 자리가 그대로 남는다.
  function initQuestionNote() {
    const pad = document.querySelector('[data-note-pad]');
    const toggle = document.querySelector('[data-note-toggle]');
    const canvas = pad && pad.querySelector('[data-note-canvas]');
    if (!pad || !toggle || !canvas) return;

    const toolbar = document.querySelector('[data-note-tool]');
    const cursor = pad.querySelector('[data-note-cursor]');
    const ctx = canvas.getContext('2d');

    // 커서 요소를 실제로 쓸 때만 기본 커서를 끈다 — 이 스크립트가 안 돌면 CSS 커서가 그대로 보인다
    if (cursor) pad.classList.add('note-pad-cursor');

    // 선 굵기는 설계 폭(연습장 구멍 908px) 기준 값이라, 실제 캔버스 픽셀 폭에 맞춰 늘려 쓴다
    const DESIGN_PAD_WIDTH = 908;
    const PEN_COLOR = '#000';
    const PEN_WIDTH = 4;
    const ERASER_WIDTH = 24;

    const strokes = [];
    let stroke = null;
    let tool = 'pen';

    const isOpen = () => !pad.hasAttribute('hidden');

    function resize() {
      const rect = pad.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width === width && canvas.height === height) return;

      canvas.width = width;
      canvas.height = height;
      redraw();
    }

    function applyTool(name) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = name === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = PEN_COLOR;
      ctx.fillStyle = PEN_COLOR;
      ctx.lineWidth = (name === 'eraser' ? ERASER_WIDTH : PEN_WIDTH) * (canvas.width / DESIGN_PAD_WIDTH);
    }

    // 점 하나만 찍고 뗀 경우엔 선이 안 그려져서 같은 굵기의 원으로 대신 찍는다
    function drawDot(point) {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawSegment(from, to) {
      ctx.beginPath();
      ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
      ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
      ctx.stroke();
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokes.forEach((item) => {
        applyTool(item.tool);
        if (item.points.length === 1) {
          drawDot(item.points[0]);
          return;
        }
        for (let i = 1; i < item.points.length; i += 1) {
          drawSegment(item.points[i - 1], item.points[i]);
        }
      });
    }

    function toPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
    }

    // 커서 그림 안에서 점이 (3, 3)에 있다 — 그 점이 포인터 자리에 오도록 당겨 놓는다.
    // x, y는 연습장 구멍 왼쪽 위 기준 CSS px.
    function placeCursor(x, y, inside) {
      if (!cursor) return;
      cursor.classList.toggle('note-cursor-visible', inside);
      if (!inside) return;

      const scale = cursor.offsetWidth / 32;
      cursor.style.transform = 'translate(' + (x - 3 * scale) + 'px, ' + (y - 3 * scale) + 'px)';
    }

    // 구멍 밖으로 나가면 숨긴다(필기 중 드래그로 빠져나갔을 때도 마찬가지).
    function moveCursor(event) {
      const rect = pad.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      placeCursor(x, y, x >= 0 && y >= 0 && x <= rect.width && y <= rect.height);
    }

    canvas.addEventListener('pointerenter', moveCursor);
    canvas.addEventListener('pointerleave', () => cursor?.classList.remove('note-cursor-visible'));

    canvas.addEventListener('pointerdown', (event) => {
      if (!isOpen()) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      moveCursor(event);
      pad.classList.add('note-pad-writing');

      const point = toPoint(event);
      stroke = { tool: tool, points: [point] };
      strokes.push(stroke);
      applyTool(tool);
      drawDot(point);
    });

    canvas.addEventListener('pointermove', (event) => {
      moveCursor(event);
      if (!stroke) return;
      const point = toPoint(event);
      const previous = stroke.points[stroke.points.length - 1];
      stroke.points.push(point);
      applyTool(stroke.tool);
      drawSegment(previous, point);
    });

    const endStroke = () => {
      stroke = null;
      pad.classList.remove('note-pad-writing');
    };
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    // 도구가 바뀌면 커서 모양(연필/지우개)도 같이 바뀌어야 해서 .note-pad에 상태를 남긴다
    function syncTools() {
      pad.classList.toggle('note-pad-eraser', tool === 'eraser');
      if (!toolbar) return;
      toolbar.querySelectorAll('[data-note-tool-btn]').forEach((button) => {
        const name = button.dataset.noteToolBtn;
        if (name === 'clear') return;
        button.classList.toggle('note-tool-btn-selected', name === tool);
        button.setAttribute('aria-pressed', String(name === tool));
      });
    }

    function clearAll() {
      strokes.length = 0;
      endStroke();
      redraw();
    }

    function setTool(name) {
      tool = name;
      syncTools();
    }

    if (toolbar) {
      toolbar.querySelectorAll('[data-note-tool-btn]').forEach((button) => {
        button.addEventListener('click', () => {
          const name = button.dataset.noteToolBtn;
          if (name === 'clear') clearAll();
          else setTool(name);
        });
      });
    }

    // 여닫힌 상태는 .note-pad의 hidden 하나가 기준이고, 도구 바·버튼 아이콘·캔버스 크기는 거기 맞춰 따라간다.
    // 온보딩처럼 이 모듈을 거치지 않고 hidden만 건드려 여는 쪽이 있어서 속성 변화도 같이 지켜본다
    // (question-info-popup.js가 안내 팝업을 다루는 방식과 같다).
    function syncOpen() {
      const open = isOpen();
      if (toolbar) toolbar.toggleAttribute('hidden', !open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        resize();
        return;
      }
      endStroke();
      cursor?.classList.remove('note-cursor-visible');
    }

    new MutationObserver(syncOpen).observe(pad, { attributes: true, attributeFilter: ['hidden'] });

    function setOpen(open) {
      pad.toggleAttribute('hidden', !open);
      syncOpen();
    }

    // 어두운 부분(캔버스 밖)은 커서가 X로 바뀌고, 누르면 오른쪽 X 버튼과 똑같이 연습장이 닫힌다
    pad.querySelector('[data-note-close]')?.addEventListener('click', () => setOpen(false));

    toggle.addEventListener('click', () => {
      const open = !isOpen();
      // 안내 팝업과 겹쳐 뜨면 둘 다 못 쓰니 연습장을 열 때는 팝업을 닫아 둔다
      if (open) document.querySelector('[data-question-info-popup]')?.setAttribute('hidden', '');
      setOpen(open);
    });

    window.addEventListener('resize', () => {
      if (isOpen()) resize();
    });

    // 한 획을 좌표를 따라 "그려 나가는" 시연용 조작구. 온보딩(question-note-demo.js)만 쓴다.
    // points는 필기 데이터와 같은 0~1 비율 좌표이고, duration이 0이면 애니메이션 없이 한 번에 긋는다.
    // 속도를 고르게 하려고 진행도는 시간이 아니라 실제 픽셀 길이(누적 거리) 기준으로 나눈다.
    // alive()가 false를 주면(스텝을 벗어남) 그 자리에서 멈춘다.
    function playStroke(name, points, duration, alive) {
      const item = { tool: name, points: [points[0]] };
      strokes.push(item);
      pad.classList.add('note-pad-writing');

      const rect = pad.getBoundingClientRect();
      const at = (point) => placeCursor(point.x * rect.width, point.y * rect.height, true);

      const extend = (point) => {
        const previous = item.points[item.points.length - 1];
        item.points.push(point);
        applyTool(name);
        drawSegment(previous, point);
        at(point);
      };

      applyTool(name);
      drawDot(points[0]);
      at(points[0]);

      const spans = [];
      let total = 0;
      for (let i = 1; i < points.length; i += 1) {
        const dx = (points[i].x - points[i - 1].x) * rect.width;
        const dy = (points[i].y - points[i - 1].y) * rect.height;
        const length = Math.sqrt(dx * dx + dy * dy);
        spans.push(length);
        total += length;
      }

      if (!duration || !total) {
        points.slice(1).forEach(extend);
        pad.classList.remove('note-pad-writing');
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const started = performance.now();
        let index = 1;

        const step = (now) => {
          if (alive && !alive()) {
            pad.classList.remove('note-pad-writing');
            resolve();
            return;
          }

          const progress = Math.min(1, (now - started) / duration);
          let walked = progress * total;

          // 지나온 꼭짓점은 그대로 찍고, 마지막 한 칸만 비율로 잘라 그린다
          while (index < points.length && walked >= spans[index - 1]) {
            walked -= spans[index - 1];
            extend(points[index]);
            index += 1;
          }

          if (index < points.length && spans[index - 1]) {
            const t = walked / spans[index - 1];
            const from = points[index - 1];
            const to = points[index];
            at({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
          }

          if (progress < 1) {
            requestAnimationFrame(step);
            return;
          }
          pad.classList.remove('note-pad-writing');
          resolve();
        };

        requestAnimationFrame(step);
      });
    }

    window.questionNote = {
      setTool: setTool,
      clear: clearAll,
      playStroke: playStroke,
      hideCursor: () => cursor?.classList.remove('note-cursor-visible'),
    };

    setOpen(false);
    syncTools();
  }

  window.initQuestionNote = initQuestionNote;
})();
