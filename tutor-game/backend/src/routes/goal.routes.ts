import { Router } from 'express';
import {
    createGoalHandler,
    generateRoadmapHandler,
    updateRoadmapHandler,
    getGoalsHandler,
    deleteGoalHandler,
} from '../controllers/goal.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication and TEACHER role
router.use(authenticate, authorize('TEACHER'));

router.get('/', getGoalsHandler);
router.post('/', createGoalHandler);
router.post('/:goalId/generate-roadmap', generateRoadmapHandler);
router.put('/:goalId/roadmap', updateRoadmapHandler);
router.delete('/:goalId', deleteGoalHandler);

export default router;
