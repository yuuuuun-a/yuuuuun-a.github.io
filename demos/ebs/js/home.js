(function () {

  const ROLE_CLASSES = [
    'home-mission-card-current',
    'home-mission-card-next',
    'home-mission-card-queued',
    'home-mission-card-queued-left',
  ];

  function setRole(card, roleClass) {
    card.classList.remove(...ROLE_CLASSES);
    card.classList.add(roleClass);
  }

  // transition 없이 순간적으로 자리를 옮김(반대쪽에서 들어오는 것처럼 보이게 미리 숨겨둘 때 사용)
  function setRoleInstant(card, roleClass) {
    card.classList.add('home-mission-card-no-transition');
    setRole(card, roleClass);
    void card.offsetWidth; // 강제 리플로우로 위치를 즉시 반영한 뒤에야 transition을 다시 켬
    card.classList.remove('home-mission-card-no-transition');
  }

  function roleForSlot(slot) {
    if (slot === 0) return 'home-mission-card-current';
    if (slot === 1) return 'home-mission-card-next';
    return 'home-mission-card-queued';
  }

  // .home-mission-card-list 안 카드 순서를 큐로 보고, 다음/이전 버튼은 그 큐를 한 칸씩 돌려서
  // order[0]=현재(-current), order[1]=다음 미리보기(-next), 나머지=대기(-queued, 오른쪽 화면 밖)로 재배치.
  // 카드는 1~5장까지 몇 장이든 같은 로직으로 동작함.
  //
  // 대기 카드가 3장 이상 있을 때(카드 총 3장 이상), 다음 버튼을 누르면 방금 -current였던 카드를
  // -queued 자리(오른쪽, 새 카드가 들어오는 자리)로 곧장 되돌리지 않고 반대편(-queued-left, 왼쪽)으로
  // 계속 같은 방향으로 흘려보냄 — 그래야 동시에 next→current, queued→next로 넘어오는 카드들과
  // 경로가 겹치지 않고, 카드가 한 줄로 한 칸씩만 밀리는 것처럼 보임. 화면 밖으로 다 빠져나가면
  // (안 보이는 채로) -queued 자리로 순간 복귀시켜서 다음 차례를 기다림.
  // 이전 버튼은 그 반대: -queued(오른쪽)에 있던 카드를 안 보이는 채로 -queued-left(왼쪽)로 먼저
  // 순간 이동시킨 뒤 -current로 슬라이드시켜서, 반대 방향(왼쪽)에서 들어오는 것처럼 보이게 함.
  function initMissionCardNav() {
    const list = document.querySelector('.home-mission-card-list');
    if (!list) return;

    const cards = Array.from(list.querySelectorAll('.home-mission-card'));
    const prevBtn = document.querySelector('.home-nav-left');
    const nextBtn = document.querySelector('.home-nav-right');
    const dotWrap = document.querySelector('.home-carousel-dots');

    if (cards.length < 2) {
      prevBtn?.classList.add('home-nav-hidden');
      nextBtn?.classList.add('home-nav-hidden');
      dotWrap?.classList.add('home-carousel-hidden');
      return;
    }

    let order = cards.slice();

    // 카드 개수만큼 점을 만들고, 지금 -current인 카드(order[0])의 점만 is-active로 표시
    const dots = cards.map((card, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'home-carousel-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', (i + 1) + '번째 미션');
      dot.addEventListener('click', () => goTo(i));
      dotWrap?.appendChild(dot);
      return dot;
    });

    function syncDots() {
      const activeIndex = cards.indexOf(order[0]);
      dots.forEach((dot, i) => {
        const active = i === activeIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });
    }

    function applyRestingRoles(list) {
      list.forEach((card, slot) => setRole(card, roleForSlot(slot)));
    }

    // 점 클릭: 한 칸 차이면 기존 다음/이전 애니메이션을 그대로 쓰고,
    // 여러 칸 건너뛸 때는 큐를 한 번에 돌린 뒤 자리만 다시 잡아줌
    function goTo(index) {
      const current = cards.indexOf(order[0]);
      const steps = (index - current + cards.length) % cards.length;
      if (steps === 0) return;
      if (steps === 1) return rotateNext();
      if (steps === cards.length - 1) return rotatePrev();

      order = [...order.slice(steps), ...order.slice(0, steps)];
      applyRestingRoles(order);
      syncDots();
    }

    function rotateNext() {
      const leaving = order[0];
      order = [...order.slice(1), leaving];
      syncDots();

      // 카드가 2장뿐이면 대기 줄이 없어서 현재↔다음이 그냥 자리만 맞바꾸면 됨
      if (order.length <= 2) {
        applyRestingRoles(order);
        return;
      }

      order.slice(0, -1).forEach((card, slot) => setRole(card, roleForSlot(slot)));

      setRole(leaving, 'home-mission-card-queued-left');
      const onExitEnd = (e) => {
        if (e.target !== leaving || e.propertyName !== 'opacity') return;
        leaving.removeEventListener('transitionend', onExitEnd);
        setRoleInstant(leaving, 'home-mission-card-queued');
      };
      leaving.addEventListener('transitionend', onExitEnd);
    }

    function rotatePrev() {
      const entering = order[order.length - 1];
      order = [entering, ...order.slice(0, -1)];
      syncDots();

      if (order.length <= 2) {
        applyRestingRoles(order);
        return;
      }

      setRoleInstant(entering, 'home-mission-card-queued-left');
      order.forEach((card, slot) => setRole(card, roleForSlot(slot)));
    }

    applyRestingRoles(order);
    syncDots();
    order[0].classList.add('home-mission-card-enter-once');
    order[1].classList.add('home-mission-card-enter-once');

    list.addEventListener('animationend', (e) => {
      if (e.animationName === 'home-card-enter' || e.animationName === 'home-card-next-enter') {
        e.target.classList.remove('home-mission-card-enter-once');
      }
    });

    prevBtn?.addEventListener('click', rotatePrev);
    nextBtn?.addEventListener('click', rotateNext);
  }

  function initMissionStartButton() {
    // data-diagnosis-id가 있는 실제 단원 미션 버튼만 진단 인트로로 보낸다.
    // '탐사 사전 훈련(훈련 출발)'처럼 diagnosisId가 없는 카드는 자체 이동 경로(온보딩)를 쓰므로
    // 여기서 잡으면 diagnosisId=undefined로 덮어써버린다.
    document.querySelectorAll('.home-mission-card-btn[data-diagnosis-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const diagnosisId = btn.dataset.diagnosisId;
        if (!diagnosisId) return;
        window.location.href = 'diagnosis-intro.html';
      });
    });
  }

  // "우주선 정비 중"(is-waiting) 카드는 예정시간이 되면 새로고침 없이 "탐사 출발"로 바꾼다.
  // 남은 시간은 서버가 data-start-in(초)으로 내려주므로 학생 기기 시계가 틀려도 상관없다.
  // 탭이 백그라운드에 있으면 타이머가 늦게 돌 수 있어, 1초 간격으로 기준 시각과 비교해 확인한다.
  const MAX_WAIT_MS = 24 * 60 * 60 * 1000; // 하루 넘게 남은 카드는 그 사이 새로 들어올 때 다시 계산된다

  function initMissionWaitingRelease() {
    const frames = [...document.querySelectorAll('.home-mission-card-btn-frame.is-waiting[data-start-in]')];
    if (!frames.length) return;

    const loadedAt = Date.now();
    const pending = frames
      .map((frame) => ({ frame, at: loadedAt + Number(frame.dataset.startIn) * 1000 }))
      .filter((item) => Number.isFinite(item.at) && item.at - loadedAt <= MAX_WAIT_MS);
    if (!pending.length) return;

    const timer = setInterval(() => {
      const now = Date.now();
      for (let i = pending.length - 1; i >= 0; i -= 1) {
        if (now >= pending[i].at) {
          pending[i].frame.classList.remove('is-waiting');
          pending.splice(i, 1);
        }
      }
      if (!pending.length) clearInterval(timer);
    }, 1000);
  }

  window.initMissionCardNav = initMissionCardNav;
  window.initMissionWaitingRelease = initMissionWaitingRelease;
  window.initMissionStartButton = initMissionStartButton;
})();
