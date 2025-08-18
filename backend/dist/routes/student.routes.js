"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const student_controller_1 = require("../controllers/student.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const errors_1 = require("../utils/errors");
const fileUpload_1 = require("../utils/fileUpload");
const achievement_controller_1 = require("../controllers/achievement.controller");
const router = (0, express_1.Router)();
// Protect all routes with authentication
router.use(auth_middleware_1.authenticate);
// Adventure routes
router.get('/current-lesson', (0, errors_1.asyncHandler)(student_controller_1.getCurrentLessonHandler));
router.post('/lessons/:lessonId/practice-chat', (0, auth_middleware_1.authorize)('STUDENT'), (0, errors_1.asyncHandler)(student_controller_1.lessonPracticeChatHandler));
router.post('/lessons/:lessonId/end-for-review', (0, auth_middleware_1.authorize)('STUDENT'), (0, errors_1.asyncHandler)(student_controller_1.endLessonForReviewHandler));
router.post('/lessons/:lessonId/submit', (0, auth_middleware_1.authorize)('STUDENT'), fileUpload_1.upload.single('image'), (0, errors_1.asyncHandler)(student_controller_1.submitLessonHandler));
// Completed lessons
router.get('/goals/:goalId/completed-lessons', (0, auth_middleware_1.authorize)('STUDENT'), (0, errors_1.asyncHandler)(student_controller_1.getCompletedLessonsHandler));
// Story history
router.get('/story/:goalId', (0, auth_middleware_1.authorize)('STUDENT'), (0, errors_1.asyncHandler)(student_controller_1.getStoryHistoryHandler));
router.get('/story/:goalId/summary', (0, auth_middleware_1.authorize)('STUDENT'), (0, errors_1.asyncHandler)(student_controller_1.getStorySummaryHandler));
// Achievements
router.get('/achievements', (0, auth_middleware_1.authorize)('STUDENT'), (0, errors_1.asyncHandler)(achievement_controller_1.getMyAchievements));
// Keep profile route at the end to avoid route conflicts
router.get('/profile', (0, errors_1.asyncHandler)(student_controller_1.getStudentProfile));
exports.default = router;
