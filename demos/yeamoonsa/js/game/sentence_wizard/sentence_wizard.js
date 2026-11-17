let game_bg = new Audio(`${SITE_ROOT}audio/game/sentencewizard/game_se_5.mp3`);
let g_audio = new Audio();
let round = 0;
let activeBtn = null;
let clone = null;
let answer_count = 0;
let g_correct_arr = [];
let clear = null;
let ending = null;
let introAnim = null;
let gstartAnims = {};
let scriptAudioSrc = '';
let answering = false;
let playQuestionCallback = null; // playQuestion의 콜백 저장용

// 이벤트 위임을 사용한 이벤트 리스너 등록 (한 번만 등록)
function initAnswerEvents() {
    const answerBox = document.getElementById('answer_box');
    if (!answerBox) return;
    
    /* pointerdown - 이벤트 위임 */
    answerBox.addEventListener('pointerdown', e => {
        const btn = e.target.closest('.btn-answer');
        if (!btn) return;
        
        if (e.button && e.button !== 0) return;
        e.preventDefault();

        // 버튼 클릭 시 음원 재생 (data-answer 값 사용)
        stopScriptAudio();
        // 현재 재생 중지
        g_audio.pause();
        g_audio.currentTime = 0;
        const answer = btn.dataset.answer;
        g_audio.src = `/demos/yeamoonsa/s3/game/sentencewizard/audio/${answer}.mp3`;
        safePlayGAudio();

        const r = btn.getBoundingClientRect();

        btn.dataset.originCenterX = Math.round(r.left + r.width / 2);
        btn.dataset.originCenterY = Math.round(r.top + r.height / 2);

        clone = btn.cloneNode(true);
        clone.dataset.answer = btn.dataset.answer;

        const computedStyle = window.getComputedStyle(btn);
        for (let prop of computedStyle) {
            clone.style[prop] = computedStyle.getPropertyValue(prop);
        }

        // Override positioning
        clone.style.position = 'fixed';
        clone.style.left = `${e.clientX}px`;
        clone.style.top = `${e.clientY}px`;
        clone.style.transform = 'translate(-50%, -50%)';
        clone.style.zIndex = '9999';
        clone.style.pointerEvents = 'none';
        clone.style.margin = '0';
        clone.style.cursor = 'grabbing';
        clone.style.transition = 'none';

        document.body.appendChild(clone);
        btn.style.visibility = 'hidden';

        activeBtn = btn;
        document.documentElement.classList.add('is-grabbing');
    });
}

// 로티 lazy 로딩 헬퍼
const LOTTIE_BASE = SITE_ROOT + 'js/game/sentence_wizard';
const CORRECT_PATHS1 = [
    '2-correct-1elephant.json',
    '3-correct-1drum.json',
    '4-correct-1cat.json',
    '5-correct-1train.json',
    '6-correct-1dinosaur.json'
];
const CORRECT_PATHS2 = [
    '2-correct-1dog.json',
    '3-correct-1bird.json',
    '4-correct-1ball.json',
    '5-correct-1rabbit.json',
    '6-correct-1duck.json'
];

function loadLottie(containerId, path, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    return lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: options.loop ?? false,
        autoplay: options.autoplay ?? false,
        path: LOTTIE_BASE + `/step${_step}/` + path
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // 초기에는 intro와 gstart01만 로드 (나머지는 라운드 진행 시 lazy 로드)
    introAnim = loadLottie('intro', '1-play-start-1.json', { autoplay: true });
    gstartAnims[1] = loadLottie('g_start_01', '1-play-start-2.json', { loop: true, autoplay: true });

    const gameStartBtns = document.querySelectorAll('.btn-game-start');
    const wrap = document.querySelector('.wrap');

    gameStartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.style.display = 'none';
            
            const gStart = document.querySelector(`#g_start_0${round}`);
            gStart.classList.remove('on');
            // gstart는 게임 배경으로 유지, 라운드 종료 시 해제
            if (gstartAnims[round]) {
                gstartAnims[round].stop();
            }
            wrap.classList.add('in-game');
            playQuestion((round-1), () => {
                game_bg.loop = true;
                game_bg.play();
            });
        });
    });

    initAnswerEvents();

    /* pointermove */
    document.addEventListener('pointermove', e => {
        if (!clone) return;

        clone.style.left = `${e.clientX}px`;
        clone.style.top = `${e.clientY}px`;

        const b = clone.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;

        const zones = document.querySelectorAll('.drop-zone');
        zones.forEach(zone => {
            const z = zone.getBoundingClientRect();
            if (cx >= z.left && cx <= z.right && cy >= z.top && cy <= z.bottom) {
                zone.classList.add('drag-over');
            } else {
                zone.classList.remove('drag-over');
            }
        });
    });

    /* pointerup */
    document.addEventListener('pointerup', e => {
        if (!clone || !activeBtn) return;

        let isCorrect = false;
        let hitZone = null;

        const zones = document.querySelectorAll('.drop-zone');
        zones.forEach(zone => {
            const z = zone.getBoundingClientRect();
            const b = clone.getBoundingClientRect();
            const cx = b.left + b.width / 2;
            const cy = b.top + b.height / 2;

            const hit = cx >= z.left && cx <= z.right && cy >= z.top && cy <= z.bottom;

            if (hit) {
                hitZone = zone;
                if (clone.dataset.answer === zone.dataset.target) {
                    isCorrect = true;
                }
            }

            zone.classList.remove('drag-over');
        });

        if (hitZone && isCorrect) {
            answer_count++;
            hitZone.textContent = clone.dataset.answer;
            hitZone.classList.add('correct');
            document.documentElement.classList.remove('is-grabbing');
            clone.remove();
            activeBtn.remove();
            
            playG(6, () => {
                let correct_count = document.querySelectorAll('.drop-zone').length;
                if(answer_count == correct_count){
                    game_bg.pause();
                    answering = true;
                    const btnAnswers = document.querySelectorAll('.btn-answer');
                    btnAnswers.forEach(btn => {
                        btn.classList.add('disabled');
                    });
    
                    const q_text = document.querySelector('#q_text');
                    q_text.classList.add('highlight');
                    playQuestion((round-1), () => {
                        setTimeout(() => {
                            const gameWrap = document.querySelector('#game_wrap');
                            gameWrap.classList.remove('in-game');
                            q_text.classList.remove('highlight');
        
                            playG(8);
                            const g_correct = document.querySelector(`#g_correct_0${round}`);
                            g_correct.classList.add('on');
                            g_correct_arr[round-1].goToAndPlay(0, true);
                            g_correct_arr[round-1].onComplete = () => {
                                btnAnswers.forEach(btn => {
                                    btn.classList.remove('disabled');
                                });
                                g_correct.classList.remove('on');
                                // gstart, gcorrect 애니메이션 메모리 해제
                                if (gstartAnims[round]) {
                                    gstartAnims[round].destroy();
                                    delete gstartAnims[round];
                                }
                                g_correct_arr[round-1].destroy();
                                g_correct_arr[round-1] = null;
                                answering = false;

                                if(round < 5){
                                    makeQuiz(++round);
                                    nextRound();
                                }
                                else{
                                    gameWrap.classList.add('clear');
                                    clear.goToAndPlay(0, true);
                                    playG(9, () => {
                                        reportGameComplete();
                                        gameWrap.classList.remove('clear');
                                        gameWrap.classList.add('ending');
                                        ending.goToAndPlay(0, true);
                                        playG(10);
                                    });
                                }
                            };
                        }, 1000);
                    });
                }
            });

        } else {
            playG(7);
            document.documentElement.classList.remove('is-grabbing');
            returnToOrigin(activeBtn, clone);
        }

        activeBtn = null;
        clone = null;
    });

    /* 복귀 */
    function returnToOrigin(btn, cloneEl) {
        cloneEl.style.transition = 'left 0.3s ease, top 0.3s ease, transform 0.3s ease';

        if (btn.dataset.originCenterX && btn.dataset.originCenterY) {
            cloneEl.style.left = `${btn.dataset.originCenterX}px`;
            cloneEl.style.top = `${btn.dataset.originCenterY}px`;
        }

        const onEnd = () => {
            if (document.body.contains(cloneEl)) {
                cloneEl.remove();
            }
            btn.style.visibility = '';
        };

        cloneEl.addEventListener('transitionend', onEnd, { once: true });

        setTimeout(() => {
            onEnd();
            document.documentElement.classList.remove('is-grabbing');
        }, 350);
    }

    makeQuiz(++round);

    if(isIOS()){
        makeIOSBtn(() => {
            playG(3, () => {
                const gameWrap = document.querySelector('#game_wrap');
                gameWrap.classList.remove('intro');
                // intro 애니메이션 메모리 해제
                if (introAnim) { introAnim.destroy(); introAnim = null; }
                nextRound();
            });
        });
    }
    else{
        playG(3, () => {
            const gameWrap = document.querySelector('#game_wrap');
            gameWrap.classList.remove('intro');
            // intro 애니메이션 메모리 해제
            if (introAnim) { introAnim.destroy(); introAnim = null; }
            nextRound();
        });
    }
});

function nextRound(){
    const gameWrap = document.querySelector('#game_wrap');
    const gStart = document.querySelector(`#g_start_0${round}`);
    gameWrap.classList.remove(`round-0${round-1}`);
    gameWrap.classList.add(`round-0${round}`);

    // 현재 라운드 gstart (preload 캐시 있으면 재사용)
    if (round > 1) {
        if (gstartAnims[round]) {
            gstartAnims[round].play();
        } else {
            gstartAnims[round] = loadLottie(`g_start_0${round}`, `${round}-correct-2box.json`, { loop: true, autoplay: true });
        }
    }
    // 현재 라운드 gcorrect (preload 캐시 있으면 유지)
    if (!g_correct_arr[round - 1]) {
        g_correct_arr[round - 1] = loadLottie(`g_correct_0${round}`, (_game_order == 1) ? CORRECT_PATHS1[round - 1] : CORRECT_PATHS2[round - 1]);
    }
    // 다음 라운드 미리 로드 (끊김 방지)
    if (round < 5) {
        if (!gstartAnims[round + 1]) {
            gstartAnims[round + 1] = loadLottie(`g_start_0${round + 1}`, `${round + 1}-correct-2box.json`, { loop: true, autoplay: false });
        }
        if (!g_correct_arr[round]) {
            g_correct_arr[round] = loadLottie(`g_correct_0${round + 1}`, (_game_order == 1) ? CORRECT_PATHS1[round] : CORRECT_PATHS2[round]);
        }
    }
    // 라운드 3부터 clear, ending 미리 로드
    if (round >= 3) {
        if (!clear) clear = loadLottie('clear', '7-play-clear.json');
        if (!ending) ending = loadLottie('ending', '8-ending.json');
    }

    gStart.classList.add('on');
    answer_count = 0;
    playG(4);
}

function makeQuiz(round){
    const qNumber = document.getElementById('q_number');
    const qText = document.getElementById('q_text');
    const qImg = document.getElementById('q_img');
    const answerBox = document.getElementById('answer_box');
    qNumber.textContent = `${round}.`;
    qImg.src = `/demos/yeamoonsa/s3/game/sentencewizard/img/${game_content[round-1].img}`;
    
    let contentArr = game_content[round-1].script.split("/");
    let targetArr = contentArr[1].split(",");
    let text = contentArr[0];
    let targetIndex = 0;
    
    // _ 를 순서대로 치환하면서 data-target에 split한 값을 넣기
    qText.innerHTML = text.replace(/_/g, () => {
        const target = targetArr[targetIndex++];
        return `<i class="drop-zone" data-target="${target}"></i>`;
    });
    
    // answerBox 초기화 및 contentArr[2]부터 끝까지 버튼 생성
    let buttonsHTML = '';
    for (let i = 2; i < contentArr.length; i++) {
        const answer = contentArr[i];
        buttonsHTML += `
            <button type="button" data-answer="${answer}" class="btn-answer">
                <span>${answer}</span>
                <div class="layered-shadow layered-shadow1"></div>
                <div class="layered-shadow layered-shadow2"></div>
            </button>
        `;
    }
    answerBox.innerHTML = buttonsHTML;
    
    // 스크립트 오디오 src 저장
    scriptAudioSrc = `/demos/yeamoonsa/s3/game/sentencewizard/audio/${game_content[round-1].audio}`;
}

function stopScriptAudio(){
    const scriptBtn = document.querySelector('.question-box button[onclick*="playScript"]');
    if(scriptBtn && scriptBtn.classList.contains('stop')){
        g_audio.pause();
        scriptBtn.classList.remove('stop');
    }
}

// g_audio.onended를 통합 관리하는 헬퍼 함수
function setGAudioOnEnded(callback) {
    g_audio.onended = () => {
        // playQuestion의 콜백이 있으면 먼저 실행
        if(playQuestionCallback) {
            const cb = playQuestionCallback;
            playQuestionCallback = null; // 콜백 실행 후 초기화
            cb();
        }
        // 그 다음 전달받은 콜백 실행
        if(callback) {
            callback();
        }
    };
}

// g_audio를 안전하게 재생하는 헬퍼 함수 (AbortError 방지)
function safePlayGAudio() {
    // play() Promise의 AbortError 무시
    const playPromise = g_audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            // AbortError는 정상적인 동작이므로 무시
            if (error.name !== 'AbortError') {
                console.error('Audio play error:', error);
            }
        });
    }
}

function playScript(btn){
    if(answering) return;

    // g_audio.src가 스크립트 오디오인지 확인
    if(g_audio.src.endsWith(scriptAudioSrc.split('/').pop())){
        // 이미 스크립트 오디오가 로드되어 있음
        if(btn.classList.contains('stop')){
            // 일시정지
            g_audio.pause();
            btn.classList.remove('stop');
        }
        else{
            // 재생
            safePlayGAudio();
            btn.classList.add('stop');
        }
    }
    else{
        // 스크립트 오디오가 아니면 src 설정하고 재생
        // 현재 재생 중지
        g_audio.pause();
        g_audio.currentTime = 0;
        g_audio.src = scriptAudioSrc;
        setGAudioOnEnded(() => {
            btn.classList.remove('stop');
        });
        safePlayGAudio();
        btn.classList.add('stop');
        return; // onended는 이미 설정했으므로 return
    }

    // 이미 스크립트 오디오가 로드되어 있는 경우에도 onended 설정
    setGAudioOnEnded(() => {
        btn.classList.remove('stop');
    });
}

function playQuestion(index, callback){
    stopScriptAudio();
    // 현재 재생 중지
    g_audio.pause();
    g_audio.currentTime = 0;
    // 콜백 저장
    playQuestionCallback = callback || null;
    g_audio.src = `/demos/yeamoonsa/s3/game/sentencewizard/audio/${game_content[index].audio}`;
    // g_audio.onended 설정 (통합 관리)
    setGAudioOnEnded(null);
    safePlayGAudio();
}

function playG(index, callback){
    stopScriptAudio();
    // 현재 재생 중지
    g_audio.pause();
    g_audio.currentTime = 0;
    g_audio.src = `${SITE_ROOT}audio/game/sentencewizard/game_se_${index}.mp3`;
    setGAudioOnEnded(callback || null);
    safePlayGAudio();
}

function exitModal(){
    document.getElementById('exit_modal').classList.add('open');
}

function cancelExit(){
    document.getElementById('exit_modal').classList.remove('open');
}

function applyExit(){
    if (isPC()) {
        self.close();
    } else {
        window.location.href = getContentUrlForExit(getBookNoFromUrl());
    }
}

function retry(){
    let path = window.location.pathname.split('/');
    path[path.length - 1] = 'intro.html';
    redirectToWithBookNo(path.join('/'));
}