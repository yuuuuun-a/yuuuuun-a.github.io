(function (global) {
    'use strict';

    const DEFAULT_GAME_URL = '';

    let gameCfg = null;
    let game_url = DEFAULT_GAME_URL;
    let sp = null;

    let game_audio;
    let q_audio;
    let o_audio;
    let h_audio;
    let q_src = '-1';

    let quiz_index = 0;
    let quiz_type_arr = [];
    let quiz_question_arr = [];
    let quiz_direct_arr = [];
    let quiz_option_arr = [];
    let quiz_answer_arr = [];
    let quiz_audio_arr = [];
    let option_audio_arr = [];
    let hint_audio_arr = [];
    let quiz_content_ver2_arr = [];
    let quiz_li = null;

    let isAnimating = false;

    let bear_home, bear_quiz, monkey_home, monkey_quiz, cat_home, cat_quiz;
    let dog_home, dog_quiz, school, school_quiz, end;

    let bear_home_ani, bear_quiz_ani;
    let monkey_home_ani, monkey_quiz_ani;
    let cat_home_ani, cat_quiz_ani;
    let dog_home_ani, dog_quiz_ani;
    let school_ani, school_quiz_ani;
    let end_ani;

    function stepPath() {
        return `${SITE_ROOT}js/game/story_quiz/step${gameCfg.step}`;
    }

    function loadAni(container, path) {
        return lottie.loadAnimation({
            container: container,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: path
        });
    }

    function boot() {
        game_audio = new Audio();
        q_audio = new Audio();
        o_audio = new Audio();
        h_audio = new Audio();

        const quiz_wrap = document.querySelector('.quiz-wrap');
        const quiz_score = document.querySelector('.quiz-score');
        quiz_wrap.style.display = 'block';
        quiz_score.style.display = 'block';

        bear_home = document.getElementById('bear_home');
        bear_quiz = document.getElementById('bear_quiz');
        monkey_home = document.getElementById('monkey_home');
        monkey_quiz = document.getElementById('monkey_quiz');
        cat_home = document.getElementById('cat_home');
        cat_quiz = document.getElementById('cat_quiz');
        dog_home = document.getElementById('dog_home');
        dog_quiz = document.getElementById('dog_quiz');
        school = document.getElementById('school');
        school_quiz = document.getElementById('school_quiz');
        end = document.getElementById('end');

        sp = stepPath();
        quiz_li = document.querySelectorAll('.quiz-li');

        // 처음에는 bear_home만 로딩
        bear_home_ani = loadAni(bear_home, `${sp}/1-1_bear_home.json`);
        bear_home_ani.addEventListener('enterFrame', onBearHomeFrame);

        if (isIOS()) {
            makeIOSBtn(() => {
                [q_audio, o_audio, h_audio].forEach(a => {
                    a.muted = true;
                    a.play().catch(() => {});
                    a.pause();
                    a.muted = false;
                });
                nextQuiz();
            });
        } else {
            nextQuiz();
        }
    }

    // ===== bear =====
    function onBearHomeFrame() {
        const frame = Math.round(bear_home_ani.currentFrame);
        if (frame >= 40) {
            toggleSubtitle(true);
        }
        if (frame >= 190) {
            toggleSubtitle(false);
        }
        // bear_home 종료 전, bear_quiz 미리 로딩
        if (frame >= 350 && !bear_quiz_ani) {
            bear_quiz_ani = loadAni(bear_quiz, `${sp}/1-2_bear_quiz.json`);
            bear_quiz_ani.addEventListener('complete', onBearQuizComplete);
        }
        if (frame >= 388) {
            console.log('===== bear home end =====');
            bear_home_ani.pause();
            makeQuiz();
            makeHint();
            playQuestion();
            // 퀴즈가 나올 때 다음 단계(monkey_home) 미리 로딩
            if (!monkey_home_ani) {
                monkey_home_ani = loadAni(monkey_home, `${sp}/2-1_monkey_home.json`);
                monkey_home_ani.addEventListener('enterFrame', onMonkeyHomeFrame);
            }
        }
    }

    function onBearQuizComplete() {
        quiz_li[0].classList.add('on');
        bear_quiz.style.display = 'none';
        bear_quiz_ani.pause();
        monkey_home.style.display = 'block';
        monkey_home_ani.play();
        playG(7);
        console.log('===== bear quiz end =====');
        console.log('===== monkey home start =====');
    }

    // ===== monkey =====
    function onMonkeyHomeFrame() {
        const frame = Math.round(monkey_home_ani.currentFrame);
        // monkey_home 종료 전, monkey_quiz 미리 로딩
        if (frame >= 250 && !monkey_quiz_ani) {
            monkey_quiz_ani = loadAni(monkey_quiz, `${sp}/2-2_monkey_quiz.json`);
            monkey_quiz_ani.addEventListener('complete', onMonkeyQuizComplete);
        }
        if (frame >= 300) {
            console.log('===== monkey home end =====');
            monkey_home_ani.pause();
            makeQuiz();
            makeHint();
            playQuestion();
            // 퀴즈가 나올 때 다음 단계(cat_home) 미리 로딩
            if (!cat_home_ani) {
                cat_home_ani = loadAni(cat_home, `${sp}/3-1_cat_home.json`);
                cat_home_ani.addEventListener('enterFrame', onCatHomeFrame);
            }
        }
    }

    function onMonkeyQuizComplete() {
        quiz_li[1].classList.add('on');
        monkey_quiz.style.display = 'none';
        monkey_quiz_ani.pause();
        cat_home.style.display = 'block';
        cat_home_ani.play();
        playG(7);
        console.log('===== monkey quiz end =====');
        console.log('===== cat home start =====');
    }

    // ===== cat =====
    function onCatHomeFrame() {
        const frame = Math.round(cat_home_ani.currentFrame);
        // cat_home 종료 전, cat_quiz 미리 로딩
        if (frame >= 250 && !cat_quiz_ani) {
            cat_quiz_ani = loadAni(cat_quiz, `${sp}/3-2_cat_quiz.json`);
            cat_quiz_ani.addEventListener('complete', onCatQuizComplete);
        }
        if (frame >= 300) {
            console.log('===== cat home end =====');
            cat_home_ani.pause();
            makeQuiz();
            makeHint();
            playQuestion();
            // 퀴즈가 나올 때 다음 단계(dog_home) 미리 로딩
            if (!dog_home_ani) {
                dog_home_ani = loadAni(dog_home, `${sp}/4-1_dog_home.json`);
                dog_home_ani.addEventListener('enterFrame', onDogHomeFrame);
            }
        }
    }

    function onCatQuizComplete() {
        quiz_li[2].classList.add('on');
        cat_quiz.style.display = 'none';
        cat_quiz_ani.pause();
        dog_home.style.display = 'block';
        dog_home_ani.play();
        playG(7);
        console.log('===== cat quiz end =====');
        console.log('===== dog home start =====');
    }

    // ===== dog =====
    function onDogHomeFrame() {
        const frame = Math.round(dog_home_ani.currentFrame);
        // dog_home 종료 전, dog_quiz 미리 로딩
        if (frame >= 250 && !dog_quiz_ani) {
            dog_quiz_ani = loadAni(dog_quiz, `${sp}/4-2_dog_quiz.json`);
            dog_quiz_ani.addEventListener('complete', onDogQuizComplete);
        }
        if (frame >= 300) {
            console.log('===== dog home end =====');
            dog_home_ani.pause();
            makeQuiz();
            makeHint();
            playQuestion();
            // 퀴즈가 나올 때 다음 단계(school) 미리 로딩
            if (!school_ani) {
                school_ani = loadAni(school, `${sp}/5-1_school.json`);
                school_ani.addEventListener('enterFrame', onSchoolFrame);
            }
        }
    }

    function onDogQuizComplete() {
        quiz_li[3].classList.add('on');
        dog_quiz.style.display = 'none';
        dog_quiz_ani.pause();
        school.style.display = 'block';
        school_ani.play();
        playG(7);
        console.log('===== dog quiz end =====');
        console.log('===== school start =====');
    }

    // ===== school =====
    function onSchoolFrame() {
        const frame = Math.round(school_ani.currentFrame);
        // school 종료 전, school_quiz 미리 로딩
        if (frame >= 245 && !school_quiz_ani) {
            school_quiz_ani = loadAni(school_quiz, `${sp}/5-2_school_quiz.json`);
            school_quiz_ani.addEventListener('complete', onSchoolQuizComplete);
        }
        if (frame >= 295) {
            console.log('===== school end =====');
            school_ani.pause();
            makeQuiz();
            makeHint();
            playQuestion();
            // 마지막 퀴즈가 나올 때 end 미리 로딩
            if (!end_ani) {
                end_ani = loadAni(end, SITE_ROOT + 'js/game/story_quiz/6_end.json');
                end_ani.addEventListener('enterFrame', onEndFrame);
                end_ani.addEventListener('complete', () => {
                    console.log('===== end complete =====');
                });
            }
        }
    }

    function onSchoolQuizComplete() {
        const qs = document.querySelector('.quiz-score');
        qs.style.display = 'none';
        const retry_btn = document.querySelector('.retry-btn');
        retry_btn.style.display = 'block';

        school_quiz.style.display = 'none';
        school_quiz_ani.pause();
        end.style.display = 'block';
        end_ani.play();
        playG(9);
        console.log('===== school quiz end =====');
        console.log('===== end start =====');
        reportGameComplete();
    }

    // ===== end =====
    function onEndFrame() {
        // 기존 6파일과 동일: school_ani.currentFrame 사용 (호환 유지)
        const frame = Math.round(school_ani.currentFrame);
        if (frame >= 30) {
            const retryBtn = document.querySelector('.retry-btn');
            retryBtn.classList.add('on');
        }
    }

    function toggleSubtitle(flag) {
        const subtitle = document.querySelector('.subtitle');
        if (flag) {
            subtitle.style.display = 'block';
        } else {
            subtitle.style.display = 'none';
        }
    }

    function nextQuiz() {
        const quiz_content = document.querySelector('.quiz-content');
        const hint_wrap = document.querySelector('.hint-wrap');
        quiz_content.classList.remove('on');
        hint_wrap.style.display = 'none';

        if (quiz_index == 0) {
            bear_home.style.display = 'block';
            bear_home_ani.play();
            playG(3);
            console.log('===== bear home start =====');
        } else {
            console.log('===== nextQuiz =====', quiz_index);
            if (quiz_index == 1) {
                bear_home.style.display = 'none';
                bear_quiz.style.display = 'block';
                bear_quiz_ani.play();
                playG(6);
                console.log('===== bear quiz start =====');
            } else if (quiz_index == 2) {
                monkey_home.style.display = 'none';
                monkey_quiz.style.display = 'block';
                monkey_quiz_ani.play();
                playG(6);
                console.log('===== monkey quiz start =====');
            } else if (quiz_index == 3) {
                cat_home.style.display = 'none';
                cat_quiz.style.display = 'block';
                cat_quiz_ani.play();
                playG(6);
                console.log('===== cat quiz start =====');
            } else if (quiz_index == 4) {
                dog_home.style.display = 'none';
                dog_quiz.style.display = 'block';
                dog_quiz_ani.play();
                playG(6);
                console.log('===== dog quiz start =====');
            } else if (quiz_index == 5) {
                school.style.display = 'none';
                school_quiz.style.display = 'block';
                school_quiz_ani.play();
                playG(8);
                console.log('===== school quiz start =====');
            }
        }
    }

    function makeQuiz() {
        isAnimating = false;
        const type = quiz_type_arr[quiz_index];

        const quiz_content = document.querySelector('.quiz-content');
        quiz_content.classList.remove('type1', 'type2', 'type3', 'type4', 'type5', 'type6');
        if (quiz_content_ver2_arr[quiz_index]) {
            quiz_content.classList.add('ver2');
        } else {
            quiz_content.classList.remove('ver2');
        }
        quiz_content.classList.add('on');
        quiz_content.classList.add(type);

        const question = document.querySelector('.quiz-question span');
        const quiz_view = document.querySelector('.quiz-view');
        const quiz_answer = document.querySelector('.quiz-answer');
        question.textContent = '';
        quiz_view.innerHTML = '';
        quiz_answer.innerHTML = '';

        question.textContent = `${quiz_index + 1}. ${quiz_question_arr[quiz_index]}`;

        if (type == 'type1' || type == 'type3') {
            quiz_view.innerHTML = `<img class="quiz-img" src="${game_url}${quiz_direct_arr[quiz_index]}" alt="quiz-view">`;
        } else if (type == 'type5' || type == 'type6') {
            quiz_view.innerHTML = `<p class="quiz-text">${quiz_direct_arr[quiz_index]}</p>`;
        }

        const option_arr = quiz_option_arr[quiz_index];
        if (option_arr.length == 2) {
            quiz_answer.classList.add('ver2');
        } else {
            quiz_answer.classList.remove('ver2');
        }
        option_arr.forEach((option, index) => {
            let btn = `<button class="quiz-answer-btn" onclick="checkAnswer(${index}, this)">`;
            if (type == 'type3' || type == 'type4' || type == 'type6') {
                btn += `<img src="${game_url}${option}" alt="">`;
            } else if (type == 'type1' || type == 'type2' || type == 'type5') {
                btn += '<div class="layered-shadow layered-shadow1"></div>';
                btn += '<div class="layered-shadow layered-shadow2"></div>';
                btn += `<span>${option}</span>`;
            }
            btn += '</button>';
            quiz_answer.innerHTML += btn;
        });
    }

    function makeHint() {
        const hint_wrap = document.querySelector('.hint-wrap');
        hint_wrap.style.display = 'flex';
    }

    function playG(index, callback) {
        game_audio.src = `${SITE_ROOT}audio/game/storyquiz/game_sq_${index}.mp3`;
        game_audio.play();

        if (callback) {
            game_audio.onended = () => {
                callback();
                game_audio.onended = null;
            };
        }
    }

    function stopQAudio() {
        const listen_btn = document.querySelector('.listen-btn');
        listen_btn.classList.remove('on');
        q_audio.pause();
        q_audio.currentTime = 0;
    }

    function stopHAudio() {
        const hint_content = document.querySelector('.hint-content');
        hint_content.style.display = 'none';
        h_audio.pause();
        h_audio.currentTime = 0;
    }

    function playQuestion() {
        const listen_btn = document.querySelector('.listen-btn');
        if (listen_btn.classList.contains('on')) {
            q_audio.pause();
            listen_btn.classList.remove('on');
        } else {
            if (q_audio.src != q_src) {
                q_audio.src = `${game_url}${quiz_audio_arr[quiz_index]}`;
                q_src = `${game_url}${quiz_audio_arr[quiz_index]}`;
            }

            stopHAudio();
            q_audio.play();
            listen_btn.classList.add('on');
        }

        q_audio.onended = () => {
            listen_btn.classList.remove('on');
        };
    }

    function playHint() {
        const hint_btn = document.querySelector('.hint-btn');
        const hint_content = document.querySelector('.hint-content');
        if (hint_content.style.display == 'none') {
            stopQAudio();
            hint_btn.classList.add('on');
            hint_content.style.display = 'flex';
            h_audio.src = `${game_url}${hint_audio_arr[quiz_index]}`;
            h_audio.play();
            h_audio.onended = () => {
                hint_btn.classList.remove('on');
                hint_content.style.display = 'none';
            };
        }
    }

    function applyAnswerResult(index, btn) {
        if (quiz_answer_arr[quiz_index] == index) {
            console.log('correct');
            btn.classList.add('correct');
            playG(4, () => {
                toggleDisableModal(false);
                btn.classList.remove('correct');
                q_src = '-1';
                nextQuiz(++quiz_index);
            });
        } else {
            console.log('wrong');
            btn.classList.add('wrong');
            playG(5, () => {
                isAnimating = false;
                toggleDisableModal(false);
                btn.classList.remove('wrong');
            });
        }
    }

    function checkAnswer(index, btn) {
        if (isAnimating) return;
        isAnimating = true;
        toggleDisableModal(true);
        stopQAudio();
        const optSrc = option_audio_arr[quiz_index][index];
        if (optSrc != '') {
            o_audio.src = `${game_url}${optSrc}`;
            o_audio.play();
            o_audio.onended = () => {
                applyAnswerResult(index, btn);
            };
        } else {
            applyAnswerResult(index, btn);
        }
    }

    function toggleDisableModal(flag) {
        const btn_disable_modal = document.querySelector('.btn-disable-modal');
        if (flag) {
            btn_disable_modal.classList.add('open');
        } else {
            btn_disable_modal.classList.remove('open');
        }
    }

    function retry() {
        redirectToWithBookNo(gameCfg.introPath);
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

    function exposeGlobals() {
        global.checkAnswer = checkAnswer;
        global.playQuestion = playQuestion;
        global.playHint = playHint;
        global.retry = retry;
        global.exitModal = exitModal;
        global.cancelExit = cancelExit;
        global.applyExit = applyExit;
    }

    function init(config) {
        if (!config || config.step == null || !config.introPath ||
            !config.quiz_type_arr || !config.quiz_question_arr || !config.quiz_direct_arr ||
            !config.quiz_option_arr || !config.quiz_answer_arr || !config.quiz_audio_arr ||
            !config.option_audio_arr || !config.hint_audio_arr) {
            console.error('StoryQuiz.init: invalid config', config);
            return;
        }
        gameCfg = config;
        game_url = config.game_url || DEFAULT_GAME_URL;

        quiz_index = 0;
        q_src = '-1';
        quiz_type_arr = config.quiz_type_arr;
        quiz_question_arr = config.quiz_question_arr;
        quiz_direct_arr = config.quiz_direct_arr;
        quiz_option_arr = config.quiz_option_arr;
        quiz_answer_arr = config.quiz_answer_arr;
        quiz_audio_arr = config.quiz_audio_arr;
        option_audio_arr = config.option_audio_arr;
        hint_audio_arr = config.hint_audio_arr;
        quiz_content_ver2_arr = config.quiz_content_ver2_arr || [];

        exposeGlobals();

        if (document.readyState === 'complete') {
            boot();
        } else {
            global.addEventListener('load', boot);
        }
    }

    global.StoryQuiz = { init };
})(typeof window !== 'undefined' ? window : this);
