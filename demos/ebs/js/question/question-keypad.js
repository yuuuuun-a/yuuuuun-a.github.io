(function () {

  // 입력칸은 계산기처럼 자릿수 제한이 없다. 숫자 하나를 누를 때마다 .keypad-display-slot을 커서 앞에 새로 만들고,
  // 지우면 마지막 슬롯을 없앤다. 칸보다 길어지면 마지막 입력이 보이게 오른쪽 끝으로 스크롤한다.
  function initKeypad() {
    document.querySelectorAll('.question-num').forEach((scope) => {
      const field = scope.querySelector('.keypad-display-field');
      const keys = scope.querySelectorAll('.keypad-key');
      const cursor = field?.querySelector('.keypad-display-cursor');
      if (!field || !cursor) return;

      const slots = () => Array.from(field.querySelectorAll('.keypad-display-slot'));
      const scrollToEnd = () => { field.scrollLeft = field.scrollWidth; };

      function addDigit(digit) {
        const slot = document.createElement('span');
        slot.className = 'keypad-display-slot';
        slot.textContent = digit;
        field.insertBefore(slot, cursor);
        scrollToEnd();
      }

      function removeLastDigit() {
        slots().pop()?.remove();
        scrollToEnd();
      }

      function clearAll() {
        slots().forEach((slot) => slot.remove());
        field.scrollLeft = 0;
      }

      keys.forEach((key) => {
        const label = key.textContent.trim();
        if (/^\d$/.test(label)) {
          key.addEventListener('click', () => addDigit(label));
        } else if (label === '.') {
          key.addEventListener('click', () => {
            if (slots().some((slot) => slot.textContent.trim() === '.')) return;
            addDigit(label);
          });
        } else if (label === '전체 지우기') {
          key.addEventListener('click', clearAll);
        } else if (key.classList.contains('keypad-key-back')) {
          key.addEventListener('click', removeLastDigit);
        }
      });
    });
  }

  window.initKeypad = initKeypad;
})();
