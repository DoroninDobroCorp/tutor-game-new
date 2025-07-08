"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const student_controller_1 = require("../controllers/student.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Protect all routes with authentication
router.use(auth_middleware_1.authenticate);
// Student profile routes
router.get('/profile', student_controller_1.getStudentProfile);
router.post('/goal', student_controller_1.setStudentGoal);
router.get('/roadmap', student_controller_1.getRoadmap);
// Math problem routes
router.get('/math-problem', student_controller_1.generateMathProblemHandler);
router.post('/submit-answer', student_controller_1.submitAnswer);
exports.default = router;
