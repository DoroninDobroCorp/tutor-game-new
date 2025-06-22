import { Router } from 'express';
import {
    createGoalHandler,
    generateRoadmapHandler,
    updateRoadmapHandler,
} from '../controllers/goal.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication and TEACHER role
router.use(authenticate, authorize('TEACHER'));

router.post('/', createGoalHandler);
router.post('/:goalId/generate-roadmap', generateRoadmapHandler);
router.put('/:goalId/roadmap', updateRoadmapHandler);

export default router;
