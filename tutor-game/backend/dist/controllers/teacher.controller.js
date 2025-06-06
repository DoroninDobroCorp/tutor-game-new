"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignBadge = exports.updateStudentRoadmap = exports.getStudentProgress = exports.getTeacherDashboard = void 0;
const client_1 = require("@prisma/client");
const error_middleware_1 = require("../middlewares/error.middleware");
const prisma = new client_1.PrismaClient();
const getTeacherDashboard = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const teacher = await prisma.teacher.findUnique({
        where: { id: req.user.userId },
        include: {
            students: {
                include: {
                    goal: true,
                    roadmaps: true,
                    badges: true,
                    stories: true,
                    images: true,
                },
            },
        },
    });
    if (!teacher) {
        throw new error_middleware_1.AppError('Teacher not found', 404);
    }
    res.json({
        success: true,
        data: teacher,
    });
};
exports.getTeacherDashboard = getTeacherDashboard;
const getStudentProgress = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const { studentId } = req.params;
    // Verify the teacher has access to this student
    const teacher = await prisma.teacher.findUnique({
        where: { id: req.user.userId },
        include: {
            students: {
                where: { id: studentId },
            },
        },
    });
    if (!teacher || teacher.students.length === 0) {
        throw new error_middleware_1.AppError('Student not found or access denied', 404);
    }
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            goal: true,
            roadmaps: {
                orderBy: { order: 'asc' },
            },
            badges: true,
            stories: {
                orderBy: { chapter: 'asc' },
                include: {
                    images: true,
                },
            },
        },
    });
    res.json({
        success: true,
        data: student,
    });
};
exports.getStudentProgress = getStudentProgress;
const updateStudentRoadmap = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const { studentId } = req.params;
    const { topics } = req.body;
    if (!Array.isArray(topics)) {
        throw new error_middleware_1.AppError('Topics must be an array', 400);
    }
    // Verify the teacher has access to this student
    const teacher = await prisma.teacher.findUnique({
        where: { id: req.user.userId },
        include: {
            students: {
                where: { id: studentId },
            },
        },
    });
    if (!teacher || teacher.students.length === 0) {
        throw new error_middleware_1.AppError('Student not found or access denied', 404);
    }
    // Delete existing roadmap entries
    await prisma.roadmapEntry.deleteMany({
        where: { studentId },
    });
    // Create new roadmap entries
    const roadmapEntries = await Promise.all(topics.map((topic, index) => prisma.roadmapEntry.create({
        data: {
            topic,
            order: index,
            student: {
                connect: { id: studentId },
            },
        },
    })));
    res.json({
        success: true,
        data: roadmapEntries,
    });
};
exports.updateStudentRoadmap = updateStudentRoadmap;
const assignBadge = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const { studentId } = req.params;
    const { title } = req.body;
    if (!title) {
        throw new error_middleware_1.AppError('Please provide a badge title', 400);
    }
    // Verify the teacher has access to this student
    const teacher = await prisma.teacher.findUnique({
        where: { id: req.user.userId },
        include: {
            students: {
                where: { id: studentId },
            },
        },
    });
    if (!teacher || teacher.students.length === 0) {
        throw new error_middleware_1.AppError('Student not found or access denied', 404);
    }
    const badge = await prisma.badge.create({
        data: {
            title,
            status: 'EARNED',
            student: {
                connect: { id: studentId },
            },
        },
    });
    res.json({
        success: true,
        data: badge,
    });
};
exports.assignBadge = assignBadge;
