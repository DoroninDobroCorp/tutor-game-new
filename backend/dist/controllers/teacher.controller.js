"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyStudents = exports.connectStudentHandler = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
const db_1 = __importDefault(require("../db"));
const connectStudentHandler = async (req, res) => {
    if (!req.user || req.user.role !== 'TEACHER') {
        throw new errors_1.AppError('Not authorized', 403);
    }
    const { email } = req.body;
    const teacherId = req.user.userId;
    if (!email) {
        throw new errors_1.AppError('Student email is required', 400);
    }
    try {
        // Find student by email, case-insensitively
        const studentUser = await db_1.default.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { student: true },
        });
        if (!studentUser || !studentUser.student) {
            throw new errors_1.AppError('Student with this email not found', 404);
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
            throw new errors_1.AppError('This student is already connected to you', 400);
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
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError('Failed to connect student', 500);
    }
};
exports.connectStudentHandler = connectStudentHandler;
const getMyStudents = async (req, res) => {
    if (!req.user || req.user.role !== client_1.Role.TEACHER) {
        throw new errors_1.AppError('Not authorized', 403);
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
        throw new errors_1.AppError('Teacher profile not found', 404);
    }
    // "Unwrap" the data for easier consumption
    const students = teacherWithStudents.students.map(s => s.user);
    res.json({
        success: true,
        data: students,
    });
};
exports.getMyStudents = getMyStudents;
