(function () {

  // 목록에 있는 요소는 pointerenter/leave 때 .is-hover 토글 — .btn 계열은
  // CSS :hover/:active만으로 충분해서 여기 안 넣음
  function initHoverToggle() {
    const hoverSelectors = [
      '.question-info-btn',
      '.question-note-btn',
    ];

    document.querySelectorAll(hoverSelectors.join(',')).forEach((el) => {
      el.addEventListener('pointerenter', () => el.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => el.classList.remove('is-hover'));
    });
  }

  function initDropdown() {
    const triggers = document.querySelectorAll('[data-dropdown-toggle]');
    if (!triggers.length) return;

    triggers.forEach((trigger) => {
      const panel = document.getElementById(trigger.dataset.dropdownToggle);
      if (!panel) return;

      trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        panel.classList.toggle('is-open');
        trigger.classList.toggle('is-open', panel.classList.contains('is-open'));
      });
    });

    document.addEventListener('click', (event) => {
      triggers.forEach((trigger) => {
        const panel = document.getElementById(trigger.dataset.dropdownToggle);
        if (!panel || panel.contains(event.target) || trigger.contains(event.target)) return;
        panel.classList.remove('is-open');
        trigger.classList.remove('is-open');
      });
    });
  }

  // .password-toggle 클릭 시 비밀번호 노출/숨김 전환 — is-visible 클래스, input type,
  // 아이콘(icon-eye/icon-eye-off)을 함께 토글. 경로는 페이지 깊이에 따라 달라질 수 있어
  // 기존 src의 파일명만 바꿔치기함(전체 경로를 새로 조립하지 않음)
  // .password-field / .password-toggle은 모양이 아니라 이 스크립트가 짝을 찾기 위한 공용 훅이라,
  // 로그인 화면과 마이페이지 정보 수정 모달처럼 생김새가 달라도 같은 동작을 공유한다
  function initPasswordToggle() {
    document.querySelectorAll('.password-toggle').forEach((toggle) => {
      const field = toggle.closest('.password-field');
      const input = field?.querySelector('input[type="password"], input[type="text"]');
      const icon = toggle.querySelector('img');
      if (!input || !icon) return;

      toggle.addEventListener('click', () => {
        const visible = toggle.classList.toggle('is-visible');
        input.type = visible ? 'text' : 'password';
        icon.src = icon.src.replace(/icon-eye(-off)?\.svg/, visible ? 'icon-eye.svg' : 'icon-eye-off.svg');
      });
    });
  }

  // 로그인(정적 시연용): 아이디나 비밀번호가 비어 있으면 .login-input-error로 오류 상태를 보여주고,
  // 둘 다 입력했으면 인트로로 넘어간다. 다시 틀리면 흔들림이 또 보이도록 클래스를 뗐다가 다시 붙인다.
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const filled = [...form.querySelectorAll('.login-input')].every((input) => input.value.trim());
      if (filled) {
        window.location.href = 'intro.html';
        return;
      }
      form.classList.remove('login-input-error');
      void form.offsetWidth;
      form.classList.add('login-input-error');
    });

    form.addEventListener('input', () => form.classList.remove('login-input-error'));
  }

  // 힌트 본문이 최대 넓이 안에 한 줄로 다 들어오면 접을 게 없으므로 .is-single-line을 붙여
  // "작게/펼쳐 보기" 버튼을 숨김. 분수 같은 수식은 한 줄이어도 키가 커서 line-height로는
  // 못 세므로, 줄바꿈을 막은(nowrap) 높이와 평소 높이를 비교해 실제로 줄이 넘어가는지 본다.
  // 버튼 없이 들어오는지가 기준이라 잴 때는 버튼을 숨기고(.is-single-line), 접혀 있으면 잠시 편다.
  function updateFooterPreviewLines(preview) {
    if (!preview.classList.contains('has-confirmed')) return;

    const descFull = preview.querySelector('.footer-preview-desc-full');
    if (!descFull) return;

    const wasCollapsed = preview.classList.contains('is-collapsed');
    if (wasCollapsed) preview.classList.remove('is-collapsed');
    preview.classList.add('is-single-line');

    // .katex는 전역에서 white-space: normal이라 부모 nowrap을 안 물려받으므로 안쪽 요소까지 다 막는다.
    const nowrapTargets = [descFull, ...descFull.querySelectorAll('*')];
    const wrappedHeight = descFull.getBoundingClientRect().height;
    nowrapTargets.forEach((el) => { el.style.whiteSpace = 'nowrap'; });
    const oneLineHeight = descFull.getBoundingClientRect().height;
    nowrapTargets.forEach((el) => { el.style.whiteSpace = ''; });
    const isSingleLine = wrappedHeight <= oneLineHeight + 1;

    if (wasCollapsed && !isSingleLine) preview.classList.add('is-collapsed');
    preview.classList.toggle('is-single-line', isSingleLine);
  }

  function updateFooterPreviewToggles() {
    document.querySelectorAll('.footer-preview').forEach(updateFooterPreviewLines);
  }

  // "확인하기"는 최초 1회만(누르면 .has-confirmed 유지), 이후는 "작게/펼쳐 보기"가 .is-collapsed만 토글
  function initFooterPreviewToggle() {
    document.querySelectorAll('.footer-preview').forEach((preview) => {
      const confirmBtn = preview.querySelector('.footer-preview-btn');
      const collapseBtn = preview.querySelector('.footer-preview-toggle-collapse');
      const expandBtn = preview.querySelector('.footer-preview-toggle-expand');

      confirmBtn?.addEventListener('click', () => {
        preview.classList.add('has-confirmed');
        updateFooterPreviewLines(preview);
      });
      collapseBtn?.addEventListener('click', () => preview.classList.add('is-collapsed'));
      expandBtn?.addEventListener('click', () => preview.classList.remove('is-collapsed'));

      updateFooterPreviewLines(preview);
    });

    // vw() 기반이라 창 크기가 바뀌면 줄 수도 달라짐
    window.addEventListener('resize', updateFooterPreviewToggles);
  }

  window.initHoverToggle = initHoverToggle;
  window.initDropdown = initDropdown;
  window.initPasswordToggle = initPasswordToggle;
  window.initLoginForm = initLoginForm;
  window.initFooterPreviewToggle = initFooterPreviewToggle;
  window.updateFooterPreviewToggles = updateFooterPreviewToggles;
})();
