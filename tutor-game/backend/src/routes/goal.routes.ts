import { Router } from 'express';
import {
    createGoalHandler,
    generateRoadmapHandler,
    updateRoadmapHandler,
    getGoalsHandler,
    deleteGoalHandler,
    generateLessonContentHandler,
    updateLessonContentHandler,
} from '../controllers/goal.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication and TEACHER role
router.use(authenticate, authorize('TEACHER'));

// Goal routes
router.get('/', getGoalsHandler);
router.post('/', createGoalHandler);
router.delete('/:goalId', deleteGoalHandler);

// Roadmap routes
router.post('/:goalId/generate-roadmap', generateRoadmapHandler);
router.put('/:goalId/roadmap', updateRoadmapHandler);

// Lesson content routes
router.post('/lessons/:lessonId/generate-content', generateLessonContentHandler);
router.put('/lessons/:lessonId/content', updateLessonContentHandler);

export default router;
