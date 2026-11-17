let q_audio = new Audio();
let q_index = 0;
let test_done = false;
let swiper = null;

// 학습 시간 관련 변수
let monthlyStudyTimeSeconds = 0;
let monthlyStudyTimeInterval = null;
let hasReportedMonthlyTime = false;

// 학습 시간 타이머 시작
function startMonthlyStudyTimer() {
    if (monthlyStudyTimeInterval) return;
    
    console.log('📝 Monthly 학습 시간 타이머 시작');
    monthlyStudyTimeInterval = setInterval(() => {
        monthlyStudyTimeSeconds++;
    }, 1000);
}

// 학습 시간 타이머 중지
function stopMonthlyStudyTimer() {
    if (monthlyStudyTimeInterval) {
        clearInterval(monthlyStudyTimeInterval);
        monthlyStudyTimeInterval = null;
    }
}

// 학습 시간 API 호출
function reportMonthlyTime() {
    if (hasReportedMonthlyTime || monthlyStudyTimeSeconds <= 0) return;
    
    hasReportedMonthlyTime = true;
    stopMonthlyStudyTimer();
    
    console.log(`📝 Monthly 학습 시간 ${monthlyStudyTimeSeconds}초`);
}

window.addEventListener("DOMContentLoaded", function() {
    // 학습 시간 타이머 시작
    startMonthlyStudyTimer();

    // example_answer에 "_"가 있는 빈칸 여러 개짜리 문제 렌더링
    renderExampleSplit();

    if(!isIOS() && !test_done){
        playQ(1);
    }
    q_audio.addEventListener("ended", function() {
        const q_btn = document.getElementById(`q_btn_${q_index}`);
        q_btn.classList.remove("pause");
        q_index = 0;
    });

    const pagination = document.querySelector(".pagination");
    const nums = pagination.querySelectorAll(".num");


    const updateSlidesOpacity = function(swiper) {
        // 모든 슬라이드의 opacity를 0으로 설정
        swiper.slides.forEach(slide => {
            slide.style.opacity = "0";
        });
        // 현재 활성화된 슬라이드만 opacity 1로 설정
        swiper.slides[swiper.activeIndex].style.opacity = "1";
    };

    swiper = new Swiper(".question-swiper", {
        direction: "horizontal",
        autoHeight: true,
        effect: "fade", 
        fadeEffect: {
            crossFade: true
        },
        speed: 500,
        loop: false,
        navigation: {
            prevEl: ".question-swiper-area .btn-prev",
            nextEl: ".question-swiper-area .btn-next"
        },
        on: {
            slideChange: function() {
                updateSlidesOpacity(this);
            },
            resize: function() {
                updateSlidesOpacity(this);
            },
            slideChangeTransitionStart: function() {
                nums.forEach(num => {
                    num.classList.remove("index");
                });
                nums[this.activeIndex].classList.add("index");

                if(!test_done){
                    const doneBtn = document.querySelector("#doneButton");
                    if(this.activeIndex == this.slides.length - 1){
                        doneBtn.style.display = "flex";
                    }
                    else{
                        doneBtn.style.display = "none";
                    }
                }
                else{
                    const resultBtn = document.querySelector("#resultButton");
                    if(this.activeIndex == this.slides.length - 1){
                        resultBtn.style.display = "flex";
                    }
                    else{
                        resultBtn.style.display = "none";
                    }
                }

                if(!test_done){
                    playQ(this.activeIndex + 1);
                }
            }
        }
    });

    const questionRadio = document.querySelectorAll(".question-radio");
    questionRadio.forEach(radio => {
        radio.addEventListener("change", function() {
            nums[swiper.activeIndex].classList.remove("index");
            nums[swiper.activeIndex].classList.add("complete");
        });
    });
});

function moveSlide(index){
    swiper.slideTo(index);
}

function playQ(q_no){
    if(q_index != q_no){
        if(q_index != 0){
            const q_old = document.getElementById(`q_btn_${q_index}`);
            q_old.classList.remove("pause");
        }
        q_audio.src = `/demos/yeamoonsa/s3/monthly/test_${book_no}/audio/b${book_no}q${q_no}.mp3`;
    }
    q_index = q_no;

    const q_btn = document.getElementById(`q_btn_${q_index}`);
    if(q_btn.classList.contains("pause")){
        q_btn.classList.remove("pause");
        q_audio.pause();
    }
    else{
        q_btn.classList.add("pause");
        q_audio.play();
    }
}

function doneTest(){
    const radioInputs = document.querySelectorAll("input[type='radio']");
    const questionNames = new Set();
    radioInputs.forEach(radio => {
        if(radio.name) {
            questionNames.add(radio.name);
        }
    });
    
    const totalQuestions = questionNames.size;
    const answered = document.querySelectorAll("input[type='radio']:checked");
    
    console.log(`총 질문 수: ${totalQuestions}, 답변한 질문 수: ${answered.length}`);

    if(totalQuestions != answered.length){
        checkTest();
    }
    else{
        grading();
    }
}

function exitModal(){
    const exit_modal = document.getElementById("exit_modal");
    exit_modal.classList.add("on");
    document.body.style.overflow = "hidden";
}

function stay(){
    const exit_modal = document.getElementById("exit_modal");
    exit_modal.classList.remove("on");
    document.body.style.overflow = "unset";
}

function leave() {
    if (isPC()) {
        self.close();
    } else {
        window.history.back();
    }
}

function isPC() {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'mobile'];
    return !mobileKeywords.some(keyword => userAgent.includes(keyword));
}

function checkTest(){
    const check_modal = document.getElementById("check_modal");
    check_modal.classList.add("on");
    document.body.style.overflow = "hidden";
}

function backToTest(){
    const check_modal = document.getElementById("check_modal");
    check_modal.classList.remove("on");
    document.body.style.overflow = "unset";
}

function checkDone(){
    const check_modal = document.getElementById("check_modal");
    check_modal.classList.remove("on");
    document.body.style.overflow = "unset";
    grading();
}

function renderExampleSplit(){
    monthlyTestList.forEach(function(mt){
        if (!mt.example_text || !mt.example_text.includes("_")) return;
        const container = document.getElementById(`split_${mt.order_no}`);
        if (!container) return;

        const pieces = (mt.example_text || "").split("_");
        pieces.forEach(function(piece, i){
            if (piece) {
                const textSpan = document.createElement("span");
                textSpan.className = "text-piece";
                textSpan.textContent = piece;
                container.appendChild(textSpan);
            }
            if (i < pieces.length - 1) {
                const empty = document.createElement("div");
                empty.className = "empty";
                const answerSpan = document.createElement("span");
                answerSpan.className = "answer";
                empty.appendChild(answerSpan);
                container.appendChild(empty);
            }
        });
    });
}

function fillExampleSplitAnswer(mt){
    if (!mt || !mt.example_text || !mt.example_text.includes("_")) return;
    const container = document.getElementById(`split_${mt.order_no}`);
    if (!container) return;

    // "_" 구분자가 있으면 칸별 정답으로, 없으면 한 글자씩 순서대로 채운다
    const answerPieces = mt.example_answer.includes("_") ? mt.example_answer.split("_") : mt.example_answer.split("");
    const answerSpans = container.querySelectorAll(".empty .answer");
    answerSpans.forEach(function(span, i){
        span.textContent = answerPieces[i] || "";
    });
}

function grading(){
    const answer = monthlyAnswer.answers.split("/");
    test_done = true;
    
    let correctCount = 0;
    const printBtn = document.querySelector(".print-btn");
    printBtn.style.visibility = "visible";
    const doneBtn = document.querySelector("#doneButton");
    doneBtn.style.display = "none";
    swiper.slideTo(0);
    
    // 각 문제별로 채점
    let userAnswerArr = "";
    const pagination = document.querySelector(".pagination");
    const nums = pagination.querySelectorAll(".num");
    answer.forEach((correctAnswer, index) => {
        const questionInput = document.querySelector(`input[name="question${index+1}"]`);
        if (!questionInput) return;

        const checkedRadio = document.querySelector(`input[name="question${index+1}"]:checked`);
        const questionWrap = questionInput.closest('.question-wrap');
        const correctRadio = document.querySelector(`input[name="question${index+1}"][value="${correctAnswer}"]`);
        const userAnswer = checkedRadio ? checkedRadio.value : "";
        userAnswerArr += `${userAnswer}/`;

        if (correctRadio) {
            const correctLabel = correctRadio.nextElementSibling;
            if (correctLabel) {
                correctLabel.classList.add('correct');
            }
        }
        if (checkedRadio) {
            const selectedLabel = checkedRadio.nextElementSibling;
            if (selectedLabel) {
                selectedLabel.classList.add('my-answer');
            }
        }

        fillExampleSplitAnswer(monthlyTestList[index]);

        if (checkedRadio && checkedRadio.value === correctAnswer) {
            nums[index].classList.remove("index", "complete");
            nums[index].classList.add("correct");
            questionWrap.classList.add('correct');
            correctCount++;
        } else {
            nums[index].classList.remove("index", "complete");
            nums[index].classList.add("wrong");
            questionWrap.classList.add('wrong');
        }
    });
    userAnswerArr = userAnswerArr.slice(0, -1);

    // 채점 완료 후 모든 radio 버튼 비활성화
    const allRadioInputs = document.querySelectorAll("input[type='radio']");
    allRadioInputs.forEach(radio => {
        radio.disabled = true;
    });

    // 인쇄 화면 점수 표시
    const myScore = document.getElementById('my_score');
    myScore.textContent = correctCount;
    
    // 학습 시간 API 호출
    reportMonthlyTime();
    
    
    console.log(`채점 완료: ${correctCount}/10점`);
    window.scrollTo(0, 0);
}

function printTest(){
    if(test_done){
        window.print();
    }
    else{
        alert("테스트를 완료해주세요.");
    }
}

function showResult(){
    window.location.href = `${SITE_ROOT}monthly_test/result.html?book_no=${book_no}`;
}

// 브라우저 화면 확대/축소 시 문제 발생..추후 해결법 찾겠음
// function resizeSVG(){
//   document.querySelectorAll(".question-sen").forEach(el => {
//     const { width, height } = el.getBoundingClientRect();
//     const svg = el.querySelector(".icon-stroke");
//     const rectEl = svg.querySelector("rect");
//     const clipPath = svg.querySelector("clipPath rect");

//     svg.setAttribute("width", width);
//     svg.setAttribute("height", height);
//     svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

//     rectEl.setAttribute("width", width);
//     rectEl.setAttribute("height", height);

//     if (clipPath) {
//         clipPath.setAttribute("width", width);
//         clipPath.setAttribute("height", height);
//     }

//     console.log(width, '/', height)
//   });
// }

// window.addEventListener("DOMContentLoaded", resizeSVG);
// window.addEventListener("resize", resizeSVG);