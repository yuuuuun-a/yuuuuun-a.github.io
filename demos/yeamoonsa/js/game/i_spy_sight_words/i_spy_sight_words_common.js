(function (global) {
    'use strict';

    const ASSET_BASE = SITE_ROOT + 'js/game/i_spy_sight_words';

    let gameCfg = null;

    let game_bg;
    let g_audio;
    let q_audio;
    let word_audio;
    let round = 0;
    let questionArr = [];
    let answerArr = [];

    let currentPosition = null;
    let currentCount = 0;
    let answerCount = 0;
    let wrongCount = 0;

    let ani1, ani2, ani3, ani4, ani5, ani6, ani7;
    let aniLeft, aniCenter, aniRight, aniLeftw, aniCenterw, aniRightw;
    let corRectArr = [null, null, null, null, null];
    let incorRectArr = [null, null, null, null];
    let dropArr = [null, null, null, null, null];
    let dropArrBg = [null, null, null, null, null];

    let correctBgAni = null;
    let incorrectBgAni = null;

    function stepPath() {
        return `${ASSET_BASE}/step${gameCfg.assets.step}`;
    }

    function characterDropFile() {
        if (gameCfg.assets.characterDropFile) {
            return gameCfg.assets.characterDropFile;
        }
        return '0-character-drop.json';
    }

    function fishingPortPath() {
        return `${ASSET_BASE}/2-play-ShinyFishingPort-${gameCfg.assets.fishingPort}.json`;
    }

    function boot() {
        game_bg = new Audio(SITE_ROOT + 'audio/game/ispysightwords/game_sw_4.mp3');
        g_audio = new Audio();
        q_audio = new Audio();
        word_audio = new Audio();

        global.document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.ico-fish-play');
            if (btn && btn.dataset.word != null) playWord(btn.dataset.word);
        });

        ani1 = lottie.loadAnimation({
            container: document.getElementById('play_bg'),
            renderer: 'svg',
            loop: true,
            autoplay: false,
            path: `${ASSET_BASE}/play_bg.json`
        });
        ani2 = lottie.loadAnimation({
            container: document.getElementById('character_intro'),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: `${stepPath()}/0-character-intro.json`
        });
        ani1.play();
        ani2.play();
        ani5 = lottie.loadAnimation({
            container: document.getElementById('fishingport'),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: fishingPortPath()
        });

        updateProgress(0);

        if (isIOS()) {
            makeIOSBtn(() => {
                playG(3, () => {
                    const fishingport = document.querySelector('#fishingport');
                    fishingport.classList.add('on');
                    ani5.play();
                    ani5.onComplete = () => {
                        fishingport.classList.remove('on');
                        game_bg.loop = true;
                        game_bg.play();

                        const gameWrap = document.querySelector('#game_wrap');
                        gameWrap.classList.remove('intro');
                        gameWrap.classList.add('in-game');

                        loadGameAnimations();
                        makeFishList();
                    };
                });
            });
        } else {
            playG(3, () => {
                const fishingport = document.querySelector('#fishingport');
                fishingport.classList.add('on');
                ani5.play();
                ani5.onComplete = () => {
                    fishingport.classList.remove('on');
                    game_bg.loop = true;
                    game_bg.play();

                    const gameWrap = document.querySelector('#game_wrap');
                    gameWrap.classList.remove('intro');
                    gameWrap.classList.add('in-game');

                    loadGameAnimations();
                    makeFishList();
                };
            });
        }
    }

    function loadGameAnimations() {
        ani3 = lottie.loadAnimation({
            container: document.getElementById('character_drop'),
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: `${stepPath()}/${characterDropFile()}`
        });
        ani4 = lottie.loadAnimation({
            container: document.getElementById('bobber_d'),
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: `${ASSET_BASE}/2-bobber-default.json`
        });
        ani6 = lottie.loadAnimation({
            container: document.getElementById('character_wiggle'),
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: `${stepPath()}/0-character-wiggle.json`
        });
        ani7 = lottie.loadAnimation({
            container: document.getElementById('click_a'),
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: `${ASSET_BASE}/click_animation.json`
        });
        document.getElementById('bobber_d').classList.add('on');
    }

    function loadBobberAni(position) {
        if (position === 'left') {
            if (!aniLeft) {
                aniLeft = lottie.loadAnimation({
                    container: document.getElementById('bobber_left_drop'),
                    renderer: 'svg',
                    loop: false,
                    autoplay: false,
                    path: `${ASSET_BASE}/2-bobber-left-drop.json`
                });
            }
            if (!aniLeftw) {
                aniLeftw = lottie.loadAnimation({
                    container: document.getElementById('bobber_left_wiggle'),
                    renderer: 'svg',
                    loop: true,
                    autoplay: false,
                    path: `${ASSET_BASE}/2-bobber-left-wiggle.json`
                });
            }
            return { drop: aniLeft, wiggle: aniLeftw };
        }
        if (position === 'center') {
            if (!aniCenter) {
                aniCenter = lottie.loadAnimation({
                    container: document.getElementById('bobber_center_drop'),
                    renderer: 'svg',
                    loop: false,
                    autoplay: false,
                    path: `${ASSET_BASE}/2-bobber-center-drop.json`
                });
            }
            if (!aniCenterw) {
                aniCenterw = lottie.loadAnimation({
                    container: document.getElementById('bobber_center_wiggle'),
                    renderer: 'svg',
                    loop: true,
                    autoplay: false,
                    path: `${ASSET_BASE}/2-bobber-center-wiggle.json`
                });
            }
            return { drop: aniCenter, wiggle: aniCenterw };
        }
        if (position === 'right') {
            if (!aniRight) {
                aniRight = lottie.loadAnimation({
                    container: document.getElementById('bobber_right_drop'),
                    renderer: 'svg',
                    loop: false,
                    autoplay: false,
                    path: `${ASSET_BASE}/2-bobber-right-drop.json`
                });
            }
            if (!aniRightw) {
                aniRightw = lottie.loadAnimation({
                    container: document.getElementById('bobber_right_wiggle'),
                    renderer: 'svg',
                    loop: true,
                    autoplay: false,
                    path: `${ASSET_BASE}/2-bobber-right-wiggle.json`
                });
            }
            return { drop: aniRight, wiggle: aniRightw };
        }
    }

    function loadCorrectAni(index) {
        if (corRectArr[index]) return corRectArr[index];
        const isPortB = gameCfg && gameCfg.assets && gameCfg.assets.fishingPort === 'B';
        const paths = isPortB
            ? [
                null,
                `${ASSET_BASE}/3-correct-5crab.json`,
                `${ASSET_BASE}/3-correct-6blowfish.json`,
                `${ASSET_BASE}/3-correct-7jellyfish.json`,
                `${ASSET_BASE}/3-correct-8kissingGourami.json`
            ]
            : [
                null,
                `${ASSET_BASE}/3-correct-1octopus.json`,
                `${ASSET_BASE}/3-correct-2tropicalFish.json`,
                `${ASSET_BASE}/3-correct-3nemo.json`,
                `${ASSET_BASE}/3-correct-4seahorse.json`
            ];
        if (!correctBgAni) {
            correctBgAni = lottie.loadAnimation({
                container: document.getElementById('correct_bg'),
                renderer: 'canvas',
                loop: false,
                autoplay: false,
                path: `${ASSET_BASE}/3-correct-0bg.json`
            });
        }
        corRectArr[index] = lottie.loadAnimation({
            container: document.getElementById(`correct_0${index}`),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: paths[index]
        });
        return corRectArr[index];
    }

    function loadIncorrectAni(index) {
        if (incorRectArr[index]) return incorRectArr[index];
        const paths = [
            `${ASSET_BASE}/3-incorrect-can.json`,
            `${ASSET_BASE}/3-incorrect-duck.json`,
            `${ASSET_BASE}/3-incorrect-shoe.json`,
            `${ASSET_BASE}/3-incorrect-wheel.json`
        ];
        if (!incorrectBgAni) {
            incorrectBgAni = lottie.loadAnimation({
                container: document.getElementById('incorrect_bg'),
                renderer: 'svg',
                loop: false,
                autoplay: false,
                path: `${ASSET_BASE}/3-incorrect-bg.json`
            });
        }
        incorRectArr[index] = lottie.loadAnimation({
            container: document.getElementById(`incorrect_0${index + 1}`),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: paths[index]
        });
        return incorRectArr[index];
    }

    function loadDropAni(index) {
        if (dropArr[index]) return dropArr[index];
        const isPortB = gameCfg && gameCfg.assets && gameCfg.assets.fishingPort === 'B';
        const endingPrefix = isPortB ? 'B' : 'A';
        const paths = [
            `${ASSET_BASE}/ending-${endingPrefix}0-cheerup.json`,
            `${ASSET_BASE}/ending-${endingPrefix}1-cheerup.json`,
            `${ASSET_BASE}/ending-${endingPrefix}2-goodjob.json`,
            `${ASSET_BASE}/ending-${endingPrefix}3-goodjob.json`,
            `${ASSET_BASE}/ending-${endingPrefix}4-excellent.json`
        ];
        dropArr[index] = lottie.loadAnimation({
            container: document.getElementById(`drop_0${index}`),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: paths[index]
        });
        return dropArr[index];
    }

    function loadDropAniBg(index) {
        if (dropArrBg[index]) return dropArrBg[index];
        const paths = [
            `${ASSET_BASE}/ending-bg-ab0.json`,
            `${ASSET_BASE}/ending-bg-ab123.json`,
            `${ASSET_BASE}/ending-bg-ab123.json`,
            `${ASSET_BASE}/ending-bg-ab123.json`,
            `${ASSET_BASE}/ending-bg-ab4.json`
        ];
        dropArrBg[index] = lottie.loadAnimation({
            container: document.getElementById(`drop_0${index}_bg`),
            renderer: 'canvas',
            loop: false,
            autoplay: false,
            path: paths[index]
        });
        return dropArrBg[index];
    }

    function updateProgress(value) {
        const progress = document.getElementById('fishProgress');
        progress.value = value;
        progress.classList.toggle('is-zero', value === 0);
    }

    function playWord(word) {
        word_audio.pause();
        word_audio.src = `/demos/yeamoonsa/s3/game/ispysightwords/audio/${word}.mp3`;
        word_audio.play().catch(e => { if (e.name !== 'AbortError') console.error(e); });
    }

    function selectFish(btn) {
        const positionClasses = ['left', 'center', 'right'];
        const wrap = document.querySelector('#game_wrap');

        if (ani4) {
            ani4.stop();
            document.getElementById('bobber_d').classList.remove('on');
        }

        const li = btn.closest('li');
        const index = Array.from(li.parentElement.children).indexOf(li);
        const targetClass = positionClasses[index];

        const bobberEls = {
            left: {
                dropEl: document.getElementById('bobber_left_drop'),
                wiggleEl: document.getElementById('bobber_left_wiggle')
            },
            center: {
                dropEl: document.getElementById('bobber_center_drop'),
                wiggleEl: document.getElementById('bobber_center_wiggle')
            },
            right: {
                dropEl: document.getElementById('bobber_right_drop'),
                wiggleEl: document.getElementById('bobber_right_wiggle')
            }
        };

        if (!targetClass) return;

        if (currentPosition !== targetClass) {
            currentPosition = targetClass;
            currentCount = 0;
            updateProgress(0);
        }

        if (currentCount < 6) {
            let selectAnswer = btn.querySelector('span').textContent;
            currentCount += 1;
            if (currentCount == 1) {
                word_audio.pause();
                word_audio.src = `/demos/yeamoonsa/s3/game/ispysightwords/audio/${selectAnswer}.mp3`;
                word_audio.play().catch(e => { if (e.name !== 'AbortError') console.error(e); });
            } else {
                playG(5);
            }
            updateProgress(Math.round((currentCount / 6) * 100));

            if (currentCount === 6) {
                const fishbowlBox = document.querySelector('.fishbowl-box');
                if (selectAnswer === questionArr[round]) {
                    playG(6);
                    answerCount++;
                    if (ani7) { ani7.stop(); document.getElementById('click_a').classList.remove('on'); }
                    Object.values(bobberEls).forEach(({ dropEl, wiggleEl }) => {
                        dropEl.classList.remove('on');
                        wiggleEl.classList.remove('on');
                    });
                    if (aniLeft) { aniLeft.destroy(); aniLeft = null; }
                    if (aniLeftw) { aniLeftw.destroy(); aniLeftw = null; }
                    if (aniCenter) { aniCenter.destroy(); aniCenter = null; }
                    if (aniCenterw) { aniCenterw.destroy(); aniCenterw = null; }
                    if (aniRight) { aniRight.destroy(); aniRight = null; }
                    if (aniRightw) { aniRightw.destroy(); aniRightw = null; }

                    let correctAniEl = document.querySelector(`#correct_0${answerCount}`);
                    correctAniEl.classList.add('on');
                    let corAni = loadCorrectAni(answerCount);
                    document.getElementById('correct_bg').classList.add('on');
                    correctBgAni.goToAndPlay(0, true);
                    corAni.goToAndPlay(0, true);
                    corAni.onComplete = () => {
                        correctAniEl.classList.remove('on');
                        document.getElementById('correct_bg').classList.remove('on');
                        let fishes = fishbowlBox.querySelectorAll('.fishbowl-fish-list li');
                        fishes[answerCount - 1].classList.add('on');

                        nextRound(positionClasses, wrap, bobberEls);
                    };
                } else {
                    playG(7);
                    wrongCount++;
                    if (ani7) { ani7.stop(); document.getElementById('click_a').classList.remove('on'); }
                    Object.values(bobberEls).forEach(({ dropEl, wiggleEl }) => {
                        dropEl.classList.remove('on');
                        wiggleEl.classList.remove('on');
                    });
                    if (aniLeft) { aniLeft.destroy(); aniLeft = null; }
                    if (aniLeftw) { aniLeftw.destroy(); aniLeftw = null; }
                    if (aniCenter) { aniCenter.destroy(); aniCenter = null; }
                    if (aniCenterw) { aniCenterw.destroy(); aniCenterw = null; }
                    if (aniRight) { aniRight.destroy(); aniRight = null; }
                    if (aniRightw) { aniRightw.destroy(); aniRightw = null; }

                    let randomIndex = Math.floor(Math.random() * 4);
                    let incorrectAniEl = document.querySelector(`#incorrect_0${randomIndex + 1}`);
                    incorrectAniEl.classList.add('on');
                    let incorAni = loadIncorrectAni(randomIndex);
                    document.getElementById('incorrect_bg').classList.add('on');
                    incorrectBgAni.goToAndPlay(0, true);
                    incorAni.goToAndPlay(0, true);
                    incorAni.onComplete = () => {
                        incorrectAniEl.classList.remove('on');
                        document.getElementById('incorrect_bg').classList.remove('on');
                        let fishes = fishbowlBox.querySelectorAll('.fishbowl-fish-list li');
                        fishes[fishes.length - wrongCount].classList.add('del');
                        playG(11);

                        nextRound(positionClasses, wrap, bobberEls);
                    };
                }
            }
        }

        if (wrap.classList.contains(targetClass)) return;

        wrap.classList.remove(...positionClasses);
        wrap.classList.add(targetClass);

        Object.values(bobberEls).forEach(({ dropEl, wiggleEl }) => {
            dropEl.classList.remove('on');
            wiggleEl.classList.remove('on');
        });
        if (aniLeft) { aniLeft.destroy(); aniLeft = null; }
        if (aniLeftw) { aniLeftw.destroy(); aniLeftw = null; }
        if (aniCenter) { aniCenter.destroy(); aniCenter = null; }
        if (aniCenterw) { aniCenterw.destroy(); aniCenterw = null; }
        if (aniRight) { aniRight.destroy(); aniRight = null; }
        if (aniRightw) { aniRightw.destroy(); aniRightw = null; }

        const currentAni = loadBobberAni(targetClass);
        const currentEl = bobberEls[targetClass];

        currentEl.dropEl.classList.add('on');
        currentAni.drop.goToAndPlay(0, true);

        currentAni.drop.addEventListener('complete', function onComplete() {
            currentAni.drop.removeEventListener('complete', onComplete);

            currentEl.dropEl.classList.remove('on');
            currentEl.wiggleEl.classList.add('on');

            requestAnimationFrame(() => {
                currentAni.wiggle.goToAndPlay(0, true);
            });
        });
    }

    function getFishHtml(word) {
        let fish_html = (round < 2) ?
            `<li>
            <button type="button" class="btn-fish" onclick="selectFish(this)">
                <img src="${SITE_ROOT}img/game/i_spy_sight_words/fish.png" alt="물고기">
                <span>${word}</span>
            </button>
        </li>` :
            `<li>
            <button type="button" class="btn-fish" onclick="selectFish(this)">
                <img src="${SITE_ROOT}img/game/i_spy_sight_words/fish.png" alt="물고기">
                <span style="display: none;">${word}</span>
                <span class="ico-fish-play" data-word="${String(word).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
                    <svg class="svg-play" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <path d="M26.1673 4.40324C25.0198 3.99066 23.8889 4.90204 23.8889 6.12146C23.8889 6.97673 24.4628 7.71547 25.257 8.03275C30.1619 9.99216 33.6111 14.6144 33.6111 20C33.6111 25.3831 30.1651 29.9881 25.2637 31.9464C24.4656 32.2653 23.8889 33.0076 23.8889 33.867C23.8889 35.0924 25.0254 36.0082 26.1782 35.5929C32.7836 33.2131 37.5 27.1309 37.5 20C37.5 12.8652 32.7785 6.78028 26.1673 4.40324ZM28.75 20C28.75 17.9167 27.9654 16.0204 26.6455 14.5626C25.5695 13.3743 23.8889 14.3752 23.8889 15.9783V24.0252C23.8889 25.6134 25.5436 26.6155 26.6193 25.447C27.955 23.9961 28.75 22.0852 28.75 20ZM3.59375 14.4413C2.98969 14.4413 2.5 14.931 2.5 15.535V24.465C2.5 25.069 2.98969 25.5587 3.59375 25.5587H10.2778L18.1517 33.062C18.848 33.7255 20 33.2319 20 32.2702V7.72982C20 6.76805 18.848 6.27453 18.1517 6.93801L10.2778 14.4413H3.59375Z" fill="#EF5A0A"/>
                    </svg>
                    <svg class="svg-stop" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.75 30.625C8.75 32.3509 10.1491 33.75 11.875 33.75C13.6009 33.75 15 32.3509 15 30.625V9.375C15 7.64911 13.6009 6.25 11.875 6.25C10.1491 6.25 8.75 7.64911 8.75 9.375V30.625Z" fill="#EF5A0A"/>
                        <path d="M31.25 9.375V30.625C31.25 32.3509 29.8509 33.75 28.125 33.75C26.3991 33.75 25 32.3509 25 30.625V9.375C25 7.64911 26.3991 6.25 28.125 6.25C29.8509 6.25 31.25 7.64911 31.25 9.375Z" fill="#EF5A0A"/>
                    </svg>
                </span>
            </button>
        </li>`;

        return fish_html;
    }

    function shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function makeFishList() {
        const question = document.querySelector('#question');
        const fishList = document.querySelector('.fish-list');
        const progressBox = document.querySelector('.progress-box');
        const fishbowlBox = document.querySelector('.fishbowl-box');
        progressBox.style.display = 'block';
        fishbowlBox.style.display = 'block';
        q_audio.src = `/demos/yeamoonsa/s3/game/ispysightwords/audio/${questionArr[round]}.mp3`;
        question.textContent = questionArr[round];
        fishList.innerHTML = '';

        const shuffledAnswer = shuffle(answerArr[round]);
        shuffledAnswer.forEach(word => {
            fishList.innerHTML += getFishHtml(word);
        });
    }

    function nextRound(positionClasses, wrap, bobberEls) {
        if (round < 3) {
            round++;
            currentPosition = null;
            updateProgress(0);
            wrap.classList.remove(...positionClasses);
            Object.values(bobberEls).forEach(({ dropEl, wiggleEl }) => {
                dropEl.classList.remove('on');
                wiggleEl.classList.remove('on');
            });
            if (aniLeft) { aniLeft.destroy(); aniLeft = null; }
            if (aniLeftw) { aniLeftw.destroy(); aniLeftw = null; }
            if (aniCenter) { aniCenter.destroy(); aniCenter = null; }
            if (aniCenterw) { aniCenterw.destroy(); aniCenterw = null; }
            if (aniRight) { aniRight.destroy(); aniRight = null; }
            if (aniRightw) { aniRightw.destroy(); aniRightw = null; }

            if (ani4) {
                document.getElementById('bobber_d').classList.add('on');
                ani4.goToAndPlay(0, true);
            }

            makeFishList();
        } else {
            reportGameComplete();
            const progressBox = document.querySelector('.progress-box');
            const fishbowlBox = document.querySelector('.fishbowl-box');
            progressBox.style.display = 'none';
            fishbowlBox.style.display = 'none';

            wrap.classList.remove(...positionClasses);
            wrap.classList.remove('in-game');
            wrap.classList.add('ending');

            Object.values(bobberEls).forEach(({ dropEl, wiggleEl }) => {
                dropEl.classList.remove('on');
                wiggleEl.classList.remove('on');
            });
            if (aniLeft) { aniLeft.destroy(); aniLeft = null; }
            if (aniLeftw) { aniLeftw.destroy(); aniLeftw = null; }
            if (aniCenter) { aniCenter.destroy(); aniCenter = null; }
            if (aniCenterw) { aniCenterw.destroy(); aniCenterw = null; }
            if (aniRight) { aniRight.destroy(); aniRight = null; }
            if (aniRightw) { aniRightw.destroy(); aniRightw = null; }
            if (ani2) { ani2.destroy(); ani2 = null; document.getElementById('character_intro').classList.remove('on'); }
            if (ani3) { ani3.destroy(); ani3 = null; document.getElementById('character_drop').classList.remove('on'); }
            if (ani4) { ani4.destroy(); ani4 = null; document.getElementById('bobber_d').classList.remove('on'); }
            if (ani5) { ani5.destroy(); ani5 = null; document.getElementById('fishingport').classList.remove('on'); }
            if (ani6) { ani6.destroy(); ani6 = null; document.getElementById('character_wiggle').classList.remove('on'); }
            if (ani7) { ani7.destroy(); ani7 = null; document.getElementById('click_a').classList.remove('on'); }
            if (correctBgAni) { correctBgAni.destroy(); correctBgAni = null; document.getElementById('correct_bg').classList.remove('on'); }
            if (incorrectBgAni) { incorrectBgAni.destroy(); incorrectBgAni = null; document.getElementById('incorrect_bg').classList.remove('on'); }

            const dropEl = document.querySelector(`#drop_0${answerCount}`);
            const dropElbg = document.querySelector(`#drop_0${answerCount}_bg`);
            dropEl.classList.add('on');
            dropElbg.classList.add('on');
            let dropAni = loadDropAni(answerCount);
            let dropAniBg = loadDropAniBg(answerCount);
            dropAni.goToAndPlay(0, true);
            dropAniBg.goToAndPlay(0, true);
            game_bg.pause();

            if (answerCount < 2) {
                playG(8);
            } else if (answerCount < 4) {
                playG(9);
            } else {
                playG(10);
            }
        }
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

    function retry() {
        redirectToWithBookNo(gameCfg.introPath);
    }

    function playG(index, callback) {
        g_audio.pause();
        g_audio.src = `${SITE_ROOT}audio/game/ispysightwords/game_sw_${index}.mp3`;
        g_audio.onended = callback || null;
        g_audio.play().catch(e => { if (e.name !== 'AbortError') console.error(e); });
    }

    function playQuestion(btn) {
        if (btn.classList.contains('stop')) {
            btn.classList.remove('stop');
            q_audio.pause();
        } else {
            btn.classList.add('stop');
            q_audio.play();
        }

        q_audio.onended = () => {
            btn.classList.remove('stop');
        };
    }

    function exposeGlobals() {
        global.selectFish = selectFish;
        global.exitModal = exitModal;
        global.cancelExit = cancelExit;
        global.applyExit = applyExit;
        global.retry = retry;
        global.playQuestion = playQuestion;
    }

    function init(config) {
        if (!config || !Array.isArray(config.questionArr) || !Array.isArray(config.answerArr) ||
            !config.assets || config.assets.step == null || !config.assets.fishingPort || !config.introPath) {
            console.error('ISpySightWords.init: invalid config', config);
            return;
        }
        gameCfg = config;
        questionArr = config.questionArr;
        answerArr = config.answerArr;
        exposeGlobals();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
    }

    global.ISpySightWords = { init };
})(typeof window !== 'undefined' ? window : this);
