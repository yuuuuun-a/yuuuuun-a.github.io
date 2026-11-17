/**
 * 학습 완료 카운트 및 학습 시간 공통 함수
 * 게임 완료 시점에 reportGameComplete() 호출
 * (퍼블 환경: 서버 API 없이 콘솔 로그만 남김)
 */

let _hasReportedGameComplete = false;
let _gameStudyTimeSeconds = 0;
let _gameStudyTimeInterval = null;
let _hasReportedGameTime = false;

function startGameStudyTimer() {
    if (_gameStudyTimeInterval) return;
    _gameStudyTimeInterval = setInterval(() => {
        _gameStudyTimeSeconds++;
    }, 1000);
}

function stopGameStudyTimer() {
    if (_gameStudyTimeInterval) {
        clearInterval(_gameStudyTimeInterval);
        _gameStudyTimeInterval = null;
    }
}

function reportGameTime() {
    if (_hasReportedGameTime || _gameStudyTimeSeconds <= 0) {
        return Promise.resolve({ success: true });
    }
    _hasReportedGameTime = true;
    stopGameStudyTimer();
    console.log(`🎮 게임 학습 시간 ${_gameStudyTimeSeconds}초`);
    return Promise.resolve({ success: true });
}

function reportGameComplete() {
    if (_hasReportedGameComplete) return Promise.resolve({ success: true });
    _hasReportedGameComplete = true;
    reportGameTime();
    console.log('🎮 게임 완료');
    return Promise.resolve({ success: true });
}

document.addEventListener('DOMContentLoaded', function () {
    startGameStudyTimer();
});

window.reportGameComplete = reportGameComplete;
window.startGameStudyTimer = startGameStudyTimer;
window.stopGameStudyTimer = stopGameStudyTimer;
window.reportGameTime = reportGameTime;
