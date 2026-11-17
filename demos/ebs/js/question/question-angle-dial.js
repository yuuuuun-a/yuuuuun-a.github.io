(function () {

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let angleDialUid = 0;

  function angleDialPolar(cx, cy, r, deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  // 논리각(=제출/채점에 쓰는 값, qi_drag_template.direction과 그대로 대응)을 화면에 그릴 물리각으로 바꾼다.
  // 반시계(counterclockwise, 기본값): 0°=오른쪽 모서리, 180°=왼쪽 모서리, 늘어날수록 위를 지나 왼쪽으로.
  // 시계(clockwise): 0°=왼쪽 모서리, 180°=오른쪽 모서리로 좌우가 뒤집힌다 — 반원 모양 자체는 그대로 두고
  // "어느 쪽 모서리가 0°인지"만 거울 대칭(180 - deg)시키면 되므로, 논리<->물리 변환이 서로 같은 함수다.
  function mirrorIfClockwise(deg, clockwise) {
    return clockwise ? 180 - deg : deg;
  }

  function angleDialPieSector(cx, cy, r, a0, a1) {
    const start = angleDialPolar(cx, cy, r, a0);
    const end = angleDialPolar(cx, cy, r, a1);
    const large = Math.abs(a0 - a1) > 180 ? 1 : 0;
    const sweep = a0 >= a1 ? 1 : 0;
    return `M${start.x} ${start.y} A${r} ${r} 0 ${large} ${sweep} ${end.x} ${end.y} L${cx} ${cy}Z`;
  }

  function angleDialHalfCircle(cx, cy, r) {
    return `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}Z`;
  }

  const ANGLE_DIAL_R_OUTER = 180;
  const ANGLE_DIAL_R_INNER = 162;
  const ANGLE_DIAL_HUB_OUTER = 38;
  const ANGLE_DIAL_HUB_INNER = 30;
  const ANGLE_DIAL_RAY_IN = 42;
  const ANGLE_DIAL_NEEDLE_LEN = 160;
  const ANGLE_DIAL_NEEDLE_IN = 15;
  const ANGLE_DIAL_HANDLE_R = 9;
  const ANGLE_DIAL_TICK_R = 4.5;
  const ANGLE_DIAL_TICK_GLOW_R = 8.5;
  const ANGLE_DIAL_MINOR_STEP = 5;
  const ANGLE_DIAL_MINOR_OUT = 152;
  const ANGLE_DIAL_MINOR_LEN = 8;
  const ANGLE_DIAL_MINOR_LEN_10 = 13;

  const ANGLE_DIAL_SHAPE = { vbW: 512, vbH: 300, cx: 256, cy: 248, range: [0, 180], ticks: [0, 30, 60, 90, 120, 150, 180] };

  function buildAngleDialSvg(shape, uid, clockwise) {
    const { vbW, vbH, cx, cy, ticks } = shape;
    const g = (name) => `angle-dial-${name}-${uid}`;
    const phys = (deg) => mirrorIfClockwise(deg, clockwise);

    const raySpokes = ticks
      .map((deg) => {
        const from = angleDialPolar(cx, cy, ANGLE_DIAL_RAY_IN, phys(deg));
        const to = angleDialPolar(cx, cy, ANGLE_DIAL_R_INNER - 2, phys(deg));
        return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
      })
      .join('');

    // 눈금 점 — 바늘 끝(is-touched 상태에서 각도가 이 눈금과 정확히 일치)이 지나가면
    // updateTickGlow()가 같은 위치의 tick-glow 원을 금색으로 밝혀서 "이 각도에 맞췄다" 피드백을 줌
    // 0°·180° 눈금은 밑변 위에 있어 원으로 그리면 아래로 튀어나오므로 반원으로 그린다
    // (deg는 항상 논리각 기준 — 물리적으로 어느 모서리에 놓이든 0°/180° 자리인 건 똑같다)
    const tickShape = (deg, p, r, attrs) =>
      deg === shape.range[0] || deg === shape.range[1]
        ? `<path ${attrs} d="${angleDialHalfCircle(p.x, p.y, r)}" />`
        : `<circle ${attrs} cx="${p.x}" cy="${p.y}" r="${r}" />`;

    const tickDots = ticks
      .map((deg) => {
        const p = angleDialPolar(cx, cy, ANGLE_DIAL_R_INNER - 2, phys(deg));
        const attrs = `class="angle-dial-tick" data-deg="${deg}" fill="url(#${g('tick')})" filter="url(#${g('tick-shadow')})"`;
        return tickShape(deg, p, ANGLE_DIAL_TICK_R, attrs);
      })
      .join('');

    const tickGlows = ticks
      .map((deg) => {
        const p = angleDialPolar(cx, cy, ANGLE_DIAL_R_INNER - 2, phys(deg));
        const attrs = `class="angle-dial-tick-glow" data-deg="${deg}" fill="url(#${g('tick-glow')})" filter="url(#${g('tick-glow-shadow')})" opacity="0"`;
        return tickShape(deg, p, ANGLE_DIAL_TICK_GLOW_R, attrs);
      })
      .join('');

    // 5° 간격 잔눈금 — 10° 배수는 조금 길게, 30° 배수는 이미 스포크가 있어서 건너뜀
    const minorTicks = [];
    for (let deg = shape.range[0]; deg <= shape.range[1]; deg += ANGLE_DIAL_MINOR_STEP) {
      if (deg % 30 === 0) continue;
      const len = deg % 10 === 0 ? ANGLE_DIAL_MINOR_LEN_10 : ANGLE_DIAL_MINOR_LEN;
      const from = angleDialPolar(cx, cy, ANGLE_DIAL_MINOR_OUT, phys(deg));
      const to = angleDialPolar(cx, cy, ANGLE_DIAL_MINOR_OUT - len, phys(deg));
      minorTicks.push(`<line class="angle-dial-tick-minor" data-deg="${deg}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#D6E6F7" stroke-opacity="${deg % 10 === 0 ? 0.75 : 0.45}" stroke-width="${deg % 10 === 0 ? 2.4 : 1.8}" stroke-linecap="round" />`);
    }

    const arrowOffsetX = cx - 256.5;
    const arrowOffsetY = cy - 249.5;
    // 드래그 힌트 화살표는 반시계 스윕(오른쪽→위→왼쪽)을 가리키게 그려져 있어서, 시계 방향일 땐
    // 세로 중심선(cx) 기준으로 좌우 반전해 방향을 맞춰준다.
    const hintTransform = clockwise ? `translate(${2 * cx} 0) scale(-1 1)` : '';

    return `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="${SVG_NS}">
    <defs>
      <linearGradient id="${g('fill')}" x1="${cx - ANGLE_DIAL_R_INNER}" y1="${cy}" x2="${cx + ANGLE_DIAL_R_INNER}" y2="${cy}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#0A3A8A" /><stop offset="0.3" stop-color="#1256CC" />
        <stop offset="0.6" stop-color="#1A6EE8" /><stop offset="1" stop-color="#3399FF" />
      </linearGradient>
      <linearGradient id="${g('needle')}" x1="${cx + ANGLE_DIAL_NEEDLE_LEN}" y1="${cy}" x2="${cx + ANGLE_DIAL_NEEDLE_IN}" y2="${cy}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#8AA0BC" /><stop offset="0.4" stop-color="#fff" />
        <stop offset="0.7" stop-color="#E0ECFA" /><stop offset="1" stop-color="#C0D4E8" />
      </linearGradient>
      <radialGradient id="${g('handle')}" cx="0.35" cy="0.35" r="0.75">
        <stop offset="0" stop-color="#FFEF99" /><stop offset="0.4" stop-color="#FFD700" /><stop offset="1" stop-color="#CC8800" />
      </radialGradient>
      <radialGradient id="${g('tick')}" cx="0.35" cy="0.35" r="0.75">
        <stop offset="0" stop-color="#F0F6FF" /><stop offset="1" stop-color="#A0B4CC" />
      </radialGradient>
      <radialGradient id="${g('hub-outer')}" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stop-color="#EAF2FF" /><stop offset="0.35" stop-color="#B0C4DC" />
        <stop offset="0.65" stop-color="#7A90AA" /><stop offset="1" stop-color="#5A6E88" />
      </radialGradient>
      <radialGradient id="${g('hub-inner')}" cx="0.3" cy="0.25" r="0.85">
        <stop offset="0" stop-color="#5A7BAA" /><stop offset="0.3" stop-color="#2A4A7A" />
        <stop offset="0.6" stop-color="#162A50" /><stop offset="1" stop-color="#080E22" />
      </radialGradient>
      <linearGradient id="${g('arrow')}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FF7045" /><stop offset="1" stop-color="#FCAA6F" />
      </linearGradient>
      <radialGradient id="${g('tick-glow')}" cx="0.3" cy="0.25" r="0.85">
        <stop offset="0" stop-color="#FFEF99" /><stop offset="0.4" stop-color="#FFD700" /><stop offset="1" stop-color="#CC8800" />
      </radialGradient>
      <filter id="${g('tick-shadow')}" x="-150%" y="-150%" width="400%" height="400%">
        <feDropShadow dx="0" dy="1.06667" stdDeviation="1.6" flood-color="#000000" flood-opacity="0.4" />
      </filter>
      <filter id="${g('tick-glow-shadow')}" x="-250%" y="-250%" width="600%" height="600%">
        <feDropShadow dx="0" dy="0" stdDeviation="6.4" flood-color="#FFB200" flood-opacity="0.8" />
        <feDropShadow dx="0" dy="2.13333" stdDeviation="3.2" flood-color="#FF8800" flood-opacity="0.4" />
      </filter>
      <filter id="${g('needle-shadow')}" filterUnits="userSpaceOnUse" x="${cx - 40}" y="${cy - 40}" width="${ANGLE_DIAL_NEEDLE_LEN + 80}" height="80">
        <feDropShadow dx="-1.06667" dy="3.2" stdDeviation="4.26667" flood-opacity="0.6" flood-color="#000000" />
        <feDropShadow dx="1.06667" dy="-1.06667" stdDeviation="1.06667" flood-opacity="0.2" flood-color="#ffffff" />
      </filter>
      <filter id="${g('hub-outer-shadow')}" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="3.2" stdDeviation="5.33333" flood-opacity="0.6" flood-color="#000000" result="dropShadowed" />
        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
        <feOffset dy="-2.13333" />
        <feGaussianBlur stdDeviation="2.13333" />
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
        <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.313726 0" />
        <feBlend mode="normal" in2="dropShadowed" />
      </filter>
      <filter id="${g('hub-inner-shadow')}" x="-40%" y="-40%" width="180%" height="180%">
        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
        <feOffset dy="-3.2" />
        <feGaussianBlur stdDeviation="4.26667" />
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
        <feColorMatrix values="0 0 0 0 0.466667 0 0 0 0 0.6 0 0 0 0 0.866667 0 0 0 0.4 0" />
        <feBlend mode="normal" in2="SourceGraphic" result="innerShadow1" />
        <feColorMatrix in="SourceAlpha" result="hardAlpha2" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
        <feOffset dy="4.26667" />
        <feGaussianBlur stdDeviation="6.4" />
        <feComposite in2="hardAlpha2" operator="arithmetic" k2="-1" k3="1" />
        <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.701961 0" />
        <feBlend mode="normal" in2="innerShadow1" />
      </filter>
    </defs>
    <path class="angle-dial-fill" fill="url(#${g('fill')})" opacity="0.95" />
    <g stroke="#7A9EC8" stroke-opacity="0.4" stroke-width="2">${raySpokes}</g>
    <g class="angle-dial-minor-ticks">${minorTicks.join('')}</g>
    <g class="angle-dial-needle">
      <line class="angle-dial-lever" x1="${cx + ANGLE_DIAL_NEEDLE_IN}" y1="${cy}" x2="${cx + ANGLE_DIAL_NEEDLE_LEN}" y2="${cy}" stroke="url(#${g('needle')})" stroke-width="9" stroke-linecap="round" filter="url(#${g('needle-shadow')})" />
      <circle class="angle-dial-handle" cx="${cx + ANGLE_DIAL_NEEDLE_LEN}" cy="${cy}" r="${ANGLE_DIAL_HANDLE_R}" fill="url(#${g('handle')})" filter="url(#${g('tick-glow-shadow')})" />
    </g>
    <path d="${angleDialHalfCircle(cx, cy, ANGLE_DIAL_HUB_OUTER)}" fill="url(#${g('hub-outer')})" filter="url(#${g('hub-outer-shadow')})" />
    <path d="${angleDialHalfCircle(cx, cy, ANGLE_DIAL_HUB_INNER)}" fill="url(#${g('hub-inner')})" filter="url(#${g('hub-inner-shadow')})" />
 
    ${tickDots}
    ${tickGlows}
  </svg><svg class="drag-gauge-hint-layer" viewBox="0 0 ${vbW} ${vbH}" xmlns="${SVG_NS}" aria-hidden="true">
    <defs>
      <linearGradient id="${g('arrow-hint')}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FF7045" /><stop offset="1" stop-color="#FCAA6F" />
      </linearGradient>
    </defs>
    <g transform="${hintTransform}">
      <path class="drag-gauge-hint" transform="translate(${arrowOffsetX} ${arrowOffsetY})"
        d="M295 45.2845C269.734 38.2553 243.266 38.2553 218 45.2845M231.38 54L218 45.2845L227.881 32"
        stroke="url(#${g('arrow-hint')})" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>
  </svg>`;
  }

  // root를 주면 그 안의 게이지만 다시 그린다 — 안내 팝업 예시는 한 바퀴마다 마크업이
  // 복원되면서 아래 wrap.demoDial이 날아가므로, question-info-demo.js가 다시 부른다.
  function initAngleDial(root) {
    (root || document).querySelectorAll('.drag-gauge').forEach((wrap) => {
      const shape = ANGLE_DIAL_SHAPE;
      const uid = angleDialUid++;
      // qi_drag_template.direction과 동일한 값(1=clockwise/0=counterclockwise, 기본값 counterclockwise) —
      // 설명 팝업 데모처럼 이 속성이 없는 게이지는 기존과 똑같이 반시계로 그려진다.
      const clockwise = wrap.dataset.direction === '1' || wrap.dataset.direction === 'clockwise';

      wrap.innerHTML = buildAngleDialSvg(shape, uid, clockwise);
      const svg = wrap.querySelector('svg');
      const needle = wrap.querySelector('.angle-dial-needle');
      const fill = wrap.querySelector('.angle-dial-fill');
      const tickGlows = Array.from(wrap.querySelectorAll('.angle-dial-tick-glow'));
      const minorTickEls = Array.from(wrap.querySelectorAll('.angle-dial-tick-minor'));
      const { cx, cy, range } = shape;

      // is-touched 상태에서만, 바늘이 정확히 눈금(30° 단위) 위에 놓이면 그 눈금을 금색으로 밝힘
      function updateTickGlow(roundedDeg) {
        const touched = wrap.classList.contains('is-touched');
        tickGlows.forEach((el) => {
          const isMatch = touched && Number(el.dataset.deg) === roundedDeg;
          el.setAttribute('opacity', isMatch ? '1' : '0');
        });
      }

      // 바늘이 올라가 있는 5° 잔눈금을 금색으로 강조
      function updateMinorTick(roundedDeg) {
        const touched = wrap.classList.contains('is-touched');
        minorTickEls.forEach((el) => {
          const isMatch = touched && Number(el.dataset.deg) === roundedDeg;
          el.setAttribute('stroke', isMatch ? '#FFD700' : '#D6E6F7');
          el.setAttribute('stroke-opacity', isMatch ? '1' : el.dataset.deg % 10 === 0 ? '0.75' : '0.45');
        });
      }

      // deg는 항상 논리각(제출/채점 값). 화면에 그릴 때만 mirrorIfClockwise로 물리각으로 바꾼다.
      function setAngle(deg) {
        const physicalDeg = mirrorIfClockwise(deg, clockwise);
        needle.setAttribute('transform', `rotate(${-physicalDeg} ${cx} ${cy})`);
        fill.setAttribute('d', angleDialPieSector(cx, cy, ANGLE_DIAL_R_INNER, physicalDeg, clockwise ? 180 : 0));
        const rounded = Math.round(deg) % 360;
        wrap.dataset.value = rounded;
        updateTickGlow(rounded);
        updateMinorTick(rounded);
        wrap.setAttribute('aria-valuenow', String(rounded));
      }

      function clampAngle(deg) {
        if (deg <= 180) return deg;
        return deg > 270 ? 0 : 180;
      }

      function angleFromPointer(event) {
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * shape.vbW;
        const y = ((event.clientY - rect.top) / rect.height) * shape.vbH;
        let deg = (Math.atan2(cy - y, x - cx) * 180) / Math.PI;
        if (deg < 0) deg += 360;
        // 5° 단위로 스냅(물리각 기준 — 포인터는 화면 위치 그대로 읽으니까) 후 논리각으로 되돌린다
        const physicalDeg = clampAngle(Math.round(clampAngle(deg) / ANGLE_DIAL_MINOR_STEP) * ANGLE_DIAL_MINOR_STEP);
        return mirrorIfClockwise(physicalDeg, clockwise);
      }

      let dragging = false;

      function drag(event) {
        wrap.classList.add('is-touched');
        setAngle(angleFromPointer(event));
      }

      wrap.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        dragging = true;
        wrap.classList.add('is-dragging');
        wrap.setPointerCapture(event.pointerId);
        drag(event);
      });

      wrap.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        drag(event);
      });

      function stopDrag(event) {
        if (!dragging) return;
        dragging = false;
        wrap.classList.remove('is-dragging');
        wrap.releasePointerCapture(event.pointerId);
      }

      wrap.addEventListener('pointerup', stopDrag);
      wrap.addEventListener('pointercancel', stopDrag);

      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('role', 'slider');
      wrap.setAttribute('aria-valuemin', String(range[0]));
      wrap.setAttribute('aria-valuemax', String(range[1]));

      wrap.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 15 : ANGLE_DIAL_MINOR_STEP;
        let delta = 0;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = step;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -step;
        if (!delta) return;
        event.preventDefault();
        const current = Number(wrap.dataset.value) || 0;
        const next = Math.max(0, Math.min(180, Math.round((current + delta) / ANGLE_DIAL_MINOR_STEP) * ANGLE_DIAL_MINOR_STEP));
        wrap.classList.add('is-touched');
        setAngle(next);
      });

      // 안내 팝업 데모가 실제 게이지 로직을 그대로 쓰기 위한 통로(root.getConnections와 같은 방식).
      // 합성 포인터 이벤트 대신 각도를 직접 넣고, 손을 얹을 손잡이 좌표도 여기서 계산해 준다.
      wrap.demoDial = {
        setAngle(deg) {
          wrap.classList.add('is-touched');
          setAngle(deg);
        },
        // 주어진 각도(논리각)에서 바늘 손잡이의 화면 좌표
        handleAt(deg) {
          const rect = svg.getBoundingClientRect();
          const p = angleDialPolar(cx, cy, ANGLE_DIAL_NEEDLE_LEN, mirrorIfClockwise(deg, clockwise));
          return {
            x: rect.left + (p.x / shape.vbW) * rect.width,
            y: rect.top + (p.y / shape.vbH) * rect.height,
          };
        },
        setDragging(on) {
          wrap.classList.toggle('is-dragging', !!on);
        },
      };

      const initial = Number(wrap.dataset.value) || 0;
      setAngle(initial);
    });
  }

  window.initAngleDial = initAngleDial;
})();
