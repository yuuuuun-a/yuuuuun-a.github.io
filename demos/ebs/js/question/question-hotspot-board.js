(function () {

  // 서버(fitBoardSize)가 x/y 비율대로 700x480 디자인 단위 안에 맞춘 좌표평면(.hotspot-board) 크기가
  // 실제 .question-body 남은 공간(좌측 스템 사진 + gap 제외)보다 크면, 가로·세로를 같은 배율로 줄여
  // 비율을 유지한 채 최대 넓이/높이에 딱 맞춘다. CSS max-width:100%만으로는 넓이만 줄고 높이는 그대로라
  // 비율이 깨지고, 높이 쪽은 아예 막아주는 게 없어서 JS로 실측한다. 창 크기가 바뀌면 다시 잰다.
  const DESIGN_WIDTH = 1024;

  // 좌측 스템 사진(.hotspot-photo)은 폭 240 디자인 단위 고정, 비율은 이미지 원본 비율에 가장 가까운
  // 1:1 / 4:3 / 16:9 중 하나로 맞춘다(이미지는 object-fit: contain으로 박스 안에 들어감). 그 높이가
  // .question-body 높이를 넘으면 같은 비율로 폭까지 줄인다.
  const PHOTO_WIDTH_UNITS = 240;

  // x·y 화살표 축. 값이 0인 굵은 격자선(.hotspot-grid-line-bold) 위에 그린다. 0이 범위 밖이라 굵은 선이
  // 없으면 x축은 아래 끝, y축은 왼쪽 끝. 화살표는 전부 선에 붙은 반쪽 삼각형(12x9)이고, 선·글자는 보드 버전 클래스로 갈린다.
  //  - 기본(Figma 3519:266111): 글로우 있는 2px 선, x·y 글자는 화살표 옆
  //  - v1/v2(Figma 4142:151027, 4149:155355): 글로우 없는 2px 선
  // 전부 .hotspot-board-plot 기준이고, 숫자는 디자인 단위(1024 기준)라 unit을 곱해 px로 바꿔 쓴다.
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const AXIS_COLOR = '#78E9FF';
  const AXIS_WIDTH = 2;
  let axisUid = 0;
  const PHOTO_RATIOS = [
    { value: 1, css: '1 / 1' },
    { value: 4 / 3, css: '4 / 3' },
    { value: 16 / 9, css: '16 / 9' },
  ];

  // --wrap-width는 min(100vw, 100dvh * 4 / 3) 같은 calc라 getComputedStyle로는 px이 안 나온다 —
  // 임시 요소에 그대로 걸어서 잰다(공식을 JS에 중복으로 옮겨 적지 않기 위함).
  function wrapWidthPx() {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:var(--wrap-width);height:0';
    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }

  function contentWidth(el, style) {
    return el.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
  }

  function contentHeight(el, style) {
    return el.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
  }

  // 가로/세로 비를 로그로 비교해서 가장 가까운 비율을 고른다(4:3과 16:9 사이 같은 애매한 값도 대칭으로 판정).
  // 세로로 긴 이미지는 전부 1:1이 제일 가깝게 나온다.
  function closestPhotoRatio(img) {
    const ratio = img.naturalWidth / img.naturalHeight;
    return PHOTO_RATIOS.reduce((best, r) =>
      Math.abs(Math.log(ratio / r.value)) < Math.abs(Math.log(ratio / best.value)) ? r : best);
  }

  function fitHotspotPhoto(photo, unit) {
    const img = photo.querySelector('.hotspot-photo-img');
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    const ratio = closestPhotoRatio(img);
    photo.style.aspectRatio = ratio.css;
    photo.dataset.photoRatio = ratio.css.replace(/\s/g, '');

    const naturalW = PHOTO_WIDTH_UNITS * unit;
    const body = photo.closest('.question-body');
    const availH = body ? contentHeight(body, getComputedStyle(body)) : 0;
    const width = availH > 0 ? Math.min(naturalW, availH * ratio.value) : naturalW;
    photo.style.width = `${width}px`;
  }

  function fitHotspotBoard(board, unit) {
    const body = board.closest('.question-body');
    const unitW = Number(board.dataset.boardW);
    const unitH = Number(board.dataset.boardH);
    if (!body || !unitW || !unitH) return;

    const naturalW = unitW * unit;
    const naturalH = unitH * unit;

    // 먼저 원래 크기로 되돌린 뒤에 잰다 — 이미 줄여둔 상태로 재면 shrink-to-fit 조상이 그만큼 좁게
    // 굳어 있어서, 창을 다시 키워도 원래 크기로 못 돌아온다.
    board.style.width = `${naturalW}px`;
    board.style.height = `${naturalH}px`;

    const bodyStyle = getComputedStyle(body);
    const gap = parseFloat(bodyStyle.columnGap) || 0;
    const photo = body.querySelector('.hotspot-photo');
    const photoW = photo ? photo.getBoundingClientRect().width + gap : 0;

    const availW = contentWidth(body, bodyStyle) - photoW;
    const availH = contentHeight(body, bodyStyle);
    if (availW <= 0 || availH <= 0) return;

    const scale = Math.min(1, availW / naturalW, availH / naturalH);
    if (scale >= 1) return;

    board.style.width = `${naturalW * scale}px`;
    board.style.height = `${naturalH * scale}px`;
  }

  // 굵은 격자선의 인라인 left/top(%) — 서버가 값 0 자리에만 bold를 준다. 없으면 fallback(%).
  function zeroPercent(plot, selector, prop, fallback) {
    const line = plot.querySelector(selector);
    const value = line ? parseFloat(line.style[prop]) : NaN;
    return Number.isFinite(value) ? value : fallback;
  }

  function isEdgeAxis(board) {
    return board.classList.contains('hotspot-board-v1') || board.classList.contains('hotspot-board-v2');
  }

  function buildAxisSvg(w, h, cx, cy, unit, uid, edge) {
    const u = (v) => v * unit;
    const glowId = `hotspot-board-axis-glow-${uid}`;
    const stroke = `stroke="${AXIS_COLOR}" stroke-width="${u(AXIS_WIDTH)}" fill="none"`;

    const arrows = `<path d="M${w - u(6)} ${cy - u(1)}L${w + u(6)} ${cy - u(1)}L${w - u(6)} ${cy + u(8)}Z" fill="${AXIS_COLOR}" />
      <path d="M${cx + u(1)} ${-u(4)}L${cx + u(1)} ${u(8)}L${cx - u(8)} ${u(8)}Z" fill="${AXIS_COLOR}" />`;

    const filter = edge ? '' : `<defs>
      <filter id="${glowId}" filterUnits="userSpaceOnUse" x="${-u(20)}" y="${-u(20)}" width="${w + u(40)}" height="${h + u(40)}" color-interpolation-filters="sRGB">
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <feGaussianBlur stdDeviation="${u(4)}" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix values="0 0 0 0 0.32549 0 0 0 0 0.917647 0 0 0 0 0.992157 0 0 0 0.4 0" />
        <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="glow" />
        <feBlend in="SourceGraphic" in2="glow" />
      </filter>
    </defs>`;

    return `<svg class="hotspot-axis-lines" viewBox="0 0 ${w} ${h}" width="100%" height="100%" xmlns="${SVG_NS}" style="pointer-events:none;overflow:visible" aria-hidden="true" focusable="false">
    ${filter}
    <g${edge ? '' : ` filter="url(#${glowId})"`}>
      <line x1="0" y1="${cy}" x2="${w}" y2="${cy}" ${stroke} />
      <line x1="${cx}" y1="${h}" x2="${cx}" y2="0" ${stroke} />
    </g>
    ${arrows}
  </svg>`;
  }

  function drawHotspotBoardAxis(board, unit) {
    const plot = board.querySelector('.hotspot-board-plot');
    if (!plot) return;

    const w = plot.clientWidth;
    const h = plot.clientHeight;
    if (!w || !h) return;

    const edge = isEdgeAxis(board);
    const cx = (zeroPercent(plot, '.hotspot-grid-line-x.hotspot-grid-line-bold', 'left', 0) / 100) * w;
    const cy = (zeroPercent(plot, '.hotspot-grid-line-y.hotspot-grid-line-bold', 'top', 100) / 100) * h;
    plot.querySelectorAll('.hotspot-axis-lines, .hotspot-axis-label').forEach((el) => el.remove());

    const firstLayer = plot.querySelector('.hotspot-connect-lines, .hotspot-point, .hotspot-axis-ticks');
    const svg = buildAxisSvg(w, h, cx, cy, unit, axisUid++, edge);
    if (firstLayer) firstLayer.insertAdjacentHTML('beforebegin', svg);
    else plot.insertAdjacentHTML('beforeend', svg);

    const label = (axis, x, y) => {
      const el = document.createElement('i');
      el.className = `hotspot-axis-label hotspot-axis-label-${axis}`;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.textContent = axis;
      plot.appendChild(el);
    };
    if (edge) {
      label('x', w + 12 * unit, cy - 3 * unit);
      label('y', cx + 3 * unit, -12 * unit);
    } else {
      label('x', w + 12 * unit, cy);
      label('y', cx + 3 * unit, -12 * unit);
    }
  }

  // 사진 폭이 정해져야 보드가 쓸 수 있는 남는 폭이 나오므로 사진 → 보드 순서로 맞춘다.
  // 축은 보드 크기가 확정된 뒤에 그 px 크기로 그린다.
  function fitAllHotspot() {
    const photos = document.querySelectorAll('.question-hotspot .hotspot-photo');
    const boards = document.querySelectorAll('.hotspot-board[data-board-w]:not(.hotspot-board-number-line)');
    if (!photos.length && !boards.length) return;

    const unit = wrapWidthPx() / DESIGN_WIDTH;
    if (!unit) return;
    photos.forEach((photo) => fitHotspotPhoto(photo, unit));
    boards.forEach((board) => fitHotspotBoard(board, unit));
    boards.forEach((board) => drawHotspotBoardAxis(board, unit));
  }

  // 연결선 points가 비어 있으면 고정점(select_flag=0)을 마크업 순서대로 이어 미리 채워 둔다. 보이는지는 CSS(v2·v4)가 정해서,
  // 개발자도구에서 나중에 v4 클래스를 붙여도 선이 바로 보인다.
  // 점 위치가 이미 퍼센트(left/top)라 viewBox 0~100 polyline에 그대로 넣으면 되고, 창 크기와 무관해 한 번만 한다.
  // 대칭의 중심(라벨 O·ㅇ)은 도형 꼭짓점이 아니라서 잇지 않는다.
  const CONNECT_SKIP_LABELS = ['O', 'o', 'ㅇ'];

  function connectFixedPoints() {
    document.querySelectorAll('.hotspot-board').forEach((board) => {

      const polyline = board.querySelector('.hotspot-connect-lines polyline');
      if (!polyline || (polyline.getAttribute('points') || '').trim()) return;

      const coords = [...board.querySelectorAll('.hotspot-point-fixed:not(.hotspot-point-pub):not(.hotspot-point-pub-v2)')]
        .filter((point) => !CONNECT_SKIP_LABELS.includes(point.querySelector('.hotspot-point-label')?.textContent.trim()))
        .map((point) => [parseFloat(point.style.left), parseFloat(point.style.top)])
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      if (coords.length < 2) return;

      polyline.setAttribute('points', coords.map(([x, y]) => `${x},${y}`).join(' '));
    });
  }

  // v2·v4 모눈. 눈금 라벨은 실제 좌표를 100으로 나눈 값이라(서버 xAxisTicks) 라벨 1 = 좌표 100 = 한 칸으로 보고,
  // 두 눈금 사이 라벨 차이/퍼센트 차이로 전체 가로 칸 수를, 보드 가로세로 비로 세로 칸 수를 구한다.
  // CSS 배경 타일(background-size 퍼센트)은 칸 폭이 소수 px이면 칸마다 반올림돼 오른쪽으로 갈수록 점과 어긋나서,
  // viewBox 0~100 SVG에 선을 정확한 퍼센트 위치로 하나씩 긋는다. 기준은 첫 점의 위치 — 점이 좌표 100의 배수가 아니라
  // 50 어긋난 자리(예: y 범위 0~1100에 y=450, 550)에 놓이는 문항이 있어서, 서버 격자선(100의 배수) 기준으로 그으면
  // 점이 전부 반 칸씩 어긋났다. 점이 없으면 서버 격자선을 기준으로 한다. 테두리가 격자와 안 맞으면 반 칸이 생기지 않게
  // 테두리 선은 긋지 않는다(격자가 반 칸 안쪽에서 끝남).
  // 보이는지는 CSS(v2·v4)가 정한다.
  // 칸 수는 보드에 style="--hotspot-cols: 20; --hotspot-rows: 10"을 직접 주면 그 값을 쓰고, 계산이 안 되거나
  // 너무 많으면(MAX_DENSE_CELLS 초과) 20x10.
  const MAX_DENSE_CELLS = 40;
  const DENSE_DEFAULT = [20, 10];

  function denseCells(board) {
    const inlineCols = parseFloat(board.style.getPropertyValue('--hotspot-cols'));
    const inlineRows = parseFloat(board.style.getPropertyValue('--hotspot-rows'));
    if (inlineCols > 0 && inlineRows > 0) return [inlineCols, inlineRows];

    const ticks = [...board.querySelectorAll('.hotspot-axis-tick')]
      .map((tick) => [parseFloat(tick.style.left), parseFloat(tick.textContent)])
      .filter(([pos, value]) => Number.isFinite(pos) && Number.isFinite(value));
    if (ticks.length < 2) return DENSE_DEFAULT;

    const [p0, v0] = ticks[0];
    const [p1, v1] = ticks[ticks.length - 1];
    if (p1 === p0) return DENSE_DEFAULT;
    const cols = Math.round(((v1 - v0) / (p1 - p0)) * 100);
    const rows = Math.round(cols * Number(board.dataset.boardH) / Number(board.dataset.boardW));
    if (!(cols > 0 && rows > 0) || cols > MAX_DENSE_CELLS || rows > MAX_DENSE_CELLS) return DENSE_DEFAULT;
    return [cols, rows];
  }

  function gridPositions(anchor, count) {
    const step = 100 / count;
    // 28.5714 % 4.7619처럼 나누어떨어져야 할 값이 부동소수 오차로 step 직전(4.7618)이 나오면 0번 선이 빠지므로 0으로 본다.
    const rest = ((anchor % step) + step) % step;
    const start = step - rest < 0.001 ? 0 : rest;
    const list = [];
    for (let pos = start; pos <= 100 + 0.001; pos += step) list.push(Math.min(pos, 100));
    return list;
  }

  function drawDenseGrid() {
    document.querySelectorAll('.hotspot-board[data-board-w]').forEach((board) => {
      const plot = board.querySelector('.hotspot-board-plot');
      if (!plot) return;

      const [cols, rows] = denseCells(board);
      const point = board.querySelector('.hotspot-point');
      const xAnchor = parseFloat(point?.style.left ?? board.querySelector('.hotspot-grid-line-x')?.style.left) || 0;
      const yAnchor = parseFloat(point?.style.top ?? board.querySelector('.hotspot-grid-line-y')?.style.top) || 0;

      const xs = gridPositions(xAnchor, cols);
      const ys = gridPositions(yAnchor, rows);
      const [xFirst, xLast] = [xs[0], xs[xs.length - 1]];
      const [yFirst, yLast] = [ys[0], ys[ys.length - 1]];
      const lines = [
        ...xs.map((x) => `<line x1="${x}" y1="${yFirst}" x2="${x}" y2="${yLast}" />`),
        ...ys.map((y) => `<line x1="${xFirst}" y1="${y}" x2="${xLast}" y2="${y}" />`),
      ];

      plot.querySelector('.hotspot-dense-grid')?.remove();
      plot.insertAdjacentHTML('afterbegin', `<svg class="hotspot-dense-grid" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="${SVG_NS}" aria-hidden="true" focusable="false">${lines.join('')}</svg>`);
    });
  }

  // v6 그래프 직선·v7 도형 변. 마크업의 data-from/data-to/data-at/data-points는 실제 좌표(눈금 숫자 기준)라서, x 눈금(.hotspot-axis-tick)과
  // y 눈금(.hotspot-axis-tick-y)의 첫·끝 두 개로 좌표 → 퍼센트 환산식을 만든다. 퍼센트라 창 크기와 무관해 한 번만 한다.
  function axisScale(ticks, prop) {
    const list = [...ticks]
      .map((tick) => [parseFloat(tick.textContent), parseFloat(tick.style[prop])])
      .filter(([value, pos]) => Number.isFinite(value) && Number.isFinite(pos));
    if (list.length < 2) return null;
    const [v0, p0] = list[0];
    const [v1, p1] = list[list.length - 1];
    if (v1 === v0) return null;
    return (value) => p0 + ((value - v0) * (p1 - p0)) / (v1 - v0);
  }

  function drawGraphLines() {
    document.querySelectorAll('.hotspot-board').forEach((board) => {
      const toX = axisScale(board.querySelectorAll('.hotspot-axis-tick'), 'left');
      const toY = axisScale(board.querySelectorAll('.hotspot-axis-tick-y'), 'top');
      if (!toX || !toY) return;

      const parse = (text) => (text || '').split(',').map((v) => parseFloat(v));

      board.querySelectorAll('.hotspot-graph-lines line[data-from][data-to]').forEach((line) => {
        const [x1, y1] = parse(line.dataset.from);
        const [x2, y2] = parse(line.dataset.to);
        if (![x1, y1, x2, y2].every(Number.isFinite)) return;
        line.setAttribute('x1', toX(x1));
        line.setAttribute('y1', toY(y1));
        line.setAttribute('x2', toX(x2));
        line.setAttribute('y2', toY(y2));
      });

      board.querySelectorAll('.hotspot-coord-lines polyline[data-points]').forEach((polyline) => {
        const coords = polyline.dataset.points.trim().split(/\s+/).map(parse);
        if (coords.length < 2 || !coords.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))) return;
        polyline.setAttribute('points', coords.map(([x, y]) => `${toX(x)},${toY(y)}`).join(' '));
      });

      board.querySelectorAll('.hotspot-graph-label[data-at]').forEach((label) => {
        const [x, y] = parse(label.dataset.at);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        label.style.left = `${toX(x)}%`;
        label.style.top = `${toY(y)}%`;
      });
    });
  }

  function initHotspotBoardFit() {
    if (!document.querySelector('.question-hotspot .hotspot-photo, .hotspot-board[data-board-w]')) return;

    connectFixedPoints();
    drawDenseGrid();
    drawGraphLines();
    fitAllHotspot();

    // 이미지 원본 크기는 로드가 끝나야 알 수 있다.
    document.querySelectorAll('.question-hotspot .hotspot-photo-img').forEach((img) => {
      img.addEventListener('load', fitAllHotspot);
    });

    let frame = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fitAllHotspot);
    });
  }

  window.initHotspotBoardFit = initHotspotBoardFit;
})();
