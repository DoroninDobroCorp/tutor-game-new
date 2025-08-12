"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorySummaryHandler = exports.getStoryHistoryHandler = exports.getCompletedLessonsHandler = exports.submitLessonHandler = exports.endLessonForReviewHandler = exports.lessonPracticeChatHandler = exports.getCurrentLessonHandler = exports.getStudentProfile = void 0;
const errors_1 = require("../utils/errors");
const db_1 = __importDefault(require("../db"));
const gemini_service_1 = require("../services/gemini.service");
const chat_service_1 = require("../services/chat.service");
const getStudentProfile = async (req, res) => {
    if (!req.user) {
        throw new errors_1.AppError('Not authenticated', 401);
    }
    const studentUserId = req.user.userId;
    // Fetch user with all related student data in a single query
    const userWithProfile = await db_1.default.user.findUnique({
        where: { id: studentUserId },
        include: {
            student: true,
            learningGoals: {
                include: {
                    sections: {
                        include: {
                            lessons: true,
                        },
                        orderBy: { order: 'asc' },
                    },
                    storyChapters: true,
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });
    if (!userWithProfile || !userWithProfile.student) {
        throw new errors_1.AppError('Student profile not found', 404);
    }
    // Prepare response data (omit password safely)
    const { password: _omit, ...safeUser } = userWithProfile;
    const responseData = {
        ...safeUser, // Include id, email, firstName, lastName, role
        learningGoals: userWithProfile.learningGoals,
    };
    res.json({
        success: true,
        data: responseData,
    });
};
exports.getStudentProfile = getStudentProfile;
const getCurrentLessonHandler = async (req, res) => {
    const studentId = req.user?.userId;
    if (!studentId) {
        throw new errors_1.AppError('Not authenticated', 401);
    }
    // Find the first lesson that:
    // 1. Belongs to the current student (through LearningGoal)
    // 2. Has story chapter status 'APPROVED'
    // 3. Does NOT have status 'COMPLETED'
    const currentLesson = await db_1.default.lesson.findFirst({
        where: {
            section: {
                learningGoal: {
                    studentId: studentId,
                },
            },
            storyChapter: {
                teacherSnippetStatus: 'APPROVED',
            },
            // Exclude completed lessons
            NOT: {
                status: 'COMPLETED'
            }
        },
        orderBy: [
            { section: { order: 'asc' } },
            { order: 'asc' },
        ],
        include: {
            storyChapter: true,
            section: {
                include: {
                    learningGoal: true
                }
            }
        },
    });
    if (!currentLesson) {
        return res.status(200).json({
            success: true,
            data: null,
            message: 'No available lessons found. You might have completed everything!'
        });
    }
    res.json({ success: true, data: currentLesson });
};
exports.getCurrentLessonHandler = getCurrentLessonHandler;
const lessonPracticeChatHandler = async (req, res) => {
    const { lessonId } = req.params;
    const studentId = req.user?.userId;
    const { initialAnswers, chatHistory } = req.body;
    if (!studentId) {
        throw new errors_1.AppError('Not authenticated', 401);
    }
    if (!initialAnswers && !chatHistory) {
        throw new errors_1.AppError('Initial answers or chat history is required', 400);
    }
    const lesson = await db_1.default.lesson.findUnique({
        where: { id: lessonId },
        include: { section: { include: { learningGoal: true } } }
    });
    if (!lesson || lesson.section.learningGoal.studentId !== studentId) {
        throw new errors_1.AppError('Lesson not found or access denied', 404);
    }
    // MODIFIED: Logging of practice answers is removed from here.
    // It will be done in submitLessonHandler upon full lesson completion.
    const aiResponse = await (0, gemini_service_1.getAIAssessment)({ title: lesson.title, content: lesson.content }, initialAnswers || [], // Pass initial answers only on the first call
    lesson.section.learningGoal.studentAge, lesson.section.learningGoal.language || 'Russian', chatHistory || [], lesson.type // Pass lesson type for new control work logic
    );
    res.json({ success: true, data: aiResponse });
};
exports.lessonPracticeChatHandler = lessonPracticeChatHandler;
const endLessonForReviewHandler = async (req, res) => {
    const { lessonId } = req.params;
    const studentId = req.user?.userId;
    if (!studentId) {
        throw new errors_1.AppError('Not authenticated', 401);
    }
    const transactionResult = await db_1.default.$transaction(async (tx) => {
        const originalLesson = await tx.lesson.findUnique({
            where: { id: lessonId },
            include: { section: { include: { learningGoal: true } } }
        });
        if (!originalLesson || originalLesson.section.learningGoal.studentId !== studentId) {
            throw new errors_1.AppError('Lesson not found or access denied', 404);
        }
        // We no longer mark the lesson as completed here.
        // It will be completed when the student submits the story.
        await tx.lesson.updateMany({
            where: {
                sectionId: originalLesson.sectionId,
                order: { gt: originalLesson.order }
            },
            data: { order: { increment: 1 } }
        });
        await tx.lesson.create({
            data: {
                title: `Повторение: ${originalLesson.title}`,
                order: originalLesson.order + 1,
                type: 'PRACTICE',
                status: 'DRAFT',
                sectionId: originalLesson.sectionId,
                content: {
                    blocks: [{
                            type: 'theory',
                            duration: 5,
                            content: `Этот урок создан для повторения темы "${originalLesson.title}". Здесь учитель добавит материалы, чтобы помочь тебе лучше разобраться в сложных моментах.`
                        }]
                }
            }
        });
        return {
            teacherId: originalLesson.section.learningGoal.teacherId,
            goalId: originalLesson.section.learningGoal.id,
            subject: originalLesson.section.learningGoal.subject,
        };
    });
    const studentUser = await db_1.default.user.findUnique({ where: { id: studentId } });
    const wsService = req.app.get('wsService');
    wsService.emitToUser(transactionResult.teacherId, 'student_requested_review', {
        goalId: transactionResult.goalId,
        message: `Ученик ${studentUser?.firstName || 'Student'} создал урок для повторения в плане "${transactionResult.subject}"`
    });
    res.json({ success: true, message: 'Lesson ended. A review lesson has been added.' });
};
exports.endLessonForReviewHandler = endLessonForReviewHandler;
const submitLessonHandler = async (req, res) => {
    const { lessonId } = req.params;
    const studentId = req.user?.userId;
    const { studentResponseText, practiceAnswers: practiceAnswersJSON } = req.body;
    if (!studentId)
        throw new errors_1.AppError('Not authenticated', 401);
    if (!studentResponseText)
        throw new errors_1.AppError('Story continuation is required', 400);
    const result = await db_1.default.$transaction(async (tx) => {
        const lesson = await tx.lesson.findUnique({
            where: { id: lessonId },
            include: {
                section: {
                    include: {
                        learningGoal: {
                            include: {
                                student: {
                                    select: {
                                        firstName: true,
                                        lastName: true
                                    }
                                },
                                teacher: {
                                    select: {
                                        id: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!lesson || lesson.section.learningGoal.studentId !== studentId) {
            throw new errors_1.AppError('Lesson not found or access denied', 404);
        }
        const { learningGoal } = lesson.section;
        // NEW: Log practice answers here upon full lesson completion.
        if (practiceAnswersJSON) {
            try {
                const practiceAnswers = JSON.parse(practiceAnswersJSON);
                if (Array.isArray(practiceAnswers)) {
                    const contentAny = lesson.content;
                    const practiceBlocks = (Array.isArray(contentAny?.blocks) ? contentAny.blocks : [])
                        .map((block, index) => ({ ...block, originalIndex: index }))
                        .filter((block) => block.type === 'practice');
                    if (practiceBlocks.length > 0) {
                        const logsToCreate = practiceBlocks
                            .map((block, i) => ({
                            studentId,
                            lessonId,
                            question: String(block.content),
                            answer: String(practiceAnswers[i] || ''),
                            blockType: block.type,
                            blockIndex: block.originalIndex,
                        }))
                            .filter((log) => log.answer && log.answer.trim() !== '');
                        if (logsToCreate.length > 0) {
                            await tx.studentPerformanceLog.createMany({
                                data: logsToCreate,
                            });
                        }
                    }
                }
            }
            catch (error) {
                console.error("Failed to parse or process practice answers:", error);
                // Decide if this should be a critical error or just a warning
            }
        }
        const storyUpdateData = {
            studentSnippetText: studentResponseText,
            studentSnippetStatus: 'SUBMITTED',
        };
        if (req.file) {
            storyUpdateData.studentSnippetImageUrl = `/uploads/${req.file.filename}`;
        }
        const [_, updatedLesson] = await Promise.all([
            tx.storyChapter.update({
                where: { lessonId },
                data: storyUpdateData,
            }),
            tx.lesson.update({
                where: { id: lessonId },
                data: { status: 'COMPLETED' },
            })
        ]);
        return {
            lesson: updatedLesson,
            teacherId: learningGoal.teacher.id,
            studentName: `${learningGoal.student.firstName || ''} ${learningGoal.student.lastName || ''}`.trim(),
            goalId: learningGoal.id,
            lessonTitle: lesson.title,
        };
    });
    try {
        const wsService = req.app.get('wsService');
        if (wsService && result.teacherId) {
            wsService.emitToUser(result.teacherId, 'student_submitted_lesson', {
                message: `Ученик ${result.studentName} отправил ответ на урок`,
                lessonId: result.lesson.id,
                goalId: result.goalId,
                studentName: result.studentName,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('Failed to send WebSocket notification:', error);
    }
    try {
        const wsService = req.app.get('wsService');
        const messageContent = `Я завершил(а) урок "${result.lessonTitle}" и отправил(а) свой ответ. Жду продолжения истории!`;
        if (wsService && studentId) {
            await (0, chat_service_1.createAndSendMessage)(wsService, studentId, result.teacherId, messageContent);
        }
    }
    catch (error) {
        console.error('Failed to send system message on lesson submission:', error);
    }
    res.status(200).json({
        success: true,
        data: result.lesson,
    });
};
exports.submitLessonHandler = submitLessonHandler;
const getCompletedLessonsHandler = async (req, res) => {
    const studentId = req.user?.userId;
    const { goalId } = req.params;
    if (!studentId)
        throw new errors_1.AppError('Not authenticated', 401);
    if (!goalId)
        throw new errors_1.AppError('Goal ID is required', 400);
    const completedLessons = await db_1.default.lesson.findMany({
        where: {
            status: 'COMPLETED',
            section: {
                learningGoalId: goalId,
                learningGoal: {
                    studentId: studentId,
                },
            },
        },
        include: {
            performanceLogs: {
                where: {
                    studentId: studentId,
                },
                orderBy: {
                    blockIndex: 'asc'
                }
            },
            section: {
                select: {
                    title: true,
                    order: true,
                },
            },
        },
        orderBy: [
            { section: { order: 'asc' } },
            { order: 'asc' },
        ],
    });
    res.json({ success: true, data: completedLessons });
};
exports.getCompletedLessonsHandler = getCompletedLessonsHandler;
const getStoryHistoryHandler = async (req, res) => {
    const studentId = req.user?.userId;
    const { goalId } = req.params;
    if (!studentId)
        throw new errors_1.AppError('Not authenticated', 401);
    if (!goalId)
        throw new errors_1.AppError('Goal ID is required', 400);
    const goal = await db_1.default.learningGoal.findFirst({
        where: { id: goalId, studentId },
        select: { id: true }
    });
    if (!goal) {
        throw new errors_1.AppError('Goal not found or access denied', 404);
    }
    const storyChapters = await db_1.default.storyChapter.findMany({
        where: {
            learningGoalId: goalId,
            teacherSnippetStatus: 'APPROVED',
        },
        select: {
            id: true,
            teacherSnippetText: true,
            teacherSnippetImageUrl: true,
            studentSnippetText: true,
            studentSnippetImageUrl: true,
            lesson: {
                select: {
                    title: true,
                    order: true,
                    section: {
                        select: {
                            order: true
                        }
                    }
                }
            }
        },
        orderBy: [
            { lesson: { section: { order: 'asc' } } },
            { lesson: { order: 'asc' } }
        ],
    });
    res.json({ success: true, data: storyChapters });
};
exports.getStoryHistoryHandler = getStoryHistoryHandler;
const getStorySummaryHandler = async (req, res) => {
    const studentId = req.user?.userId;
    const { goalId } = req.params;
    if (!studentId)
        throw new errors_1.AppError('Not authenticated', 401);
    if (!goalId)
        throw new errors_1.AppError('Goal ID is required', 400);
    const goal = await db_1.default.learningGoal.findFirst({
        where: { id: goalId, studentId },
        select: { id: true, language: true }
    });
    if (!goal) {
        throw new errors_1.AppError('Goal not found or access denied', 404);
    }
    // Fetch chapters only from completed lessons to summarize the past.
    const storyChapters = await db_1.default.storyChapter.findMany({
        where: {
            learningGoalId: goalId,
            teacherSnippetStatus: 'APPROVED',
            lesson: {
                status: 'COMPLETED'
            }
        },
        include: {
            lesson: {
                select: {
                    order: true,
                    section: {
                        select: {
                            order: true
                        }
                    }
                }
            }
        }
    });
    // Sort chapters chronologically by section and lesson order
    storyChapters.sort((a, b) => {
        if (a.lesson.section.order !== b.lesson.section.order) {
            return a.lesson.section.order - b.lesson.section.order;
        }
        return a.lesson.order - b.lesson.order;
    });
    // Combine the story parts into a single string
    const storyHistory = storyChapters.map(chapter => {
        let turn = '';
        if (chapter.teacherSnippetText) {
            turn += `Рассказчик: ${chapter.teacherSnippetText}\n`;
        }
        if (chapter.studentSnippetText) {
            turn += `Ты ответил(а): ${chapter.studentSnippetText}\n`;
        }
        return turn;
    }).join('\n---\n');
    if (!storyHistory.trim()) {
        return res.json({ success: true, data: { summary: 'Приключение еще не началось! Это самая первая глава.' } });
    }
    const { summary } = await (0, gemini_service_1.generateStorySummary)(storyHistory, goal.language || 'Russian');
    res.json({ success: true, data: { summary } });
};
exports.getStorySummaryHandler = getStorySummaryHandler;
