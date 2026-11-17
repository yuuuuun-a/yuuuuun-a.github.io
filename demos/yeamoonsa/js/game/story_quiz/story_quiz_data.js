StoryQuiz.init({
    step: 2,
    introPath: SITE_ROOT + 'game/story_quiz/intro.html',
    quiz_type_arr: ['type1', 'type4', 'type6', 'type1', 'type1'],
    quiz_question_arr: ['What is the title of this book?', 'What is NOT in the story?', 'Choose the right picture.', 'What can the kids do?', 'What does the boy look at?'],
    quiz_direct_arr: ['/demos/yeamoonsa/s3/game/storyquiz/img/game_sq_111_Q1.png', '', 'Look at the butterfly.', '/demos/yeamoonsa/s3/game/storyquiz/img/game_sq_111_Q4.png', '/demos/yeamoonsa/s3/game/storyquiz/img/game_sq_111_Q5.png'],
    quiz_option_arr: [
        ['Row, Row, Row Your Boat', 'Go, Go, Go Your Boat'],
        ['/demos/yeamoonsa/s3/game/storyquiz/img/game_sq_111_Q2_1.png', '/demos/yeamoonsa/s3/game/storyquiz/img/game_sq_111_Q2_2.png', '/demos/yeamoonsa/s3/game/storyquiz/img/game_sq_111_Q2_3.png'],
        ['/demos/yeamoonsa/s3/game/storyquiz/img/game_sq_111_Q3_1.png', '/demos/yeamoonsa/s3/game/storyquiz/img/game_sq_111_Q3_2.png', '/demos/yeamoonsa/s3/game/storyquiz/img/game_sq_111_Q3_3.png'],
        ['They can swim.', 'They can row.', 'They can read.'],
        ['snail', 'bunny', 'turtle']
    ],
    quiz_answer_arr: [0, 0, 2, 1, 2],
    quiz_audio_arr: ['/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q1.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q2.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q3.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q4.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q5.mp3'],
    option_audio_arr: [
        ['/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q1_1.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q1_2.mp3'],
        ['/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q2_1.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q2_2.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q2_3.mp3'],
        ['/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q3_1.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q3_2.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q3_3.mp3'],
        ['/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q4_1.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q4_2.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q4_3.mp3'],
        ['/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q5_1.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q5_2.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_111_Q5_3.mp3']
    ],
    hint_audio_arr: ['/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_HINT.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_HINT.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_HINT.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_HINT.mp3', '/demos/yeamoonsa/s3/game/storyquiz/audio/game_sq_HINT.mp3']
});
