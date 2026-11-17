let micFrameId = null;
let micStream;

const getMicDevices = () => {
    const mic_device = document.querySelector("#mic_device");
    mic_device.innerHTML = "";

    if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices){
        alert("마이크 테스트를 지원하지 않는 브라우저입니다.\nChrome 브라우저를 사용하세요.");
    }
    else{
        navigator.mediaDevices.enumerateDevices().then(async (devices) => {
            let option = document.createElement("option");
            option.text = "마이크 선택";
            option.value = "";
            mic_device.options.add(option);

            let mic_cnt = 0;
            devices.forEach((device) => {
                if(device.kind == "audioinput" && device.deviceId != "default" && device.deviceId != "communications"){
                    mic_cnt++;
                    option = document.createElement("option");
                    option.text = device.label;
                    option.value = device.deviceId;
                    mic_device.options.add(option);
                }
            });

            if(mic_cnt == 0){
                let option = document.createElement("option");
                option.text = "연결된 마이크가 없습니다.";
                mic_device.options.add(option);
            }
        }).catch(function(err){
			console.log(err.name+": "+err.massage);
		});
    }
}

const micSelect = (sel) => {
    stopMic();
    let mic_id = sel[sel.selectedIndex].value;
    localStorage.setItem("mic_id", mic_id);

    if(mic_id != ""){
        let constraints = {
            "audio": {
                "deviceId": {
                    "exact": sel[sel.selectedIndex].value
                }
            }
        };
    
        micTest(constraints);
    }
}

const micTest = (constraints) => {
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
            micStream = stream;

            const context = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = context.createAnalyser();
            const mediaStreamAudioSourceNode = context.createMediaStreamSource(stream);
            mediaStreamAudioSourceNode.connect(analyser, 0);
            const pcmData = new Float32Array(analyser.fftSize);

            const onFrame = () => {
                analyser.getFloatTimeDomainData(pcmData);
                let sum = 0.0;
                for(const amplitude of pcmData){
                    sum += amplitude * amplitude;
                }
                const rms = Math.sqrt(sum / pcmData.length);
                const normalizedVolume = Math.min(1, rms / 0.5);
                rangeMicMeter(normalizedVolume);
                micFrameId = window.requestAnimationFrame(onFrame);
            };
            
            micFrameId = window.requestAnimationFrame(onFrame);
        })
        .catch((err) => {
            console.error(err);
            alert("음성 녹음을 지원하지 않는 브라우저입니다.\nChrome 브라우저를 사용하세요.");
        });
};

const stopMic = () => {
    if(micFrameId){
        window.cancelAnimationFrame(micFrameId);
    }
    if(micStream){
        micStream.getTracks().forEach((track) => track.stop());
    }

    const output_mic = document.querySelector("#output_mic");
    output_mic.value = 0;
    output_mic.style.setProperty("--background-size", `0%`);
};

const normalizeToInteger = (volume, min, max) => {
    const scaledValue = Math.min(max, Math.max(min, volume * (max - min) + min));
    return Math.round(scaledValue);
};

const rangeMicMeter = (vol) => {
    const VOL_METER_MAX = 10;
    const output_mic = document.querySelector("#output_mic");
    if(output_mic){
        // console.log("vol", normalizeToInteger(vol, 0, VOL_METER_MAX));
        output_mic.value = normalizeToInteger(vol, 0, VOL_METER_MAX);
        let percent = output_mic.value / VOL_METER_MAX * 100;
        output_mic.style.setProperty("--background-size", `${percent}%`);
    }
};