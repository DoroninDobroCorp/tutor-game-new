import { Request, Response } from 'express';
import prisma from '../db';

export const getStudentPerformanceLogs = async (req: Request, res: Response) => {
    const { goalId, studentId } = req.params;

    try {
        const logs = await prisma.studentPerformanceLog.findMany({
            where: {
                studentId: studentId,
                lesson: {
                    section: {
                        learningGoalId: goalId,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                lesson: {
                    select: { 
                        title: true,
                        section: {
                            select: {
                                title: true,
                                learningGoal: {
                                    select: {
                                        subject: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error fetching student performance logs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch student performance logs',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
