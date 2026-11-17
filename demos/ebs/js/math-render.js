(function () {

  const DELIMITERS = [
    { left: '$$', right: '$$', display: true },
    { left: '$', right: '$', display: false },
  ];

  // KaTeX는 \text 안의 한글 자모(ㄱ, ㄴ…)에 높이 정보가 없어서 선분·직선·반직선 기호가 글자에 겹친다.
  // 한글이 들어간 경우에만 폭 0짜리 \rule로 영문 대문자와 비슷한 높이의 기둥을 세워 기호를 글자 위로 올린다.
  const HANGUL_ACCENT = /\\(overline|overrightarrow|overleftrightarrow)\{\\text\{([^{}]*[ㄱ-ㅎㅏ-ㅣ가-힣][^{}]*)\}\}/g;
  const HANGUL_ACCENT_HEIGHT = '0.7em';

  function preProcess(math) {
    return math.replace(HANGUL_ACCENT, (_, cmd, text) =>
      `\\${cmd}{\\text{${text}}\\rule{0pt}{${HANGUL_ACCENT_HEIGHT}}}`);
  }

  // 빈칸 채우기/식 만들기 템플릿은 서버가 [[]] 자리에서 잘라 조각(span)과 빈칸(.fill-slot/.exp-slot)을 번갈아 찍는다.
  // 빈칸이 $...$ 안에 있으면(예: $\frac{[[]]}{4}$) 조각마다 $ 짝이 안 맞아 수식이 통째로 원문으로 보이므로,
  // 그런 줄은 조각을 다시 이어 붙여 한 수식으로 그리고, 빈칸 자리에는 빈칸 크기만 한 \rule을 세워 둔 뒤
  // 원래 빈칸 요소를 그 자리로 옮긴다(드래그·제출 스크립트가 잡고 있는 요소 그대로라 이벤트가 유지된다).
  const BLANK_LINE_SELECTOR = '.fill-zone-line, .exp-zone-line';
  const BLANK_SLOT_SELECTOR = '.fill-slot, .exp-slot';
  const BLANK_MARK = /\u0000(\d+)\u0000/g;
  const KATEX_SCALE = 1.21; // katex.min.css의 .katex { font-size: 1.21em }
  const MATH_AXIS_EM = 0.25;

  function renderBlanksInMath(root) {
    if (typeof katex === 'undefined') return;
    root.querySelectorAll(BLANK_LINE_SELECTOR).forEach(renderBlankLine);
  }

  function renderBlankLine(line) {
    const slots = [];
    let source = '';
    let inMath = false;
    let blanksInMath = 0;
    for (const el of [...line.children]) {
      if (el.matches(BLANK_SLOT_SELECTOR)) {
        if (inMath) blanksInMath++;
        source += `\u0000${slots.length}\u0000`;
        slots.push(el);
      } else {
        const text = el.textContent;
        source += text;
        if ((text.match(/\$/g) || []).length % 2) inMath = !inMath;
      }
    }
    if (!blanksInMath) return;
    const original = [...line.childNodes];

    // 빈칸 원래 크기(마진 포함)를 수식 em으로 환산. KaTeX는 분수 안에서도 \rule 크기를 바깥 글자 기준으로
    // 유지하지만, CSS가 글자를 줄이는 자리(_katex.scss의 대분수 0.85em 등)는 한 번 그려 보고 줄어든 만큼 키워 다시 그린다.
    const emPx = parseFloat(getComputedStyle(line).fontSize) * KATEX_SCALE;
    const sizes = slots.map((slot) => {
      const style = getComputedStyle(slot);
      const px = {
        width: slot.offsetWidth, height: slot.offsetHeight,
        top: parseFloat(style.marginTop), left: parseFloat(style.marginLeft),
      };
      const outerW = px.width + px.left + parseFloat(style.marginRight);
      const outerH = px.height + px.top + parseFloat(style.marginBottom);
      return { px, w: outerW / emPx, h: outerH / emPx, scale: 1 };
    });

    const pieces = source.split('$');
    let hosts = buildBlankLine(line, pieces, slots, sizes);
    // KaTeX 마크업이 예상과 달라 빈칸 자리를 못 찾으면 빈칸이 사라지지 않게 원래대로 되돌린다
    if (hosts.length !== blanksInMath) {
      line.replaceChildren(...original);
      return;
    }
    let rescaled = false;
    hosts.forEach(({ index, rule }) => {
      const ratio = rule.getBoundingClientRect().height / (sizes[index].h * emPx);
      if (ratio > 0 && Math.abs(ratio - 1) > 0.01) {
        sizes[index].scale = 1 / ratio;
        rescaled = true;
      }
    });
    if (rescaled) hosts = buildBlankLine(line, pieces, slots, sizes);

    hosts.forEach(({ index, rule }) => {
      const { px } = sizes[index];
      // \rule의 테두리 대신 KaTeX가 그린 크기 그대로의 빈 상자로 바꾸고, 빈칸을 마진만큼 안쪽에 겹친다.
      // 분수 안은 글자 크기가 줄어 있으므로 em은 \rule 자신의 글자 크기 기준으로 환산한다(화면 폭이 바뀌어도 비율 유지).
      const ruleEm = parseFloat(getComputedStyle(rule).fontSize);
      const box = rule.getBoundingClientRect();
      const em = (value) => `${(value / ruleEm).toFixed(4)}em`;
      Object.assign(rule.style, { borderWidth: '0', width: em(box.width), height: em(box.height) });
      Object.assign(slots[index].style, {
        position: 'absolute', margin: '0', top: em(px.top), left: em(px.left),
        width: em(px.width), height: em(px.height),
      });
      rule.appendChild(slots[index]);
    });
  }

  // pieces는 $로 자른 원문(짝수 번째가 글, 홀수 번째가 수식). 수식 안 빈칸은 \htmlData로 표시한 \rule이 되고,
  // 수식 밖 빈칸은 원래 요소를 그 자리에 그대로 둔다. 수식 안 빈칸 자리(\rule 요소) 목록을 돌려준다.
  function buildBlankLine(line, pieces, slots, sizes) {
    slots.forEach((slot) => slot.remove());
    line.replaceChildren();
    const hosts = [];
    pieces.forEach((piece, i) => {
      if (i % 2 === 0) {
        piece.split(BLANK_MARK).forEach((part, j) => {
          if (j % 2) {
            line.appendChild(slots[Number(part)]);
          } else if (part) {
            const span = document.createElement('span');
            span.textContent = part;
            line.appendChild(span);
          }
        });
        return;
      }
      const tex = piece.replace(BLANK_MARK, (_, n) => {
        const { w, h, scale } = sizes[Number(n)];
        const width = (w * scale).toFixed(4);
        const height = (h * scale).toFixed(4);
        // 빈칸 세로 가운데를 수식 축(분수선 높이)에 맞춘다
        const raise = ((MATH_AXIS_EM - h / 2) * scale).toFixed(4);
        return `\\htmlData{blank=${n}}{\\rule[${raise}em]{${width}em}{${height}em}}`;
      });
      const span = document.createElement('span');
      katex.render(preProcess(tex), span, {
        throwOnError: false,
        trust: (context) => context.command === '\\htmlData',
        strict: (code) => (code === 'htmlExtension' ? 'ignore' : 'warn'),
      });
      span.querySelectorAll('[data-blank]').forEach((el) => {
        const rule = el.querySelector('.katex-rule');
        if (rule) hosts.push({ index: Number(el.dataset.blank), rule });
      });
      line.appendChild(span);
    });
    return hosts;
  }

  // 식 만들기(.exp-zone-line)는 flex 줄이라 조각 안의 줄바꿈(\n)이 CSS pre-line로는 다음 줄로 안 넘어간다.
  // 조각을 \n에서 잘라 사이에 폭 100%짜리 빈 요소(.exp-zone-break)를 끼운다. 빈칸 채우기(.fill-zone-line)는
  // 일반 줄이라 CSS pre-line만으로 된다. 이미 KaTeX로 그린 조각(빈칸이 수식 안에 있던 줄)은 건드리지 않는다.
  function splitFlexLineBreaks(root) {
    root.querySelectorAll('.exp-zone-line').forEach((line) => {
      Array.from(line.children).forEach((child) => {
        if (child.matches(BLANK_SLOT_SELECTOR) || child.querySelector('.katex')
            || !child.textContent.includes('\n')) return;
        const frag = document.createDocumentFragment();
        child.textContent.split('\n').forEach((part, i) => {
          if (i > 0) {
            const lineBreak = document.createElement('span');
            lineBreak.className = 'exp-zone-break';
            lineBreak.setAttribute('aria-hidden', 'true');
            frag.appendChild(lineBreak);
          }
          if (part) {
            const piece = child.cloneNode(false);
            piece.textContent = part;
            frag.appendChild(piece);
          }
        });
        child.replaceWith(frag);
      });
    });
  }

  // 렌더링이 실패해도(KaTeX 미로딩 등) 화면은 드러내야 하므로 finally에서 math-pending을 지운다(layout :: mathPending).
  function initMathRender() {
    try {
      renderBlanksInMath(document);
      splitFlexLineBreaks(document);
      renderMathIn(document.body);
    } finally {
      document.documentElement.classList.remove('math-pending');
    }
  }

  // 힌트처럼 페이지 로드 이후 textContent로 새로 채워지는 영역은 초기 렌더링 때 이미 지나가버려서
  // KaTeX가 안 먹는다. 그런 곳에서 텍스트를 새로 넣은 다음 이 함수로 그 요소만 다시 렌더링한다.
  function renderMathIn(el) {
    if (!el || typeof renderMathInElement !== 'function') return;
    renderMathInElement(el, { delimiters: DELIMITERS, preProcess });
  }

  window.initMathRender = initMathRender;
  window.renderMathIn = renderMathIn;
})();
