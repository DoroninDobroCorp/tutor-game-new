"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAnswer = exports.generateMathProblemHandler = exports.getRoadmap = exports.setStudentGoal = exports.getStudentProfile = void 0;
const client_1 = require("@prisma/client");
const error_middleware_1 = require("../middlewares/error.middleware");
const openai_service_1 = require("../services/openai.service");
const prisma = new client_1.PrismaClient();
const getStudentProfile = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const student = await prisma.student.findUnique({
        where: { id: req.user.userId },
        include: {
            goal: true,
            roadmaps: {
                orderBy: { order: 'asc' },
            },
            badges: true,
            stories: {
                orderBy: { chapter: 'asc' },
            },
            images: true,
        },
    });
    if (!student) {
        throw new error_middleware_1.AppError('Student not found', 404);
    }
    res.json({
        success: true,
        data: student,
    });
};
exports.getStudentProfile = getStudentProfile;
const setStudentGoal = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const { title } = req.body;
    if (!title) {
        throw new error_middleware_1.AppError('Please provide a goal title', 400);
    }
    const goal = await prisma.goal.upsert({
        where: { studentId: req.user.userId },
        update: { title },
        create: {
            title,
            student: {
                connect: { id: req.user.userId },
            },
        },
    });
    res.json({
        success: true,
        data: goal,
    });
};
exports.setStudentGoal = setStudentGoal;
const getRoadmap = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const roadmaps = await prisma.roadmapEntry.findMany({
        where: { studentId: req.user.userId },
        orderBy: { order: 'asc' },
    });
    res.json({
        success: true,
        data: roadmaps,
    });
};
exports.getRoadmap = getRoadmap;
const generateMathProblemHandler = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const { topic, difficulty } = req.query;
    if (!topic || !difficulty) {
        throw new error_middleware_1.AppError('Please provide topic and difficulty', 400);
    }
    const problem = await (0, openai_service_1.generateMathProblem)(topic, parseInt(difficulty, 10));
    res.json({
        success: true,
        data: problem,
    });
};
exports.generateMathProblemHandler = generateMathProblemHandler;
const submitAnswer = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const { problemId, answer } = req.body;
    if (!problemId || answer === undefined) {
        throw new error_middleware_1.AppError('Please provide problemId and answer', 400);
    }
    // In a real app, we would validate the answer and update progress
    // For now, we'll just return success
    res.json({
        success: true,
        data: {
            correct: true, // This would be determined by your logic
            pointsEarned: 10,
            nextTopic: 'Next math topic',
        },
    });
};
exports.submitAnswer = submitAnswer;
