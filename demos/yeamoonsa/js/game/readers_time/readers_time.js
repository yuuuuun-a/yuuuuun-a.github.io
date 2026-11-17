let game_audio = new Audio();
let user_audio = new Audio();
let g_audio = new Audio();
let game_bg = new Audio(`${SITE_ROOT}audio/game/readerstime/readersTime_bg.mp3`);
let game_index = 0;
let timer_count = 0;
let timer_interval = null;
let record_status = 0;
let tutorial_timer_interval = null;
let correct_count = 0;
let char_d = null;
let char_l = null;
let char_t = null;
let char_s = null;
let char_f = null;
let record_start = null;
let record_active_bar = null;
let tuorial_step2_char = null;

function loadLottie(id, path, loop, autoplay) {
    return lottie.loadAnimation({
        container: document.getElementById(id),
        renderer: 'svg',
        loop: loop,
        autoplay: autoplay,
        path: path
    });
}

window.addEventListener("DOMContentLoaded", function() {

    const tuorial_step1_char = loadLottie('tuorial_step1_char', `${SITE_ROOT}js/game/readers_time/step${_step}/tuorial_step1_char.json`, true, true);
    const tuorial_arr = loadLottie('tuorial_arr', `${SITE_ROOT}js/game/readers_time/tuorial_arr.json`, true, true);
    char_d = loadLottie('char_d', `${SITE_ROOT}js/game/readers_time/step${_step}/char_d.json`, true, true); // 기본 캐릭터


    if(!mediaRecorder){
        CheckMediaRecorder();
    }

    makeGame(game_index);
    game_bg.loop = true;
    game_bg.play();
    playG(3);

    const inputs = document.querySelectorAll(".volume-range");
    inputs.forEach(input => {
        function setBackgroundSize() {
            input.style.setProperty("--background-size", `${getBackgroundSize()}%`);
        }

        function getBackgroundSize() {
            const min = +input.min || 0;
            const max = +input.max || 100;
            const value = +input.value;
            return ((value - min) / (max - min)) * 100;
        }

        setBackgroundSize();
        input.addEventListener("input", setBackgroundSize);
    });

    game_audio.addEventListener("play", function() {
        // game_bg.pause();
    });
    game_audio.addEventListener("pause", function() {
        // game_bg.play();
    });
    game_audio.addEventListener("ended", function() {
        const btn_play = document.getElementById('btn_play');
        btn_play.classList.remove('active');
        btn_play.classList.add('start');
        // game_bg.play();
    });
    user_audio.addEventListener("play", function() {
        // game_bg.pause();
    });
    user_audio.addEventListener("pause", function() {
        // game_bg.play();
    });
    user_audio.addEventListener("ended", function() {
        // game_bg.play();
    });
});

function makeGame(index){
    const game_img = document.getElementById('game_img');
    const game_script = document.getElementById('game_script');
    const timer = document.getElementById('timer');
    const time_bar = document.getElementById('time_bar');
    let text = game_content[index].script;
    game_img.src = `/demos/yeamoonsa/s3/game/readerstime/img/${game_content[index].img}`;
    game_script.textContent = (index + 1) + ". " + text;
    game_audio.src = `/demos/yeamoonsa/s3/game/readerstime/audio/${game_content[index].audio}`;
    time_bar.value = 100;

    // hurry 클래스 제거로 색상 초기화
    const time_div = document.getElementById('time_div');
    time_div.classList.remove('hurry');

    let text_count = text.split(" ").length;
    if(text_count >= 9){
        timer.textContent = "20";
        timer_count = 20;
    }
    else if(text_count >= 6){
        timer.textContent = "16";
        timer_count = 16;
    }
    else if(text_count >= 4){
        timer.textContent = "12";
        timer_count = 12;
    }
    else{
        timer.textContent = "8";
        timer_count = 8;
    }
}

function exitModal(){
    playG(2);
    document.getElementById('exit_modal').classList.add('open');
}

function cancelExit(){
    playG(2);
    document.getElementById('exit_modal').classList.remove('open');
}

function applyExit(){
    playG(2);
    if (isPC()) {
        self.close();
    } else {
        window.location.href = getContentUrlForExit(getBookNoFromUrl());
    }
}

function nextTutorial(){
    const tutorial_modal = document.getElementById('tutorial_modal');
    tutorial_modal.querySelector('.step1').style.display = 'none';
    tutorial_modal.querySelector('.step2').style.display = 'block';
    if (!tuorial_step2_char) tuorial_step2_char = loadLottie('tuorial_step2_char', `${SITE_ROOT}js/game/readers_time/step${_step}/tuorial_step2_char.json`, true, true);
    playG(4);
    startTutorialTimer();
}

function startTutorialTimer(){
    if(tutorial_timer_interval) clearInterval(tutorial_timer_interval);
    const tutorial_timer_el = document.getElementById('tutorial_timer');
    const tutorial_time_bar_el = document.getElementById('tutorial_time_bar');
    const tutorial_time_div = document.getElementById('tutorial_time_div');
    const total = 12;
    let count = 6;
    tutorial_timer_el.textContent = count;
    tutorial_time_bar_el.value = (count / total) * 100;
    tutorial_time_div.classList.remove('hurry');
    tutorial_timer_interval = setInterval(() => {
        count--;
        if(count < 0) {
            count = 6;
            tutorial_time_div.classList.remove('hurry');
        }
        tutorial_timer_el.textContent = count;
        tutorial_time_bar_el.value = (count / total) * 100;
        if(count === 5) playG(6);
        if(count <= 5) tutorial_time_div.classList.add('hurry');
    }, 1000);
}

function closeTutorial(){
    if(tutorial_timer_interval) {
        clearInterval(tutorial_timer_interval);
        tutorial_timer_interval = null;
    }
    const tutorial_modal = document.getElementById('tutorial_modal');
    tutorial_modal.classList.remove('open');
    game_bg.pause();
    game_audio.play();
    playG(2);
}

function openSetting(){  
    const setting_modal = document.getElementById('setting_modal');
    setting_modal.classList.add('open');
    getMicDevices();
    getSpeakerDevices();
    playG(2);
}

function closeSetting(){
    const setting_modal = document.getElementById('setting_modal');
    setting_modal.classList.remove('open');
    stopMic();
    stopSpeaker();
    playG(2);
}

function playAudio(){
    if(mediaRecorder && mediaRecorder.state === 'recording'){
        return;
    }
    else{
        playG(2);
        const btn_play = document.getElementById('btn_play');
        if(btn_play.classList.contains('start')){
            btn_play.classList.remove('start');
            btn_play.classList.add('active');
            game_audio.play();
        }
        else{
            btn_play.classList.remove('active');
            btn_play.classList.add('start');
            game_audio.pause();
        }
    }
}

function playMe(){
    playG(2);
    const btn_me = document.getElementById('btn_me');
    if(btn_me.classList.contains('start')){
        btn_me.classList.remove('start');
        btn_me.classList.add('active');
        user_audio.play();
    }
    else{
        btn_me.classList.remove('active');
        btn_me.classList.add('start');
        user_audio.pause();
    }
}

function recording(){
    playG(2);
    const btn_record = document.getElementById('btn_record');
    if(btn_record.classList.contains('retry')){
        reset();
    }
    else{
        const btn_play = document.getElementById('btn_play');
        btn_play.classList.remove('active');
        btn_play.classList.add('start');
        game_audio.pause();
        game_audio.currentTime = 0;
    
        const hasLiveTracks = mediaRecorder && mediaRecorder.stream && mediaRecorder.stream.getTracks().some(track => track.readyState === 'live');
        if(!hasLiveTracks){
            // 스트림이 끝난 상태면 새로 초기화 후 다시 시작
            window.pendingRecordStart = true;
            CheckMediaRecorder();
            return;
        }

        if(mediaRecorder && mediaRecorder.state === 'recording'){
            mediaRecorder.stop();
            record_status = 1;
        }
        else{
            mediaRecorder.start();
        }
    }
}

function mediaRecorderStart(){
    // game_bg.pause();
    const btn_record = document.getElementById('btn_record');
    btn_record.classList.remove('start');
    btn_record.classList.add('active');

    if (!record_start) record_start = loadLottie('record_start', `${SITE_ROOT}js/game/readers_time/record_start.json`, true, true);
    if (!record_active_bar) record_active_bar = loadLottie('record_active_bar', `${SITE_ROOT}js/game/readers_time/record_active_bar.json`, true, true);

    showCharacter('char_l');

    // 이전 인터벌이 있으면 정리
    if(timer_interval) {
        clearInterval(timer_interval);
    }
    
    const timer = document.getElementById('timer');
    const time_bar = document.getElementById('time_bar');
    
    // 1초마다 타이머 감소
    let initial_timer_count = timer_count;
    timer_interval = setInterval(() => {
        timer_count--;
        
        // 타이머 UI 업데이트
        timer.textContent = timer_count.toString();
        
        // 5초 이하일 때 hurry 클래스 추가
        if(timer_count <= 5) {
            const time_div = document.getElementById('time_div');
            time_div.classList.add('hurry');
        }
        
        // 정확히 5초일 때만 사운드 재생
        if(timer_count === 5) {
            playG(6);
            showCharacter('char_t');
        }
        
        // time_bar 퍼센트 업데이트 (현재값/초기값 * 100)
        const percentage = (timer_count / initial_timer_count) * 100;
        time_bar.value = percentage;
        
        // 타이머가 0이 되면 녹음 중지
        if(timer_count <= 0) {
            clearInterval(timer_interval);
            timer_interval = null;
            // hurry 클래스 제거로 색상 초기화
            const time_div = document.getElementById('time_div');
            time_div.classList.remove('hurry');
            stopG();
            if(mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                record_status = 2;
            }
        }
    }, 1000);
}

function mediaRecorderStop(){
    // game_bg.play();
    if(timer_interval) {
        clearInterval(timer_interval);
        timer_interval = null;
    }
    
    const btn_record = document.getElementById('btn_record');
    btn_record.classList.remove('active');
    btn_record.classList.add('retry');

    const btn_me = document.getElementById('btn_me');
    btn_me.classList.remove('disable', 'active');
    btn_me.classList.add('start');

    showCharacter('char_d');

    const btn_send = document.getElementById('send_btn');
    btn_send.classList.remove('disable');
    btn_send.classList.add('start');

    let options = null;
    let userAgent = navigator.userAgent;
    let isIOS = /iPhone|iPad|iPod|Macintosh/i.test(userAgent);
    if(isIOS){
        options = {type: 'video/mp4'};
    }
    else{
        options = {type: 'audio/wav'};
    }

    let audio_blob = new Blob(chunks, options);
    let audio_url = URL.createObjectURL(audio_blob);
    user_audio.src = audio_url;
    user_audio.onended = function(){
        const btn_me = document.getElementById('btn_me');
        btn_me.classList.remove('active');
        btn_me.classList.add('start');
    }

    chunks = [];

    // 스트림을 완전히 종료해 통화 모드를 해제
    if(mediaRecorder && mediaRecorder.stream){
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    mediaRecorder = null;
}

function mediaRecorderPause(){
}

function mediaRecorderResume(){
}

function makeFeedback(){
    const game_main = document.getElementById('game_main');
    game_main.classList.add("result");

    const feedback = document.getElementById('feedback');
    feedback.querySelector(`#badge${record_status}`).style.display = 'block';
    if(record_status == 0){
        feedback.querySelector('#result_retry').style.display = 'block';
        playG(10);
        showCharacter('char_f');
    }
    else if(record_status == 1){
        feedback.querySelector('#result_next').style.display = 'block';
        correct_count++;
        playG(8);
        showCharacter('char_s');
    }
    else if(record_status == 2){
        feedback.querySelector('#result_retry').style.display = 'block';
        feedback.querySelector('#result_next').style.display = 'block';
        playG(9);
        showCharacter('char_f');
    }
}

function reset(){
    const game_main = document.getElementById('game_main');
    game_main.classList.remove("result");
    makeGame(game_index);

    const btn_record = document.getElementById('btn_record');
    btn_record.classList.remove('retry');
    btn_record.classList.add('start');
    const btn_me = document.getElementById('btn_me');
    btn_me.classList.remove('start', 'active');
    btn_me.classList.add('disable');
    const btn_send = document.getElementById('send_btn');
    btn_send.classList.remove('start');
    btn_send.classList.add('disable');

    // hurry 클래스 제거로 색상 초기화
    const time_div = document.getElementById('time_div');
    time_div.classList.remove('hurry');

    const feedback = document.getElementById('feedback');
    feedback.querySelector(`#badge0`).style.display = 'none';
    feedback.querySelector(`#badge1`).style.display = 'none';
    feedback.querySelector(`#badge2`).style.display = 'none';
    feedback.querySelector(`#result_retry`).style.display = 'none';
    feedback.querySelector(`#result_next`).style.display = 'none';
    record_status = 0;

    showCharacter('char_d');

    user_audio.src = '';
}

function next(){
    const ol_score = document.getElementById('ol_score');
    const score_item = ol_score.querySelectorAll('.score-item');
    if(record_status == 1){
        score_item[game_index].classList.add('complete');
        playG(7);
    }
    game_index++;

    if(game_index == game_content.length){
        // 게임 종료
        reportGameComplete();
        let path = window.location.pathname.split('/');
        path[path.length - 1] = 'result.html';
        window.location.href = appendBookNo(
            path.join('/') + `?correct_count=${correct_count}`,
            getBookNo()
        );
    }
    else{
        makeGame(game_index);
        reset();
        game_audio.play();
    }
}

function showCharacter(id) {
    const charPaths = {
        'char_d': `${SITE_ROOT}js/game/readers_time/step${_step}/char_d.json`,
        'char_l': `${SITE_ROOT}js/game/readers_time/step${_step}/char_l.json`,
        'char_t': `${SITE_ROOT}js/game/readers_time/step${_step}/char_t.json`,
        'char_s': `${SITE_ROOT}js/game/readers_time/step${_step}/char_s.json`,
        'char_f': `${SITE_ROOT}js/game/readers_time/step${_step}/char_f.json`,
    };
    Object.keys(charPaths).forEach(key => {
        const el = document.getElementById(key);
        if (!el) return;
        if (key === id) {
            el.style.display = 'block';
            if (key === 'char_d' && !char_d) char_d = loadLottie(key, charPaths[key], true, true);
            else if (key === 'char_l' && !char_l) char_l = loadLottie(key, charPaths[key], true, true);
            else if (key === 'char_t' && !char_t) char_t = loadLottie(key, charPaths[key], true, true);
            else if (key === 'char_s' && !char_s) char_s = loadLottie(key, charPaths[key], true, true);
            else if (key === 'char_f' && !char_f) char_f = loadLottie(key, charPaths[key], true, true);
            const ani = { char_d, char_l, char_t, char_s, char_f }[key];
            if (ani) ani.play();
        } else {
            el.style.display = 'none';
            const ani = { char_d, char_l, char_t, char_s, char_f }[key];
            if (ani) ani.stop();
        }
    });
}

function playG(index){
    g_audio.src = `${SITE_ROOT}audio/game/readerstime/g_sound_${index}.mp3`;
    g_audio.play();
}

function stopG(){
    g_audio.pause();
    g_audio.currentTime = 0;
    g_audio.src = '';
}