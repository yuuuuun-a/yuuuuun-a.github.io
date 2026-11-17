(function () {

  // 마이페이지의 세 모달(나가기 / 로그아웃 / 정보 수정)을 여닫는다.
  // 여닫는 상태는 hidden 속성 하나로만 나타내서(question-info-popup과 같은 관례)
  // 등장 모션은 CSS가 display 복귀 시점에 알아서 다시 재생한다.
  function initMypageModals() {
    const modals = document.querySelectorAll('[data-mypage-modal]');
    if (!modals.length) return;

    // 모달을 닫은 뒤 원래 눌렀던 버튼으로 포커스를 돌려주기 위해 기억해 둠
    let lastTrigger = null;

    const open = (name, trigger) => {
      const modal = document.querySelector(`[data-mypage-modal="${name}"]`);
      if (!modal) return;
      lastTrigger = trigger || null;
      modal.removeAttribute('hidden');
      // 모달 안에서 처음 만나는 조작 요소로 포커스를 옮겨 키보드로도 바로 쓸 수 있게 함
      const focusable = modal.querySelector('input:not([type="hidden"]), button');
      if (focusable) focusable.focus();
    };

    const close = (modal) => {
      if (!modal || modal.hasAttribute('hidden')) return;
      modal.setAttribute('hidden', '');
      if (lastTrigger) {
        lastTrigger.focus();
        lastTrigger = null;
      }
    };

    const closeAll = () => modals.forEach(close);

    document.querySelectorAll('[data-mypage-exit-open]').forEach((btn) => {
      btn.addEventListener('click', () => open('exit', btn));
    });

    document.querySelectorAll('[data-mypage-logout-open]').forEach((btn) => {
      btn.addEventListener('click', () => open('logout', btn));
    });

    document.querySelectorAll('[data-mypage-edit-open]').forEach((btn) => {
      btn.addEventListener('click', () => open('edit', btn));
    });

    // 딤 영역과 취소/저장 계열 버튼은 모두 같은 표식(data-mypage-modal-close)으로 닫음
    modals.forEach((modal) => {
      modal.querySelectorAll('[data-mypage-modal-close]').forEach((el) => {
        el.addEventListener('click', () => close(modal));
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }

  // 정보 수정 모달의 비밀번호/비밀번호 확인이 서로 다르면 두 입력창을 빨갛게 하고 안내 문구를 띄운다.
  // 상태는 .mypage-form에 붙는 클래스 하나(mypage-password-error)로만 나타내고
  // 테두리·문구 노출은 CSS가 맡는다(로그인의 .login-input-error와 같은 관례).
  function initMypagePasswordMatch() {
    const form = document.querySelector('[data-mypage-password-match]');
    const password = document.getElementById('mypage-password');
    const confirm = document.getElementById('mypage-password-confirm');
    if (!form || !password || !confirm) return;

    // 확인란이 비어 있으면 아직 틀렸다고 할 단계가 아니라 조용히 넘어간다
    const validate = () => {
      const mismatch = confirm.value !== '' && password.value !== confirm.value;
      form.classList.toggle('mypage-password-error', mismatch);
    };

    password.addEventListener('input', validate);
    confirm.addEventListener('input', validate);
  }

  // 비밀번호를 입력한 경우에만 두 입력값이 같은지 제출 시점에 한 번 더 확인해 불필요한 저장 왕복을 줄인다.
  // (서버도 같은 검사를 한 번 더 하므로 여기서 막지 못해도 안전함) 일치하지 않으면 initMypagePasswordMatch와
  // 같은 mypage-password-error 클래스를 붙여 안내 문구·빨간 테두리를 그대로 재사용한다.
  function initMypageEditForm() {
    const form = document.getElementById('mypage-edit-form');
    const passwordForm = form?.querySelector('.mypage-form');
    const password = document.getElementById('mypage-password');
    const passwordConfirm = document.getElementById('mypage-password-confirm');
    if (!form || !passwordForm || !password || !passwordConfirm) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (password.value && password.value !== passwordConfirm.value) {
        passwordForm.classList.add('mypage-password-error');
        passwordConfirm.focus();
        return;
      }

      // 정적 버전: 저장 대신 고른 파트너를 ID CARD에 바로 반영하고 모달을 닫는다
      const option = form.querySelector('input[name="partnerCode"]:checked')?.closest('.mypage-partner-option');
      const card = document.querySelector('.mypage-id-card-partner');
      if (option && card) {
        const name = option.querySelector('.mypage-partner-name')?.textContent.trim();
        const img = option.querySelector('.mypage-partner-thumb-crop img');
        const nameEl = card.querySelector('.mypage-id-card-partner-name');
        const thumbImg = card.querySelector('.mypage-partner-thumb-crop img');
        if (nameEl && name) nameEl.textContent = name;
        if (thumbImg && img) { thumbImg.src = img.src; thumbImg.alt = img.alt; }
        const thumb = card.querySelector('.mypage-partner-thumb');
        const optionThumb = option.querySelector('.mypage-partner-thumb');
        if (thumb && optionThumb) thumb.className = optionThumb.className;
      }
      password.value = '';
      passwordConfirm.value = '';
      form.closest('[data-mypage-modal]')?.querySelector('[data-mypage-modal-close]')?.click();
    });
  }

  // 탐사 일지(reporter)의 내려받기/인쇄 버튼. 둘 다 브라우저 인쇄 대화상자를 열고,
  // 종이 크기와 버튼·푸터 숨김은 _reporter.scss의 @media print가 A4로 맞춘다.
  function initReporterPrint() {
    const buttons = document.querySelectorAll('[data-reporter-print]');
    if (!buttons.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => window.print());
    });
  }

  // 탐사 일지(reporter)의 영역 탭. 칩 버튼의 data-reporter-tab 값과
  // 같은 data-reporter-panel 섹션만 보이고 나머지는 hidden 처리한다.
  function initReporterTabs() {
    const tabs = document.querySelectorAll('[data-reporter-tab]');
    if (!tabs.length) return;

    const panels = document.querySelectorAll('[data-reporter-panel]');

    function select(key) {
      tabs.forEach((tab) => {
        const active = tab.dataset.reporterTab === key;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.reporterPanel !== key;
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => select(tab.dataset.reporterTab));
    });

    select(tabs[0].dataset.reporterTab);
  }

  // 탐사 일지(reporter)의 "개념 지도 보는 법" 팝오버. 페이지에 하나뿐인 #reporter-legend를
  // 누른 ? 버튼의 헤더 안으로 옮겨서 열고, 바깥 클릭·Esc·같은 버튼 재클릭이면 닫는다.
  function initReporterLegend() {
    const legend = document.getElementById('reporter-legend');
    const toggles = document.querySelectorAll('[data-reporter-legend-toggle]');
    if (!legend || !toggles.length) return;

    let current = null;

    function close() {
      legend.hidden = true;
      if (current) current.setAttribute('aria-expanded', 'false');
      current = null;
    }

    function open(btn) {
      const planet = btn.closest('.reporter-subject')?.querySelector('.reporter-map-nodes .reporter-node-planet');
      if (planet) {
        legend.querySelectorAll('.reporter-node-planet, .reporter-node-planet-glow').forEach((img) => {
          img.src = planet.getAttribute('src');
        });
      }
      btn.parentElement.appendChild(legend);
      legend.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      current = btn;
    }

    toggles.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const same = current === btn;
        close();
        if (!same) open(btn);
      });
    });

    document.addEventListener('click', (e) => {
      if (current && !legend.contains(e.target)) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && current) {
        const btn = current;
        close();
        btn.focus();
      }
    });

    document.querySelectorAll('[data-reporter-tab]').forEach((tab) => {
      tab.addEventListener('click', close);
    });
  }

  // 탐사 일지(reporter) 개념 지도의 접기. 한 줄(경로)에서 습득('')이나 미습득(is-locked) 노드가
  // 같은 상태로 3개 이상 이어지면 "+N" 노드 하나로 접고, 누르면 다시 펼친다.
  // 펼친 구간은 보라 캡슐로 묶어 보여주고, 캡슐 위 "접기" 칩을 누르면 다시 접는다.
  // 경로 양끝 노드와 is-current(여기부터 다시!) 바로 앞뒤 한 칸은 접지 않는다.
  // 노드가 9개 미만인 줄은 한눈에 다 보이므로 접지 않는다.
  const REPORTER_FOLD_MIN = 3;
  const REPORTER_FOLD_ROW_MIN = 9;

  function reporterNodeStatus(node) {
    for (const cls of ['is-current', 'is-required', 'is-unchecked', 'is-locked']) {
      if (node.classList.contains(cls)) return cls;
    }
    return 'is-done';
  }

  function foldReporterRun(row, run, layouts) {
    const status = reporterNodeStatus(run[0]);
    const fold = document.createElement('li');
    fold.className = 'reporter-node reporter-node-fold';
    if (status === 'is-locked') fold.classList.add('is-locked');

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'reporter-node-fold-btn';
    openBtn.setAttribute('aria-label', `접힌 개념 ${run.length}개 펼치기`);
    openBtn.appendChild(run[0].querySelector('.reporter-node-icon').cloneNode(true));

    const count = document.createElement('span');
    count.className = 'reporter-node-fold-count';
    count.textContent = `+${run.length}`;
    openBtn.appendChild(count);
    fold.appendChild(openBtn);

    const group = document.createElement('li');
    group.className = 'reporter-node-group';
    group.hidden = true;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'reporter-node-group-close';
    closeBtn.setAttribute('aria-label', `펼친 개념 ${run.length}개 접기`);
    closeBtn.textContent = '접기';
    group.appendChild(closeBtn);

    row.insertBefore(fold, run[0]);
    row.appendChild(group);

    const layout = () => {
      if (group.hidden) return;
      const first = run[0];
      const last = run[run.length - 1];
      group.style.setProperty('--group-left', `${first.offsetLeft}px`);
      group.style.setProperty('--group-width', `${last.offsetLeft + last.offsetWidth - first.offsetLeft}px`);
    };
    layouts.push(layout);

    const relayout = () => layouts.forEach((fn) => fn());

    const setOpen = (open) => {
      run.forEach((node) => {
        node.hidden = !open;
        node.classList.toggle('is-unfolded', open);
      });
      fold.hidden = open;
      group.hidden = !open;
      relayout();
    };

    setOpen(false);

    openBtn.addEventListener('click', () => {
      setOpen(true);
      closeBtn.focus({ preventScroll: true });
    });

    closeBtn.addEventListener('click', () => {
      setOpen(false);
      fold.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      openBtn.focus({ preventScroll: true });
    });
  }

  function initReporterMapFold() {
    document.querySelectorAll('.reporter-map-nodes').forEach((row) => {
      const layouts = [];
      const nodes = Array.from(row.querySelectorAll(':scope > .reporter-node'));
      if (nodes.length < REPORTER_FOLD_ROW_MIN) return;
      const last = nodes.length - 1;
      const currentIndex = nodes.findIndex((node) => node.classList.contains('is-current'));

      const foldable = (i) => {
        if (i === 0 || i === last) return false;
        if (currentIndex !== -1 && Math.abs(i - currentIndex) <= 1) return false;
        const status = reporterNodeStatus(nodes[i]);
        return status === 'is-done' || status === 'is-locked';
      };

      let run = [];
      const flush = () => {
        if (run.length >= REPORTER_FOLD_MIN) foldReporterRun(row, run, layouts);
        run = [];
      };

      nodes.forEach((node, i) => {
        if (!foldable(i)) {
          flush();
          return;
        }
        if (run.length && reporterNodeStatus(run[0]) !== reporterNodeStatus(node)) flush();
        run.push(node);
      });
      flush();

      if (layouts.length && 'ResizeObserver' in window) {
        new ResizeObserver(() => layouts.forEach((fn) => fn())).observe(row);
      }
    });
  }

  window.initMypageModals = initMypageModals;
  window.initMypagePasswordMatch = initMypagePasswordMatch;
  window.initMypageEditForm = initMypageEditForm;
  window.initReporterPrint = initReporterPrint;
  window.initReporterTabs = initReporterTabs;
  window.initReporterLegend = initReporterLegend;
  window.initReporterMapFold = initReporterMapFold;
})();
