document.addEventListener('DOMContentLoaded', function () {
    // 도움말 모달
    var helpBtn = document.querySelector('.help-btn');
    var helpModal = document.querySelector('.help-modal');
    var btnClose = document.querySelector('.help-modal .btn-close');

    if (helpBtn && helpModal) {
        helpBtn.addEventListener('click', function () {
            helpModal.style.display = 'flex';
        });
    }
    if (btnClose && helpModal) {
        btnClose.addEventListener('click', function () {
            helpModal.style.display = 'none';
        });
    }

    // book-list 탭 클릭
    document.querySelectorAll('.book-list li').forEach(function (li) {
        li.addEventListener('click', function () {
            if (li.classList.contains('deactivation')) {
                alert("준비중입니다.");
                return;
            }
            var bookNo = li.getAttribute('data-book-no');
            if (bookNo) {
                location.href = SITE_ROOT + 'mypage/sticker_book.html?book_no=' + bookNo;
            }
        });
    });
});

function exitPage() {
    if (isPC()) {
        self.close();
    } else {
        location.href = SITE_ROOT + 'mypage/my_page.html';
    }
}
