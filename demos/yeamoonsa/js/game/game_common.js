/**
 * 게임 공통
 */

/** PC 여부 (모바일 키워드 미포함 시 true) */
function isPC() {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'mobile'];
    const isMobileKeyword = mobileKeywords.some(keyword => userAgent.includes(keyword));
    // iOS 13+ iPad Safari reports Macintosh UA — treat as mobile
    const isMacWithTouch = userAgent.includes('macintosh') && navigator.maxTouchPoints > 1;
    return !isMobileKeyword && !isMacWithTouch;
}

function isIOS(){
    const userAgent = navigator.userAgent.toLowerCase();
    const isAppleDevice = userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod');
    // iOS 13+ iPad Safari reports Macintosh UA — detect by touch support
    const isMacWithTouch = userAgent.includes('macintosh') && navigator.maxTouchPoints > 1;
    return isAppleDevice || isMacWithTouch;
}

/**
 * 모바일 나가기 시 복귀할 content URL
 * - 반드시 bookNo를 인자로 받아, 전달된 값으로만 이동한다.
 * - URL 쿼리는 intro->content, retry, result 이동까지 모두 유지되어야 한다.
 */
function getContentUrlForExit(bookNo) {
    if (bookNo == null || bookNo === '') {
        throw new Error('getContentUrlForExit(bookNo) : bookNo is required');
    }
    return SITE_ROOT + 'content.html?book_no=' + encodeURIComponent(bookNo);
}

/**
 * 현재 URL 쿼리에서 book_no를 읽어온다.
 * - book_no가 없으면 예외를 던져 "유지 누락"을 바로 드러낸다.
 */
function getBookNoFromUrl() {
    const params = new URLSearchParams(window.location.search);
    // 퍼블 환경: book_no 없이 바로 열어도 동작하도록 기본값 1
    return params.get('book_no') || params.get('bookNo') || '1';
}

let _cachedBookNo = null;

/**
 * 현재 페이지의 book_no를 1회만 파싱해 캐싱한다.
 * (페이지 이동/리로드가 발생하면 캐시는 초기화된다.)
 */
function getBookNo() {
    if (_cachedBookNo == null) {
        _cachedBookNo = getBookNoFromUrl();
    }
    return _cachedBookNo;
}

/**
 * 전달된 URL에 book_no 쿼리가 없으면 붙인다.
 * - url에 이미 `book_no=` 또는 `bookNo=`가 있으면 그대로 둔다.
 */
function appendBookNo(url, bookNo) {
    if (url.includes('book_no=') || url.includes('bookNo=')) return url;

    const safeBookNo = (bookNo != null && bookNo !== '') ? bookNo : getBookNo();
    const separator = url.includes('?') ? '&' : '?';
    return url + separator + 'book_no=' + encodeURIComponent(safeBookNo);
}

function redirectToContent() {
    window.location.href = getContentUrlForExit(getBookNo());
}

function redirectToWithBookNo(url) {
    window.location.href = appendBookNo(url, getBookNo());
}

function makeIOSBtn(callback){
    const iosListeningBtnArea = document.createElement('div');
    iosListeningBtnArea.className = 'ios-listening-btn-area';
    iosListeningBtnArea.innerHTML = `
      <button type="button" class="ios-btn-listening">
        <i class="icon-listening"></i>
        <div class="layered-shadow layered-shadow1"></div>
        <div class="layered-shadow layered-shadow2"></div>
        <div class="layered-shadow layered-shadow3"></div>
      </button>
    `;
  
    const wrap = document.querySelector('.wrap');
    (wrap || document.body).appendChild(iosListeningBtnArea);

    const btn = iosListeningBtnArea.querySelector('.ios-btn-listening');
    btn.addEventListener('click', () => {
        iosListeningBtnArea.remove();
        if (typeof callback === 'function') callback();
    });
}