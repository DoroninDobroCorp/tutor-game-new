"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStudentWithRelations = exports.isTeacherWithStudents = void 0;
// Type guard for teacher with students
const isTeacherWithStudents = (teacher) => {
    return teacher &&
        typeof teacher === 'object' &&
        'students' in teacher &&
        Array.isArray(teacher.students);
};
exports.isTeacherWithStudents = isTeacherWithStudents;
// Type guard for student with relations
const isStudentWithRelations = (student) => {
    return student &&
        typeof student === 'object' &&
        'goal' in student &&
        'roadmaps' in student &&
        'badges' in student &&
        'stories' in student;
};
exports.isStudentWithRelations = isStudentWithRelations;
