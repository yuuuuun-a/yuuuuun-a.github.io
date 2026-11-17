let recordCtx = new (window.AudioContext || window.webkitAudioContext)();
let analyser = recordCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;
let gainNode = recordCtx.createGain();
let record_source;

let mediaRecorder = null;
let chunks = [];
window.pendingRecordStart = false;

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);
let silenceThreshold = 0.01; // 이 값 이하이면 무음으로 간주
let silenceTimeout = 2000; // 2초동안 무음이면 녹음 종료
let silenceTimer = null;

function checkForSilence(){
    // 무음 감지 기능 비활성화 - 버튼으로만 녹음 종료 가능
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for(let i=0; i<bufferLength; i++){
        sum += dataArray[i];
    }
    const average = sum / bufferLength;

    // console.log(average);
    if(average < silenceThreshold * 255){
        // console.log("* silence *", silenceTimer);
        if(!silenceTimer){
            silenceTimer = setTimeout(() => {
                // 무음 감지로 인한 녹음 중지는 정상적인 완료이므로 저장
                if (window.shouldSaveRecording !== undefined) {
                    window.shouldSaveRecording = true;
                }
                mediaRecorder.stop();
                clearTimeout(silenceTimer);
                silenceTimer = null;
                console.log('🔇 무음 감지로 녹음 자동 중지');
            }, silenceTimeout);
        }
    }
    else{
        // console.log("=== NO ===");
        clearTimeout(silenceTimer);
        silenceTimer = null;
    }

    if(mediaRecorder.state === "recording"){
        requestAnimationFrame(checkForSilence);
    }
}

function connectAudioCtx(stream){
    record_source = recordCtx.createMediaStreamSource(stream);
    record_source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(recordCtx.destination);
    gainNode.gain.setValueAtTime(0, recordCtx.currentTime);
}

function CheckMediaRecorder(mic_id) {
    if (navigator.mediaDevices.getUserMedia) {
        let constraints = {"audio": true};
        if(mic_id != undefined){
            constraints = {
                "audio": {
                    "deviceId": {
                        "exact": mic_id
                    }
                }
            };
        }
        
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then(
                mediaRecorderSuccess,
                mediaRecorderError
            );
    } else {
        console.log("getUserMedia not supported on your browser!");
        alert("Record api not supported on your browser! Please use Chrome.");
    }
}

function mediaRecorderSuccess(stream) {
    let options = null;
    if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
        options = {mimeType: 'video/webm; codecs=vp9'};
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = {mimeType: 'video/webm'};
    } else if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
        options = {mimeType: 'audio/webm; codecs=opus'};
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = {mimeType: 'video/mp4', videoBitsPerSecond: 100000};
    } else {
        alert("현재 기기에서 지원하는 코덱이 없습니다. 다른 기기로 접속 부탁드립니다.");
        return;
    }

    mediaRecorder = new MediaRecorder(stream, options);
    connectAudioCtx(stream);
    
    mediaRecorder.addEventListener(
        "start",
        mediaRecorderStart
    );
    mediaRecorder.addEventListener(
        "stop",
        mediaRecorderStop
    );
    mediaRecorder.addEventListener(
        "pause",
        mediaRecorderPause
    );
    mediaRecorder.addEventListener(
        "resume",
        mediaRecorderResume
    );
    mediaRecorder.addEventListener(
        "dataavailable",
        mediaRecorderAvailable
    );

    // 직전에 요청된 녹음 재개가 있으면 바로 시작
    if(window.pendingRecordStart){
        window.pendingRecordStart = false;
        mediaRecorder.start();
    }

    // recording();
}

function mediaRecorderError(err) {
    if (err.name == "NotFoundError") {
        alert("마이크 연결 상태를 확인하고\n다시 시도해 주세요.");
    } else if (err.name === "NotAllowedError") {
        alert("마이크 사용이 허용되지 않았습니다.\n상태를 확인하고 다시 시도해 주세요.");
    }
    else if(err.name === "OverconstrainedError"){
        alert("설정 메뉴에서 마이크 설정을 확인하고\n다시 시도해 주세요.");
    }
    else{
        console.log(err);
    }

    window.history.back();
}

function mediaRecorderAvailable(e){
    chunks.push(e.data);
}