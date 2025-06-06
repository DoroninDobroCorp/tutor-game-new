"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teacher_controller_1 = require("../controllers/teacher.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Protect all routes with authentication and teacher role
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('TEACHER'));
// Teacher dashboard
router.get('/dashboard', teacher_controller_1.getTeacherDashboard);
// Student management
router.get('/students/:studentId', teacher_controller_1.getStudentProgress);
router.put('/students/:studentId/roadmap', teacher_controller_1.updateStudentRoadmap);
router.post('/students/:studentId/badges', teacher_controller_1.assignBadge);
exports.default = router;
