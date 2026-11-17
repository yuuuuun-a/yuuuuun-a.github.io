(function (global) {
    'use strict';

    const TARGET_FPS = 60;
    const speedRatio = 0.0025; // 트랙 너비의 0.2%만큼 이동

    const AUDIO_BASE = '/demos/yeamoonsa/s3/game/phonicstime';
    const AUDIO_BG = SITE_ROOT + 'audio/game/phonicstime/game_pt_3.mp3';

    let cfg = null;

    // audio
    let game_bg = null;
    let q_audio = null;
    let g_audio = null;
    let c_audio = null;

    // track/round
    let track = null;
    let cards = null;
    let running = false;
    let lastLoopTime = 0;
    let trackWidth = 0;
    let eventing = false;

    let round = 0;
    let mode = [];
    let answer = [];
    let answer_count = 0;

    // intro slider
    let ani1 = null, ani2 = null, ani3 = null, ani4 = null, ani5 = null;
    let introPlaying = false;
    let introPaused = false;
    let introCurrent = 0;
    let introLastTime = 0;

    function init(cfgInput) {
        if (!cfgInput
            || (cfgInput.step !== 1 && cfgInput.step !== 2 && cfgInput.step !== 3)
            || !Array.isArray(cfgInput.questionArr)
            || cfgInput.questionArr.length < 1
            || !Array.isArray(cfgInput.answerArr)
            || cfgInput.answerArr.length !== cfgInput.questionArr.length) {
            // eslint-disable-next-line no-console
            console.error('PhonicsTime.init: invalid config', cfgInput);
            return;
        }

        cfg = cfgInput;

        // expose onclick handlers (templates은 onclick으로 호출)
        global.exitModal = exitModal;
        global.cancelExit = cancelExit;
        global.applyExit = applyExit;
        global.keepgoing = keepgoing;
        global.retry = retry;

        const boot = () => {
            mode = cfg.questionArr;
            answer = cfg.answerArr;

            game_bg = new Audio(AUDIO_BG);
            q_audio = new Audio();
            g_audio = new Audio();
            c_audio = new Audio();

            ani1 = lottie.loadAnimation({
                container: document.getElementById('play_start'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: `${SITE_ROOT}js/game/phonics_time/step${cfg.step}/2-1-play-start-2s.json`
            });
            ani2 = lottie.loadAnimation({
                container: document.getElementById('conveyor_belt'),
                renderer: 'svg',
                loop: true,
                autoplay: false,
                path: `${SITE_ROOT}js/game/phonics_time/2-0-conveyor_belt-1s.json`
            });
            ani3 = lottie.loadAnimation({
                container: document.getElementById('play_incorrect'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: `${SITE_ROOT}js/game/phonics_time/step${cfg.step}/2-2-play-incorrect-2s.json`
            });
            ani4 = lottie.loadAnimation({
                container: document.getElementById('play_fin'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: `${SITE_ROOT}js/game/phonics_time/step${cfg.step}/2-3-play-fin-2s.json`
            });
            ani5 = lottie.loadAnimation({
                container: document.getElementById('play_ending'),
                renderer: 'svg',
                loop: false,
                autoplay: false,
                path: `${SITE_ROOT}js/game/phonics_time/step${cfg.step}/3-0-ending-full.json`
            });

            makeCards();

            track = document.querySelector('.rolling-track');
            cards = Array.from(track.children);
            layoutCards();
            requestAnimationFrame(loop);

            // 카드 클릭 시 멈췄다가 재시작
            document.querySelectorAll('.btn-card').forEach((btn) => {
                btn.addEventListener('click', () => checkAnswer(btn));
            });

            const basket_list = document.querySelector('#basket_list');
            const phonics_list = document.querySelector('#phonics_list');
            document.querySelector('#speech_bubble_text').innerHTML =
                (cfg.step === 1)
                    ? `Which word starts with <em>/${mode[0]}/</em> sound?<br>Put it in the basket!`
                    : `Which word has <em>/${mode[0]}/</em> sound?<br>Put it in the basket!`;

            basket_list.innerHTML = mode.map((m, i) => `
                <li${i === 0 ? ' class="ing"' : ''}>
                    <img src="${SITE_ROOT}img/game/phonics_time/basket-small-01.png" alt="basket">
                    <div class="text-stroke-wrap">
                        <span class="front">${m}</span>
                        <span class="back">${m}</span>
                    </div>
                </li>`).join('');
            phonics_list.innerHTML = mode.map((m) => `
                <li>
                    <div class="text-stroke-wrap">
                        <span class="front">${m}</span>
                        <span class="back">${m}</span>
                    </div>
                </li>`).join('');

            const content_div = document.querySelector('#content_div');

            if (isIOS()) {
                makeIOSBtn(() => {
                    playQuestion(() => {
                        game_bg.play();
                        game_bg.loop = true;
                        content_div.classList.remove('start');
                        introSlideStart();
                    });
                });
            } else {
                playQuestion(() => {
                    game_bg.play();
                    game_bg.loop = true;
                    content_div.classList.remove('start');
                    introSlideStart();
                });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot, { once: true });
        } else {
            boot();
        }
    }

    function makeCards() {
        const rolling_track = document.querySelector('.rolling-track');
        rolling_track.innerHTML = '';

        if (typeof game_content === 'undefined' || !Array.isArray(game_content)) {
            // eslint-disable-next-line no-console
            console.error('PhonicsTime: game_content is not available');
            return;
        }

        let card_html = '';
        game_content.forEach((item) => {
            if (item.order_no == (round + 1)) {
                q_audio.src = `${AUDIO_BASE}/audio/${item.audio}`;
                card_html += `<div class="card">
                    <button type="button" class="btn-card">
                        <img src="${AUDIO_BASE}/img/${item.img}" alt="${item.script}">
                        <i></i>
                        <span data-text="${item.script}">${item.script}</span>
                    </button>
                </div>`;
            }
        });
        rolling_track.innerHTML = card_html;
    }

    function exitModal() {
        document.getElementById('exit_modal').classList.add('open');
    }

    function cancelExit() {
        document.getElementById('exit_modal').classList.remove('open');
    }

    function applyExit() {
        if (isPC()) {
            self.close();
        } else {
            redirectToContent();
        }
    }

    function playG(index, callback) {
        g_audio.src = `${SITE_ROOT}audio/game/phonicstime/game_pt_${index}.mp3`;
        g_audio.onended = callback || null;
        g_audio.play();
    }

    function playQuestion(callback) {
        q_audio.onended = callback || null;
        q_audio.play();
    }

    function playCard(word, callback) {
        c_audio.src = `${AUDIO_BASE}/audio/${word}.mp3`;
        c_audio.onended = callback || null;
        c_audio.play();
    }

    function checkAnswer(card) {
        if (eventing) return;
        eventing = true;

        stopRolling();
        game_bg.pause();
        card.classList.add('out');

        const content_div = document.querySelector('#content_div');
        const cardImg = card.querySelector('img');
        const cardAlt = cardImg.alt;

        if (answer[round].includes(cardAlt)) {
            answer_count++;
            playCard(cardAlt, () => {
                const basket_img = document.querySelector('#basket_img');
                basket_img.src = `${SITE_ROOT}img/game/phonics_time/step${cfg.step}/basket-big-${answer_count}.png`;

                playG(6, () => {
                    playCard(cardAlt);

                    const card_wrap = document.querySelector('#card_wrap');
                    const card_img = card_wrap.querySelector('#card_img');
                    const card_word = card_wrap.querySelector('#card_word');
                    const card_listen = card_wrap.querySelector('#card_listen');

                    // 카드에 표시되는 border color를 유지하기 위해 현재 DOM 스타일을 복사
                    const cardI = card.querySelector('i');
                    const cardImgClone = cardImg.cloneNode(true);
                    const cardIClone = cardI.cloneNode(true);
                    const cardIStyle = window.getComputedStyle(cardI);
                    cardIClone.style.borderColor = cardIStyle.borderColor;

                    card_img.innerHTML = '';
                    card_img.appendChild(cardImgClone);
                    card_img.appendChild(cardIClone);
                    card_word.textContent = cardAlt;
                    card_wrap.classList.add('on');
                    eventing = false;

                    c_audio.onended = () => {
                        card_listen.classList.remove('on');
                    };

                    card_listen.onclick = () => {
                        if (card_listen.classList.contains('on')) {
                            card_listen.classList.remove('on');
                            c_audio.pause();
                        } else {
                            card_listen.classList.add('on');
                            c_audio.play();
                        }
                    };
                });
            });
        } else {
            playCard(cardAlt, () => {
                content_div.classList.add('try-again');
                playG(5, () => {
                    content_div.classList.remove('try-again');
                    startRolling();
                    game_bg.play();
                    eventing = false;
                });
            });
        }
    }

    function keepgoing() {
        const content_div = document.querySelector('#content_div');
        const basket_list = document.querySelector('#basket_list');
        const card_wrap = document.querySelector('#card_wrap');
        card_wrap.classList.remove('on');

        playG(2);

        const maxCount = cfg.answerArr[round].split('/').length;
        if (answer_count === maxCount) {
            if (round < mode.length - 1) {
                document.querySelector('.sd-wrap').classList.remove('on');
                content_div.classList.add('fin');

                playG(7, () => {
                    const busketLi = basket_list.querySelectorAll('li');
                    const prevRound = round;
                    busketLi[prevRound].classList.remove('ing');
                    busketLi[prevRound].classList.add('end');
                    round++;
                    busketLi[round].classList.add('ing');

                    content_div.classList.remove('fin');
                    answer_count = 0;

                    makeCards();
                    track = document.querySelector('.rolling-track');
                    cards = Array.from(track.children);
                    layoutCards();

                    document.querySelectorAll('.btn-card').forEach((btn) => {
                        btn.addEventListener('click', () => checkAnswer(btn));
                    });

                    const basket_img = document.querySelector('#basket_img');
                    basket_img.src = `${SITE_ROOT}img/game/phonics_time/step${cfg.step}/basket-big-0.png`;

                    document.querySelector('#speech_bubble_text').innerHTML =
                        (cfg.step === 1)
                            ? `Which word starts with <em>/${mode[round]}/</em> sound?<br>Put it in the basket!`
                            : `Which word has <em>/${mode[round]}/</em> sound?<br>Put it in the basket!`;

                    content_div.classList.add('start');
                    content_div.classList.remove(`phonics-0${prevRound + 1}`);
                    content_div.classList.add(`phonics-0${round + 1}`);

                    playQuestion(() => {
                        game_bg.play();
                        game_bg.loop = true;

                        content_div.classList.remove('start');
                        introSlideStart();
                    });
                });
            } else {
                reportGameComplete();
                content_div.classList.add('ending');
                ani5.play();
                playG(8);
            }
        } else {
            startRolling();
            game_bg.play();
        }
    }

    function retry() {
        const path = window.location.pathname.split('/');
        path[path.length - 1] = 'intro.html';
        redirectToWithBookNo(path.join('/'));
    }

    // 초기 카드 배치
    function layoutCards() {
        const shuffled = [...cards];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        shuffled.forEach((card) => track.appendChild(card));
        cards = shuffled;

        let x = 0;
        cards.forEach((card) => {
            card.style.position = 'absolute';
            card.style.left = x + 'px';
            x += card.offsetWidth;
        });
        trackWidth = x;
    }

    function loop(now) {
        requestAnimationFrame(loop);

        if (!running) {
            lastLoopTime = now || 0;
            return;
        }
        if (!now) return;
        if (!lastLoopTime) lastLoopTime = now;

        const dt = Math.min((now - lastLoopTime) / 1000, 0.1);
        lastLoopTime = now;

        const pxPerSec = track.offsetWidth * speedRatio * TARGET_FPS;
        const step = pxPerSec * dt;

        cards.forEach((card) => {
            let current = parseFloat(card.style.left) || 0;
            current += step;

            if (current >= track.offsetWidth) {
                current -= trackWidth;
            }
            card.style.left = current + 'px';
        });
    }

    function stopRolling() {
        running = false;
        if (ani2) ani2.pause();
        introSlideStop();
    }

    function startRolling() {
        if (introPlaying && introPaused) {
            introSlideResume();
            return;
        }
        if (introPlaying) return;

        running = true;
        if (ani2) ani2.play();
    }

    function introSlideStart() {
        const sd = document.querySelector('.sd-wrap');
        introPlaying = true;
        introPaused = false;

        if (ani2) ani2.play();

        const offset = trackWidth;
        const pxPerSec = track.offsetWidth * speedRatio * TARGET_FPS;

        introCurrent = -offset;
        introLastTime = 0;

        sd.classList.add('on');
        sd.style.transform = `translateX(${introCurrent}px)`;

        function animate(now) {
            if (introPaused) {
                introLastTime = now || 0;
                return;
            }
            if (!now) return;
            if (!introLastTime) introLastTime = now;

            const dt = Math.min((now - introLastTime) / 1000, 0.1);
            introLastTime = now;

            introCurrent += pxPerSec * dt;

            if (introCurrent < 0) {
                sd.style.transform = `translateX(${introCurrent}px)`;
                requestAnimationFrame(animate);
            } else {
                sd.style.transform = 'translateX(0px)';
                introPlaying = false;
                running = true;
                if (ani2) ani2.play();
            }
        }

        requestAnimationFrame(animate);
    }

    function introSlideStop() {
        if (!introPlaying) return;
        introPaused = true;
    }

    function introSlideResume() {
        if (!introPlaying || !introPaused) return;

        introPaused = false;
        if (ani2) ani2.play();

        const sd = document.querySelector('.sd-wrap');
        const pxPerSec = track.offsetWidth * speedRatio * TARGET_FPS;

        introLastTime = 0;

        function animate(now) {
            if (introPaused) {
                introLastTime = now || 0;
                return;
            }
            if (!now) return;
            if (!introLastTime) introLastTime = now;

            const dt = Math.min((now - introLastTime) / 1000, 0.1);
            introLastTime = now;

            introCurrent += pxPerSec * dt;

            if (introCurrent < 0) {
                sd.style.transform = `translateX(${introCurrent}px)`;
                requestAnimationFrame(animate);
            } else {
                sd.style.transform = 'translateX(0px)';
                introPlaying = false;
                running = true;
                if (ani2) ani2.play();
            }
        }

        requestAnimationFrame(animate);
    }

    global.PhonicsTime = { init };
})(typeof window !== 'undefined' ? window : this);

