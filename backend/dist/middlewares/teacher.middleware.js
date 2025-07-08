"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStudentAccess = void 0;
const db_1 = __importDefault(require("../db"));
const errors_1 = require("../utils/errors");
const checkStudentAccess = async (req, res, next) => {
    const { studentId } = req.params;
    const teacherId = req.user?.userId;
    if (!studentId || !teacherId) {
        return next(new errors_1.AppError('Missing student or teacher ID', 400));
    }
    const student = await db_1.default.student.findFirst({
        where: {
            userId: studentId,
            teachers: {
                some: {
                    userId: teacherId,
                },
            },
        },
    });
    if (!student) {
        return next(new errors_1.AppError('Student not found or access denied', 404));
    }
    // Attach student to request for later use in controllers
    req.student = student;
    next();
};
exports.checkStudentAccess = checkStudentAccess;
