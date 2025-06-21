"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignBadge = exports.getMyStudents = exports.connectStudentHandler = exports.updateStudentRoadmap = exports.getStudentProgress = exports.getTeacherDashboard = void 0;
const client_1 = require("@prisma/client");
const error_middleware_1 = require("../middlewares/error.middleware");
const db_1 = __importDefault(require("../db"));
const getTeacherDashboard = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const teacher = await db_1.default.teacher.findUnique({
        where: { userId: req.user.userId },
        include: {
            students: {
                include: {
                    goals: true,
                    roadmaps: true,
                    badges: true,
                    stories: {
                        include: {
                            images: true,
                        },
                    },
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
    const { studentId } = req.params;
    try {
        // Student access is already verified by the middleware
        const student = await db_1.default.student.findUnique({
            where: { userId: studentId },
            include: {
                goals: true,
                roadmaps: {
                    orderBy: { order: 'asc' }
                },
                badges: true,
                stories: {
                    orderBy: { chapter: 'asc' },
                    include: {
                        images: true
                    }
                }
            }
        });
        if (!student) {
            throw new error_middleware_1.AppError('Student not found', 404);
        }
        res.json({
            success: true,
            data: student,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            throw new error_middleware_1.AppError('Database error occurred', 500);
        }
        throw error;
    }
};
exports.getStudentProgress = getStudentProgress;
const updateStudentRoadmap = async (req, res) => {
    const { studentId } = req.params;
    const { topics } = req.body;
    if (!Array.isArray(topics)) {
        throw new error_middleware_1.AppError('Topics must be an array', 400);
    }
    try {
        // Student access is already verified by the middleware
        // Use a transaction for atomic operations
        const result = await db_1.default.$transaction(async (tx) => {
            // Delete existing roadmap entries
            await tx.roadmapEntry.deleteMany({
                where: { studentId },
            });
            // Create new roadmap entries
            const roadmapEntries = await Promise.all(topics.map((topic, index) => tx.roadmapEntry.create({
                data: {
                    topic,
                    order: index,
                    student: {
                        connect: { userId: studentId },
                    },
                },
            })));
            return roadmapEntries;
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            throw new error_middleware_1.AppError('Database error occurred', 500);
        }
        throw error;
    }
};
exports.updateStudentRoadmap = updateStudentRoadmap;
const connectStudentHandler = async (req, res) => {
    if (!req.user || req.user.role !== 'TEACHER') {
        throw new error_middleware_1.AppError('Not authorized', 403);
    }
    const { email } = req.body;
    const teacherId = req.user.userId;
    if (!email) {
        throw new error_middleware_1.AppError('Student email is required', 400);
    }
    try {
        // Find student by email
        const studentUser = await db_1.default.user.findUnique({
            where: { email: email },
            include: { student: true },
        });
        if (!studentUser || !studentUser.student) {
            throw new error_middleware_1.AppError('Student with this email not found', 404);
        }
        // Check if the connection already exists
        const existingConnection = await db_1.default.teacher.findFirst({
            where: {
                userId: teacherId,
                students: {
                    some: {
                        userId: studentUser.student.userId
                    }
                }
            }
        });
        if (existingConnection) {
            throw new error_middleware_1.AppError('This student is already connected to you', 400);
        }
        // Add student to teacher's students
        await db_1.default.teacher.update({
            where: { userId: teacherId },
            data: {
                students: {
                    connect: {
                        userId: studentUser.student.userId,
                    },
                },
            },
        });
        res.status(200).json({
            success: true,
            message: 'Student connected successfully',
            data: {
                id: studentUser.id,
                firstName: studentUser.firstName,
                lastName: studentUser.lastName
            }
        });
    }
    catch (error) {
        console.error('Error connecting student:', error);
        if (error instanceof error_middleware_1.AppError) {
            throw error;
        }
        throw new error_middleware_1.AppError('Failed to connect student', 500);
    }
};
exports.connectStudentHandler = connectStudentHandler;
const getMyStudents = async (req, res) => {
    if (!req.user || req.user.role !== client_1.Role.TEACHER) {
        throw new error_middleware_1.AppError('Not authorized', 403);
    }
    const teacherId = req.user.userId;
    const teacherWithStudents = await db_1.default.teacher.findUnique({
        where: { userId: teacherId },
        select: {
            students: {
                select: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    }
                }
            }
        }
    });
    if (!teacherWithStudents) {
        throw new error_middleware_1.AppError('Teacher profile not found', 404);
    }
    // "Unwrap" the data for easier consumption
    const students = teacherWithStudents.students.map(s => s.user);
    res.json({
        success: true,
        data: students,
    });
};
exports.getMyStudents = getMyStudents;
const assignBadge = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const { studentId } = req.params;
    const { title } = req.body;
    if (!title) {
        throw new error_middleware_1.AppError('Please provide a badge title', 400);
    }
    try {
        // Verify the teacher has access to this student
        const teacher = await db_1.default.teacher.findUnique({
            where: { userId: req.user.userId },
            include: {
                students: {
                    where: { userId: studentId },
                    include: {
                        goals: true,
                        roadmaps: true,
                        badges: true,
                        stories: {
                            include: {
                                images: true
                            }
                        }
                    }
                },
            },
        });
        if (!teacher || !teacher.students || teacher.students.length === 0) {
            throw new error_middleware_1.AppError('Student not found or access denied', 404);
        }
        const badge = await db_1.default.badge.create({
            data: {
                title,
                status: 'EARNED',
                student: {
                    connect: { userId: studentId },
                },
            },
        });
        res.json({
            success: true,
            data: badge,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new error_middleware_1.AppError('Badge with this title already exists for this student', 400);
            }
            throw new error_middleware_1.AppError('Database error occurred', 500);
        }
        throw error;
    }
};
exports.assignBadge = assignBadge;
