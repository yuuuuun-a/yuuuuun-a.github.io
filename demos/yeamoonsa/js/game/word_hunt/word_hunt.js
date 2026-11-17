let g_audio = new Audio();
let game_bg = new Audio();
let card_audio = new Audio();

let round = 1;
let cardArr = [];
let isPlaying = false;
let selecting = false;
let hinting = false;
let stopwatchInterval = null;

let iosPlay = false;

document.addEventListener("DOMContentLoaded", () => {
    if(isIOS()){
        makeIOSBtn(() => {
            const rememberMsg = document.querySelector('.remember-msg-box');
            playG(1, () => {
                rememberMsg.classList.add('on');
                playG(12, () => {
                    rememberMsg.classList.remove('on');
                    gameReady();
                });
            });
        });
    }
    else{
        const rememberMsg = document.querySelector('.remember-msg-box');
        playG(1, () => {
            rememberMsg.classList.add('on');
            playG(12, () => {
                rememberMsg.classList.remove('on');
                gameReady();
            });
        });
    }
});

function gameReset(){
    return new Promise((resolve, reject) => {
        const wordHunt = document.querySelector('#word_hunt');
        const roundList = wordHunt.querySelectorAll('.round-list li');
        const roundTitle = document.querySelector('#round_title');
        wordHunt.classList.remove('round-01', 'round-02', 'round-03');
        (round == 1) ? wordHunt.classList.add('round-01') : (round == 2) ? wordHunt.classList.add('round-02') : wordHunt.classList.add('round-03');
        roundList[round-1].classList.add('on');
        roundTitle.textContent = `Round ${round}`;

        const roundLi = document.querySelector(`#round_${round}`);
        const cardItems = roundLi.querySelectorAll('.card-item');
        cardItems.forEach(card => {
            card.classList.remove('on', 'right', 'hint');
        });
    
        const rememberMsg = document.querySelector('.remember-msg-box');
        rememberMsg.classList.remove('on');
        
        const timeBox = document.querySelector('.time-box');
        const timeText = timeBox.querySelector('.time');
        timeText.classList.remove('hurry-up');
        
        const stopwatch = document.querySelector('.stopwatch-wrap');
        stopwatch.classList.remove('hurry-up', 'show');
    
        const successList = document.querySelector('.success-list');
        successList.innerHTML = '';
        successList.classList.remove('long');
    
        cardArr = [];
        isPlaying = false;
        selecting = false;
        hinting = false;

        clearLottie();
        resolve();
    });
}

function gameReady(){
    const roundLi = document.querySelector(`#round_${round}`);
    const cardItems = roundLi.querySelectorAll('.card-item');
    cardItems.forEach(card => {
        card.classList.add('on');
        card.removeEventListener('click', clickCard);
        card.addEventListener('click', clickCard);

        const qTxt = card.querySelector('.q-txt');
        qTxt.classList.toggle('long', qTxt.textContent.length >= 9);
    });
    suffleCard(round);
    cardTimer(10);
    playG(4, () => {
        const startMsg = document.querySelector('.img-start-msg');
        startMsg.classList.remove('on');

        isPlaying = true;
        let seconds = (round == 1) ? 10 : (round == 2) ? 12 : 14;
        stopwatch(seconds);

        game_bg.src = `${SITE_ROOT}audio/game/wordhunt/bg_${round}.mp3`;
        game_bg.play();
    });
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
        redirectToContent();
    }
}

function suffleCard(){
    const roundLi = document.querySelector(`#round_${round}`);
    const cardList = roundLi.querySelector('.card-list');
    const cardItems = Array.from(cardList.querySelectorAll('.card-item'));
    
    // Fisher-Yates 셔플 알고리즘으로 배열 섞기
    for (let i = cardItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardItems[i], cardItems[j]] = [cardItems[j], cardItems[i]];
    }
    
    // 섞인 순서대로 DOM에 다시 추가
    cardItems.forEach(card => cardList.appendChild(card));
}

function cardTimer(time) {
    const timeBox = document.querySelector('.time-box');
    const timeText = timeBox.querySelector('.time');
    timeText.textContent = time;
    timeBox.classList.add('on');

    const timeInterval = setInterval(() => {
        time--;
        timeText.textContent = time;
        if(time <= 5){
            timeText.classList.add('hurry-up');
        }
        if(time <= 0) {
            const startMsg = document.querySelector('.img-start-msg');
            startMsg.classList.add('on');

            clearInterval(timeInterval);
            timeText.classList.remove('hurry-up');
            timeBox.classList.remove('on');
            startRound();
        }
    }, 1000);
}

function startRound() {
    const roundLi = document.querySelector(`#round_${round}`);
    const cardItems = roundLi.querySelectorAll('.card-item');
    cardItems.forEach(card => card.classList.remove('on'));

    cardArr = [];
}

function stopwatch(seconds){
    const stopwatch = document.querySelector('.stopwatch-wrap');
    const timeBar = stopwatch.querySelector('.time-bar');
    const time = stopwatch.querySelector('.time');
    time.textContent = seconds;
    stopwatch.classList.add('show');
    
    const secondsTotal = seconds;
    timeBar.style.setProperty('--progress', '100%');
    timeBar.max = secondsTotal;
    timeBar.value = secondsTotal;
    stopwatchInterval = setInterval(() => {
        seconds--;
        time.textContent = seconds;
        const progress = (seconds / secondsTotal) * 100;
        timeBar.style.setProperty('--progress', `${progress}%`);
        timeBar.value = seconds;

        if(seconds <= 3){
            stopwatch.classList.add('hurry-up');
        }
        if(seconds < 0) {
            seconds = 0;
        }
        if(seconds <= 0) {
            clearInterval(stopwatchInterval);
            stopwatchInterval = null;
            endRound(false);
        }
    }, 1000);
}

function clickCard(event) {
    if(!selecting){
        selecting = true;
        checkCard(event).then(() => {
            selecting = false;
            if(checkAnswer()){
                endRound(true);
                clearInterval(stopwatchInterval);
                stopwatchInterval = null;
            }
        });
    }
}

function checkCard(event){
    const roundLi = document.querySelector(`#round_${round}`);
    let card = event.target.closest('.card-item');
    let cardAlt = card.querySelector('.q-txt').textContent;

    return new Promise((resolve, reject) => {
        if(card.classList.contains('on')){
            playCard(cardAlt);
            resolve();
        }

        if(isPlaying && !card.classList.contains('on')){
            playCard(cardAlt);
            card.classList.remove('hint');
            card.classList.add('on');

            if(cardArr.length == 0){
                cardArr.push(cardAlt);
                hinting = false;
                resolve();
            }
            else if(cardArr.length == 1){
                if(cardArr[0] == cardAlt){
                    playG(6);
                    roundLi.querySelectorAll('.card-item.on').forEach(c => {
                        c.classList.add('eff');
                    });
                    
                    setTimeout(() => {
                        const successList = document.querySelector('.success-list');
                        if(cardAlt.length >= 9){
                            successList.classList.add('long');
                        }
                        successList.innerHTML += `<li class="on">${cardAlt}</li>`;
                        roundLi.querySelectorAll('.card-item.on').forEach(c => {
                            c.classList.remove('on');
                            c.classList.remove('eff');
                            c.classList.add('right');
                        });
                        hinting = false;
                        cardArr = [];
                        resolve();
                    }, 500);
                }
                else{
                    playG(5);
                    setTimeout(() => {
                        roundLi.querySelectorAll('.card-item.on').forEach(c => {
                            c.classList.remove('on');
                        });
                        hinting = false;
                        cardArr = [];
                        resolve();
                    }, 500);
                }
            }
        }
        else{
            resolve();
        }
    });
}

function checkAnswer() {
    const roundLi = document.querySelector(`#round_${round}`);
    const cardItems = roundLi.querySelectorAll('.card-item');
    const rightCardItems = Array.from(cardItems).filter(card => card.classList.contains('right'));
    return (rightCardItems.length == cardItems.length)? true : false;
}

function getHint() {
    if(isPlaying && !hinting) {
        playG(7);
        hinting = true;
        makeHint().then(() => {
            hinting = false;
        });
    }
}

function makeHint(){
    const btnHint = document.querySelector('.btn-hint');
    const roundLi = document.querySelector(`#round_${round}`);
    const cardItems = roundLi.querySelectorAll('.card-item');
    btnHint.classList.add('on');
    setTimeout(() => {
        btnHint.classList.remove('on');
    }, 4200);

    return new Promise((resolve, reject) => {
        // 아직 맞추지 않은 카드들만 필터링 (right 클래스가 없는 카드)
        const availableCards = Array.from(cardItems).filter(card => !card.classList.contains('right'));
        if(cardArr.length == 0){
            // 랜덤으로 하나의 카드를 hint
            if(availableCards.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableCards.length);
                const randomCard = availableCards[randomIndex];
                randomCard.classList.add('hint');
                
                setTimeout(() => {
                    randomCard.classList.remove('hint');
                    resolve();
                }, 4200);
            }
        }
        else if(cardArr.length == 1){
            // cardArr[0]과 같은 alt를 가진 카드를 hint
            const targetAlt = cardArr[0];
            const matchingCards = availableCards.filter(card => {
                const cardAlt = card.querySelector('.q-txt').textContent;
                return cardAlt === targetAlt && !card.classList.contains('on');
            });
            
            if(matchingCards.length > 0) {
                matchingCards.forEach(card => {
                    card.classList.add('hint');
                    setTimeout(() => {
                        card.classList.remove('hint');
                        resolve();
                    }, 4200);
                });
            }
        }
    });
}

function loadLottie(containerId, jsonSrc) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const player = document.createElement('lottie-player');
    player.setAttribute('src', jsonSrc);
    player.setAttribute('background', 'transparent');
    player.setAttribute('speed', '1');
    player.style.width = '100%';
    player.style.height = '100%';
    container.appendChild(player);
    player.addEventListener('ready', () => { player.play(); });
}

function clearLottie() {
    ['round1_clear_lottie', 'round2_clear_lottie', 'times_up_lottie', 'end_lottie'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
}

function endRound(isSuccess){
    game_bg.pause();
    game_bg.currentTime = 0;
    game_bg.src = '';

    const endDiv = document.querySelector('#end_div');
    if(isSuccess){
        setTimeout(() => {
            endDiv.classList.remove(`times-up`);
            if(round < 3){
                endDiv.classList.add(`round${round}-clear`);
                loadLottie(`round${round}_clear_lottie`, `${SITE_ROOT}js/game/word_hunt/step${_step}/round${round}_clear.json`);
                playG(round+7);
            }
            else{
                reportGameComplete();
                endDiv.classList.add(`end`);
                loadLottie('end_lottie', `${SITE_ROOT}js/game/word_hunt/step${_step}/end.json`);
                playG(10);
            }
        }, 2000);
    }
    else{
        endDiv.classList.remove(`round${round}-clear`);
        endDiv.classList.add(`times-up`);
        loadLottie('times_up_lottie', `${SITE_ROOT}js/game/word_hunt/step${_step}/times_up.json`);
        playG(11);
    }
}

function nextRound(){
    const endDiv = document.querySelector('#end_div');
    endDiv.classList.remove(`round${round}-clear`);
    round++;

    gameReset().then(() => {
        const rememberMsg = document.querySelector('.remember-msg-box');
        rememberMsg.classList.add('on');
        playG(round, () => {
            rememberMsg.classList.remove('on');
            gameReady();
        });
    });
}

function retry(){
    const endDiv = document.querySelector('#end_div');
    if(endDiv.classList.contains('end')){
        let path = window.location.pathname.split('/');
        path[path.length - 1] = 'intro.html';
        redirectToWithBookNo(path.join('/'));
    }
    else{
        endDiv.classList.remove(`times-up`);
        gameReset().then(() => {
            gameReady();
        });
    }
}

function playG(index, callback){
    g_audio.src = `${SITE_ROOT}audio/game/wordhunt/g_sound_${index}.mp3`;
    g_audio.onended = callback || null;
    g_audio.play();
}

function playCard(alt){
    card_audio.src = `/demos/yeamoonsa/s3/game/wordhunt/audio/${alt}.mp3`;
    card_audio.play();
}
