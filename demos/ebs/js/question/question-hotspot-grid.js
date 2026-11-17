(function () {

  const SVG_NS = 'http://www.w3.org/2000/svg';


  // [선] 격자 칸 수
  //   COLS = 가로로 몇 칸으로 나눌지 → 세로선( | ) 이 그만큼 그려진다. 8칸이면 x 범위는 -4 ~ 4
  //   ROWS = 세로로 몇 칸으로 나눌지 → 가로선( ─ ) 이 그만큼 그려진다. 6칸이면 y 범위는 -3 ~ 3
  //   0을 넣으면 그 방향 선은 안 그린다 (가로선만, 세로선만 쓰고 싶을 때)
  const HOTSPOT_GRID_COLS = 10;
  const HOTSPOT_GRID_ROWS = 6;

  // [버튼] 좌표 지점. 원점(x축·y축이 교차하는 보드 한가운데) 기준 [x, y] 를 적으면 그 자리에 버튼이 생긴다
  //   예) [0, -3] → 원점에서 아래로 3칸 / [-3, 1] → 왼쪽 3칸, 위로 1칸
  //   개수 제한 없고, 빈 배열([])이면 버튼을 만들지 않는다
  const HOTSPOT_POINTS = [
    [0, 3],
    [2, 3],
    [-3, 1],
    [3, 1],
    [-1, -3],
  ];

  // 처음부터 선택된(초록 발광) 상태로 보여줄 좌표. 화면 확인용이고, 필요 없으면 null
  const HOTSPOT_SELECTED = [-3, 1];

  // ─────────────────────────────────────────────────────────────

  const HOTSPOT_GRID_W = 400;
  const HOTSPOT_GRID_H = 306;
  const HOTSPOT_GRID_LINE = 1;
  const HOTSPOT_GRID_COLOR = 'rgba(255, 255, 255, 0.4)';
  const HOTSPOT_MARKER = '../img/question/hotspot/hotspot-marker.png';

  // 축이 보드 밖으로 나오는 길이. 줄이면 X·Y 끝이 보드 쪽으로 당겨진다(0이면 보드 모서리에 딱 맞춤)
  const HOTSPOT_AXIS_OVER = 30;
  // x·y 글자가 화살표 끝에서 떨어지는 거리
  const HOTSPOT_AXIS_LABEL_GAP_X = 16;
  const HOTSPOT_AXIS_LABEL_GAP_Y = 14;
  const HOTSPOT_AXIS_WIDTH = 4;
  const HOTSPOT_AXIS_HEAD = 12;

  let hotspotUid = 0;

  // .hotspot-grid와 보드의 실제 크기를 재서 보드 설계 단위(400x306)로 환산한다.
  // SCSS에서 여백이나 보드 위치를 바꿔도 여기 숫자를 고칠 필요가 없다
  function hotspotGeometry(grid, board) {
    const gridRect = grid.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    if (!gridRect.width || !boardRect.width) return null;

    const style = getComputedStyle(board);
    const borderL = parseFloat(style.borderLeftWidth) || 0;
    const borderR = parseFloat(style.borderRightWidth) || 0;
    const borderT = parseFloat(style.borderTopWidth) || 0;
    const borderB = parseFloat(style.borderBottomWidth) || 0;

    const innerW = boardRect.width - borderL - borderR;
    const innerH = boardRect.height - borderT - borderB;
    const scale = HOTSPOT_GRID_W / innerW;

    return {
      gridRect,
      innerW,
      innerH,
      w: gridRect.width * scale,
      h: gridRect.height * scale,
      x: (boardRect.left - gridRect.left + borderL) * scale,
      y: (boardRect.top - gridRect.top + borderT) * scale,
    };
  }

  // 그라디언트·글로우는 axis-line-x.svg / axis-line-y.svg에서 그대로 옮겨왔다.
  // 꼬리 쪽이 하늘색(#78E9FF) → 가운데 흰색 → 화살표 쪽이 진한 파랑(#215489)
  function buildHotspotAxisSvg(geo, uid) {
    const cx = geo.x + HOTSPOT_GRID_W / 2;
    const cy = geo.y + HOTSPOT_GRID_H / 2;
    const xFrom = geo.x - HOTSPOT_AXIS_OVER;
    const xTo = geo.x + HOTSPOT_GRID_W + HOTSPOT_AXIS_OVER;
    const yFrom = geo.y + HOTSPOT_GRID_H + HOTSPOT_AXIS_OVER;
    const yTo = geo.y - HOTSPOT_AXIS_OVER;

    const g = (name) => `hotspot-axis-${name}-${uid}`;
    const grad = (id, x1, y1, x2, y2) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#78E9FF" /><stop offset="0.5" stop-color="#FFFFFF" />
        <stop offset="0.8" stop-color="#78E9FF" /><stop offset="1" stop-color="#215489" />
      </linearGradient>`;

    const head = HOTSPOT_AXIS_HEAD;
    const stroke = `stroke-width="${HOTSPOT_AXIS_WIDTH}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

    return `<svg class="hotspot-axis-lines" viewBox="0 0 ${geo.w} ${geo.h}" width="100%" height="100%" xmlns="${SVG_NS}" style="pointer-events:none;overflow:visible" aria-hidden="true" focusable="false">
    <defs>
      ${grad(g('grad-x'), xFrom, cy, xTo, cy)}
      ${grad(g('grad-y'), cx, yFrom, cx, yTo)}
      <filter id="${g('glow')}" filterUnits="userSpaceOnUse" x="-50" y="-50" width="${geo.w + 100}" height="${geo.h + 100}" color-interpolation-filters="sRGB">
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <feGaussianBlur stdDeviation="4" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix values="0 0 0 0 0.32549 0 0 0 0 0.917647 0 0 0 0 0.992157 0 0 0 0.4 0" />
        <feBlend mode="plus-lighter" in2="BackgroundImageFix" result="glow" />
        <feBlend in="SourceGraphic" in2="glow" />
      </filter>
    </defs>
    <g filter="url(#${g('glow')})">
      <line x1="${xFrom}" y1="${cy}" x2="${xTo}" y2="${cy}" stroke="url(#${g('grad-x')})" ${stroke} />
      <path d="M${xTo - head} ${cy - head}L${xTo} ${cy}L${xTo - head} ${cy + head}" stroke="url(#${g('grad-x')})" ${stroke} />
      <line x1="${cx}" y1="${yFrom}" x2="${cx}" y2="${yTo}" stroke="url(#${g('grad-y')})" ${stroke} />
      <path d="M${cx - head} ${yTo + head}L${cx} ${yTo}L${cx + head} ${yTo + head}" stroke="url(#${g('grad-y')})" ${stroke} />
    </g>
  </svg>`;
  }

  function buildHotspotGridSvg(cols, rows) {
    const lines = [];

    // 왼쪽·위 끝부터 한 칸 간격으로 놓는다. 오른쪽·아래 끝선은 보드 border가 대신한다
    for (let i = 0; i < cols; i += 1) {
      const x = (i * HOTSPOT_GRID_W) / cols;
      lines.push(`<rect x="${x}" y="0" width="${HOTSPOT_GRID_LINE}" height="${HOTSPOT_GRID_H}" />`);
    }
    for (let i = 0; i < rows; i += 1) {
      const y = (i * HOTSPOT_GRID_H) / rows;
      lines.push(`<rect x="0" y="${y}" width="${HOTSPOT_GRID_W}" height="${HOTSPOT_GRID_LINE}" />`);
    }

    return `<svg class="hotspot-grid-lines" viewBox="0 0 ${HOTSPOT_GRID_W} ${HOTSPOT_GRID_H}" width="100%" height="100%" preserveAspectRatio="none" xmlns="${SVG_NS}" aria-hidden="true" focusable="false">
    <g fill="${HOTSPOT_GRID_COLOR}">${lines.join('')}</g>
  </svg>`;
  }

  function buildHotspotPoint([x, y]) {
    const selected = HOTSPOT_SELECTED && HOTSPOT_SELECTED[0] === x && HOTSPOT_SELECTED[1] === y;

    return `<button type="button" class="hotspot-point${selected ? ' is-selected' : ''}" data-coord="${x},${y}" aria-label="(${x}, ${y})">
      <img class="hotspot-point-icon" src="${HOTSPOT_MARKER}" alt="">
    </button>`;
  }

  // 좌표를 .hotspot-grid 안에서의 % 위치로 바꿔 넣는다. %라 창 크기가 바뀌어도 따라간다
  // x·y 글자를 축 끝에 맞춰 놓는다. 축 길이를 줄이면 글자도 같이 따라온다
  function placeHotspotAxisLabels(grid, geo) {
    const put = (el, x, y) => {
      if (!el) return;
      el.style.left = `${((x / geo.w) * 100).toFixed(4)}%`;
      el.style.top = `${((y / geo.h) * 100).toFixed(4)}%`;
      el.style.right = 'auto';
      el.style.transform = 'translate(-50%, -50%)';
    };

    put(grid.querySelector('.hotspot-axis-label-x'), geo.x + HOTSPOT_GRID_W + HOTSPOT_AXIS_OVER + HOTSPOT_AXIS_LABEL_GAP_X, geo.y + HOTSPOT_GRID_H / 2);
    put(grid.querySelector('.hotspot-axis-label-y'), geo.x + HOTSPOT_GRID_W / 2, geo.y - HOTSPOT_AXIS_OVER - HOTSPOT_AXIS_LABEL_GAP_Y);
  }

  function placeHotspotPoints(grid, geo, cols, rows) {
    const points = grid.querySelectorAll('.hotspot-point[data-coord]');
    if (!points.length || !cols || !rows) return;

    const { gridRect, innerW, innerH } = geo;
    const originX = gridRect.width * (geo.x / geo.w) + innerW / 2;
    const originY = gridRect.height * (geo.y / geo.h) + innerH / 2;
    const unitX = innerW / cols;
    const unitY = innerH / rows;

    points.forEach((point) => {
      const [x, y] = point.dataset.coord.split(',').map((v) => Number(v.trim()));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      point.style.left = `${(((originX + x * unitX) / gridRect.width) * 100).toFixed(4)}%`;
      point.style.top = `${(((originY - y * unitY) / gridRect.height) * 100).toFixed(4)}%`;
      point.style.transform = 'translate(-50%, -50%)';
    });
  }

  // root를 주면 그 안의 격자만 다시 그린다. 안내 팝업 예시처럼 처음엔 hidden이라
  // 크기를 못 재는(=hotspotGeometry가 null을 내는) 격자를 열릴 때 따로 채우기 위한 것으로,
  // 이때 문항 본체 격자까지 다시 그리면 거기 걸린 선택 리스너가 날아가므로 범위를 좁힌다.
  function initHotspotGrid(root) {
    (root || document).querySelectorAll('.hotspot-grid').forEach((grid) => {
      const board = grid.querySelector('.hotspot-grid-board');
      if (!board) return;

      board.innerHTML = buildHotspotGridSvg(HOTSPOT_GRID_COLS, HOTSPOT_GRID_ROWS);

      const geo = hotspotGeometry(grid, board);
      if (!geo) return;

      grid.querySelector('.hotspot-axis-lines')?.remove();
      board.insertAdjacentHTML('afterend', buildHotspotAxisSvg(geo, hotspotUid++));
      placeHotspotAxisLabels(grid, geo);

      grid.querySelectorAll('.hotspot-point').forEach((el) => el.remove());
      grid.insertAdjacentHTML('beforeend', HOTSPOT_POINTS.map(buildHotspotPoint).join(''));

      placeHotspotPoints(grid, geo, HOTSPOT_GRID_COLS, HOTSPOT_GRID_ROWS);
    });
  }

  window.initHotspotGrid = initHotspotGrid;
})();
