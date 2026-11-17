document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG' && !e.target.src.endsWith('/img/ready_error.png')) {
        e.target.src = SITE_ROOT + 'img/ready_error.png';
    }
}, true);

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

function openReaders(readers_no){
    // 리더스 콘텐츠는 별도 서버(S3)에서 제공 — 퍼블 환경에서는 미연결
    alert("준비중입니다.");
}

function logoutModal(){
    document.getElementById('logout_modal').classList.add('open');
}

function cancelLogout(){
    document.getElementById('logout_modal').classList.remove('open');
}

function applyLogout(){
    window.location.href = SITE_ROOT + "login.html";
}