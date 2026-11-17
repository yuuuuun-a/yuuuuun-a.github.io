/*
 * Readers Time 데모 패치. scripts/build-demos.mjs가 game/readers_time/content.html의 record.js 바로 뒤에 넣습니다.
 *
 * 원본 record.js는 마이크가 없거나 권한을 거절하면 alert를 띄우고 history.back()으로 화면을 떠납니다.
 * 데모에서는 화면을 떠나지 않고, 녹음 버튼을 누르면 "녹음하는 척"만 하는 가짜 녹음기로 바꿔서
 * 녹음 → 타이머 → 내 목소리 듣기 → 보내기 흐름을 그대로 둘러볼 수 있게 합니다. (녹음 소리는 없습니다)
 * 함수 선언을 다시 하면 record.js의 같은 이름 함수를 덮어씁니다(전역 함수).
 */
var demoNoMicNoticeShown = false;

function demoShowNoMicNotice() {
  if (demoNoMicNoticeShown) return;
  demoNoMicNoticeShown = true;
  if (window.demoToast) window.demoToast("마이크 없이 둘러보는 중이에요. 녹음 버튼은 녹음 흐름만 보여 줘요.");
}

function demoInstallFakeRecorder() {
  var fake = {
    state: "inactive",
    stream: {
      getTracks: function () {
        return [{ readyState: "live", stop: function () {} }];
      },
    },
    start: function () {
      fake.state = "recording";
      mediaRecorderStart();
    },
    stop: function () {
      if (fake.state !== "recording") return;
      fake.state = "inactive";
      mediaRecorderStop();
    },
    pause: function () {},
    resume: function () {},
  };
  mediaRecorder = fake;
  if (window.pendingRecordStart) {
    window.pendingRecordStart = false;
    fake.start();
  }
}

// eslint-disable-next-line no-unused-vars
function mediaRecorderError() {
  demoShowNoMicNotice();
  demoInstallFakeRecorder();
}

// eslint-disable-next-line no-unused-vars
function CheckMediaRecorder(mic_id) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
    mediaRecorderError();
    return;
  }
  var constraints = mic_id !== undefined ? { audio: { deviceId: { exact: mic_id } } } : { audio: true };
  navigator.mediaDevices.getUserMedia(constraints).then(mediaRecorderSuccess, mediaRecorderError);
}
