"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teacher_controller_1 = require("../controllers/teacher.controller");
const performanceLogs_controller_1 = require("../controllers/performanceLogs.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const teacher_middleware_1 = require("../middlewares/teacher.middleware");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
// Protect all routes with authentication and teacher role
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('TEACHER'));
// Get all students for the teacher
router.get('/students', (0, errors_1.asyncHandler)(teacher_controller_1.getMyStudents));
// Connect student to teacher
router.post('/students/connect', (0, errors_1.asyncHandler)(teacher_controller_1.connectStudentHandler));
// Get student performance logs for a specific goal
router.get('/goals/:goalId/students/:studentId/logs', teacher_middleware_1.checkStudentAccess, (0, errors_1.asyncHandler)(performanceLogs_controller_1.getStudentPerformanceLogs));
exports.default = router;
