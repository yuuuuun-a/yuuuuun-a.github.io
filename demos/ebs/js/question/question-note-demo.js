(function () {

  // 온보딩 연습장 스텝에서 "연필로 쓰고 → 지우개로 지우고 → 휴지통으로 싹 지우는" 과정을
  // 실제 캔버스 위에 그대로 재생한다. 그림을 씌우는 게 아니라 question-note.js의 필기 데이터를
  // 그대로 쌓기 때문에, 창 크기가 바뀌면 실제 필기와 똑같이 다시 그려진다.
  //
  // 좌표는 연습장 구멍의 설계 크기(908 x 448) 기준 px를 0~1 비율로 바꿔 둔 값이다.
  // 글씨는 행성 오른쪽 빈자리에 오도록 잡았다 — 선지나 문제 텍스트를 가리지 않는 자리.
  const PAD_W = 908;
  const PAD_H = 448;

  const path = (...points) => points.map((point) => ({ x: point[0] / PAD_W, y: point[1] / PAD_H }));

  // "x = 2+2" — 한 줄이 한 획이고 위에서부터 쓰는 순서다. ms는 그 획을 긋는 데 걸리는 시간.
  // 왼쪽 545부터 시작하는 건 그 왼쪽이 행성 일러스트 자리라서다(겹치면 글씨가 안 읽힌다).
  const WRITING = [
    { ms: 240, points: path([545, 95], [590, 150]) },
    { ms: 240, points: path([590, 95], [545, 150]) },
    { ms: 190, points: path([608, 113], [662, 113]) },
    { ms: 190, points: path([608, 132], [662, 132]) },
    { ms: 640, points: path([684, 112], [688, 102], [695, 96], [706, 94], [717, 98], [723, 108],
        [722, 120], [711, 132], [697, 142], [684, 150], [728, 150]) },
    { ms: 190, points: path([742, 122], [788, 122]) },
    { ms: 190, points: path([765, 97], [765, 147]) },
    { ms: 640, points: path([816, 112], [820, 102], [827, 96], [838, 94], [849, 98], [855, 108],
        [854, 120], [843, 132], [829, 142], [816, 150], [860, 150]) },
  ];

  // 마지막 '2' 위를 지그재그로 문지른다. 지우개 굵기(24)를 감안해 글자 높이(94~152)를
  // 위아래로 조금씩 넘겨 가며 다섯 번 지나가야 획이 남지 않는다.
  // 왼쪽 끝을 806에 두는 건 지우개 반지름(12)까지 감안해도 앞의 '+'(~788)를 건드리지 않는 자리라서다.
  const ERASING = path([806, 96], [872, 106], [806, 118], [872, 130], [806, 142], [872, 154]);

  const STROKE_GAP = 130;   // 획과 획 사이
  const READ_PAUSE = 1500;  // 한 동작을 마치고 다음으로 넘어가기까지(읽을 시간)
  const TOOL_PAUSE = 520;   // 도구를 바꾸고 실제로 긋기까지
  const PRESS_MS = 300;     // 휴지통을 누르고 있는 시늉

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function initQuestionNoteDemo() {
    const root = document.querySelector('[data-onboarding]');
    const pad = document.querySelector('[data-note-pad]');
    if (!root || !pad) return;

    let runToken = 0;
    const alive = (token) => token === runToken;
    const trash = () => document.querySelector('[data-note-tool-btn="clear"]');

    // 휴지통은 선택해 두는 도구가 아니라 누를 때만 켜지는 버튼이라(CSS의 :active와 같은 모양),
    // 시연에서도 잠깐 켰다 끄는 것으로 "눌렀다"를 보여 준다.
    async function pressTrash(token) {
      const button = trash();
      button?.classList.add('note-tool-btn-selected');
      await sleep(PRESS_MS);
      button?.classList.remove('note-tool-btn-selected');
      return alive(token);
    }

    async function playWriting(note, token) {
      for (const stroke of WRITING) {
        if (!alive(token)) return;
        await note.playStroke('pen', stroke.points, stroke.ms, () => alive(token));
        await sleep(STROKE_GAP);
      }
    }

    async function play(kind) {
      const note = window.questionNote;
      if (!note) return;

      const token = ++runToken;
      note.clear();
      note.setTool('pen');

      while (alive(token)) {
        if (kind === 'write') {
          await playWriting(note, token);
          await sleep(READ_PAUSE);
          if (!alive(token)) return;
          note.clear();
          await sleep(STROKE_GAP);
          continue;
        }

        // 한 스텝에서 펜 → 지우개 → 휴지통을 다 설명하므로 쓰는 과정부터 그대로 보여 준다
        await playWriting(note, token);
        if (!alive(token)) return;
        await sleep(READ_PAUSE);
        if (!alive(token)) return;

        note.setTool('eraser');
        await sleep(TOOL_PAUSE);
        if (!alive(token)) return;

        await note.playStroke('eraser', ERASING, 1300, () => alive(token));
        await sleep(READ_PAUSE);
        if (!alive(token)) return;

        if (!await pressTrash(token)) return;
        note.clear();
        note.setTool('pen');
        await sleep(READ_PAUSE);
      }
    }

    function stop() {
      runToken += 1;
      const note = window.questionNote;
      if (!note) return;
      note.clear();
      note.setTool('pen');
      note.hideCursor();
      trash()?.classList.remove('note-tool-btn-selected');
    }

    const kindOf = (step) => step.dataset.onboardingNote;

    root.addEventListener('onboarding:play', (event) => {
      const kind = kindOf(event.detail.step);
      if (kind) play(kind);
    });

    root.addEventListener('onboarding:leave', (event) => {
      if (kindOf(event.detail.step)) stop();
    });
  }

  window.initQuestionNoteDemo = initQuestionNoteDemo;
})();
