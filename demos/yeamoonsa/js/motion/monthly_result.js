document.addEventListener("DOMContentLoaded", function(){
    var excellent = lottie.loadAnimation({
        container: document.getElementById('excellent'),
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: SITE_ROOT + 'js/motion/monthly_excellent.json'
    });

    var goodJob = lottie.loadAnimation({
        container: document.getElementById('good_job'),
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: SITE_ROOT + 'js/motion/monthly_good-job.json'
    });

    var niceTry = lottie.loadAnimation({
        container: document.getElementById('nice_try'),
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: SITE_ROOT + 'js/motion/monthly_nice-try.json'
    });

    let audioFile = null;
    if (document.getElementById('excellent')) audioFile = SITE_ROOT + 'audio/monthly/excellent.mp3';
    else if (document.getElementById('good_job')) audioFile = SITE_ROOT + 'audio/monthly/goodjob.mp3';
    else if (document.getElementById('nice_try')) audioFile = SITE_ROOT + 'audio/monthly/nicetry.mp3';

    if (audioFile) {
        const resultAudio = new Audio(audioFile);
        resultAudio.play();
    }
});