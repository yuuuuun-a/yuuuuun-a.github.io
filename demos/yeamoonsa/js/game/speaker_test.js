let speakerFrameId = null;
let speaker_id = "";
let context, speaker_analyser;

const getSpeakerDevices = () => {
    const speaker_device = document.querySelector("#speaker_device");
    speaker_device.innerHTML = "";

    if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices){
        alert("스피커 테스트를 지원하지 않는 브라우저입니다.\nChrome 브라우저를 사용하세요.");
    }
    else{
        navigator.mediaDevices.enumerateDevices().then(async (devices) => {
            let option = document.createElement("option");
            option.text = "스피커 선택";
            option.value = "";
            speaker_device.options.add(option);

            let speaker_cnt = 0;
            devices.forEach((device) => {
                if(device.kind == "audiooutput" && device.deviceId != "default" && device.deviceId != "communications"){
                    speaker_cnt++;
                    option = document.createElement("option");
                    option.text = device.label;
                    option.value = device.deviceId;
                    speaker_device.options.add(option);
                }
            });

            if(speaker_cnt == 0){
                let option = document.createElement("option");
                option.text = "연결된 스피커가 없습니다.";
                speaker_device.options.add(option);
            }
        }).catch(function(err){
			console.log(err.name+": "+err.massage);
		});
    }
}

const speakerSelect = (sel) => {
    stopSpeaker();
    speaker_id = sel[sel.selectedIndex].value;
    localStorage.setItem("speaker_id", speaker_id);
}

const testAudio = async () => {
    if(speaker_id != ""){
        test_audio = document.querySelector("#test_audio");
        test_audio.play();
        
        if(!context){
            context = new (window.AudioContext || window.webkitAudioContext)();
            // console.log("speaker_id", speaker_id);
            await context.setSinkId(speaker_id);
            // console.log("sinkId", context.sinkId);
            const track = context.createMediaElementSource(test_audio);
            speaker_analyser = context.createAnalyser();
            const gainNode = context.createGain();
            track.connect(speaker_analyser, 0);
            speaker_analyser.connect(gainNode);
            gainNode.connect(context.destination);
            gainNode.gain.value = 1;
        }
        else{
            await context.setSinkId(speaker_id);
        }

        const pcmData = new Float32Array(speaker_analyser.fftSize);
        const onFrame = () => {
            speaker_analyser.getFloatTimeDomainData(pcmData);
            let sum = 0.0;
            for(const amplitude of pcmData){
                sum += amplitude * amplitude;
            }
            const rms = Math.sqrt(sum / pcmData.length);
            const normalizedVolume = Math.min(1, rms / 0.5);
            rangeSpeakerMeter(normalizedVolume);
            speakerFrameId = window.requestAnimationFrame(onFrame);
        };
        
        speakerFrameId = window.requestAnimationFrame(onFrame);
    }
};

const stopSpeaker = () => {
    speaker_id = "";
    if(speakerFrameId){
        window.cancelAnimationFrame(speakerFrameId);
    }
    if(test_audio){
        test_audio.pause();
        test_audio.currentTime = 0;
    }

    const output_speaker = document.querySelector("#output_speaker");
    output_speaker.value = 0;
    output_speaker.style.setProperty("--background-size", `0%`);
}

const rangeSpeakerMeter = (vol) => {
    const VOL_METER_MAX = 10;
    const output_speaker = document.querySelector("#output_speaker");
    if(output_speaker){
        // console.log("vol", normalizeToInteger(vol, 0, VOL_METER_MAX));
        output_speaker.value = normalizeToInteger(vol, 0, VOL_METER_MAX);
        let percent = output_speaker.value / VOL_METER_MAX * 100;
        output_speaker.style.setProperty("--background-size", `${percent}%`);
    }
};