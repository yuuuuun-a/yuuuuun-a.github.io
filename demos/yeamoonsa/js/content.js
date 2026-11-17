function isPC() {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'mobile'];
    return !mobileKeywords.some(keyword => userAgent.includes(keyword));
}

function changeTab(tab) {
    const weeklyContent = document.querySelector('.weekly-content');
    const cateContent = document.querySelector('.cate-content');
    if (tab == 'weekly') {
        weeklyContent.style.display = 'flex';
        cateContent.style.display = 'none';
    } else if (tab == 'cate') {
        weeklyContent.style.display = 'none';
        cateContent.style.display = 'block';
    }
}

function openActivity(workbook_no) {
    // 액티비티북(워크북) 콘텐츠는 별도 서버(S3)에서 제공 — 퍼블 환경에서는 미연결
    alert("준비중입니다.");
}

function openReaders(readers_no) {
    // 리더스 콘텐츠는 별도 서버(S3)에서 제공 — 퍼블 환경에서는 미연결
    alert("준비중입니다.");
}

function openMainVideo(main_video, readers_no) {
    if (main_video.trim() == "") {
        alert("준비중입니다.");
    }
    else {
        const url = `${SITE_ROOT}video.html?video_url=${encodeURIComponent(main_video)}`;
        if (isPC()) {
        window.open(url, '_blank', 'width=' + screen.width + ', height=' + screen.height + ', left=0, top=0, scrollbars=yes, resizable=yes, menubar=no, toolbar=no, location=no');
    } else {
        window.location.href = url;
    }
    }
}

function openVideo(video_no, video_url) {
    if (video_url.trim() == "") {
        alert("준비중입니다.");
    }
    else {
        const url = `${SITE_ROOT}video.html?video_no=${video_no}&video_url=${encodeURIComponent(video_url)}`;
        if (isPC()) {
        window.open(url, '_blank', 'width=' + screen.width + ', height=' + screen.height + ', left=0, top=0, scrollbars=yes, resizable=yes, menubar=no, toolbar=no, location=no');
    } else {
        window.location.href = url;
    }
    }
}

function openGame(game_url, game_no, book_no) {
    if (game_url.trim() == "") {
        alert("준비 중입니다.");
    }
    else {
        const separator = game_url.includes('?') ? '&' : '?';
        let url = game_no ? game_url + separator + 'game_no=' + game_no : game_url;
        if (book_no != null && book_no !== '') {
            url += (url.includes('?') ? '&' : '?') + 'book_no=' + encodeURIComponent(book_no);
        }
        if (isPC()) {
            window.open(url, '_blank', 'width=' + screen.width + ', height=' + screen.height + ', left=0, top=0, scrollbars=yes, resizable=yes, menubar=no, toolbar=no, location=no');
        } else {
            window.location.href = url;
        }
    }
}

function openMonthlyTest(book_no) {
    const url = `${SITE_ROOT}monthly_test/test.html?book_no=${book_no}`;
    if (isPC()) {
        window.open(url, '_blank', 'width=' + screen.width + ', height=' + screen.height + ', left=0, top=0, scrollbars=yes, resizable=yes, menubar=no, toolbar=no, location=no');
    } else {
        window.location.href = url;
    }
}


document.addEventListener('DOMContentLoaded', function () {
document.querySelectorAll('.content .unit-active').forEach(function (element) {
    element.addEventListener('click', function () {
        this.parentElement.classList.toggle('on');
    });
});
const buttons = document.querySelectorAll('main.content .btn-box-img');
const contents = document.querySelectorAll('main.content .content-area .box-content');

buttons.forEach((button, index) => {
    button.addEventListener('click', () => {

        buttons.forEach(btn => btn.classList.remove('on'));

        button.classList.add('on');

        contents.forEach(content => content.style.display = 'none');

        if (contents[index]) {
            contents[index].style.display = 'block';
            contents[index].classList.add('on');
        }
    });
});


});