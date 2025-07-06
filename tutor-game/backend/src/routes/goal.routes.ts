import { Router } from 'express';
import { createGoalHandler, getGoalsHandler, deleteGoalHandler } from '../controllers/goal.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Только роуты, управляющие сущностью "LearningGoal"
router.get('/', getGoalsHandler);
router.post('/', createGoalHandler);
router.delete('/:goalId', deleteGoalHandler);

export default router;
