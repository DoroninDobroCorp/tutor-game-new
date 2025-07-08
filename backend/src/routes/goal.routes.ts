import { Router } from 'express';
import { 
    createGoalHandler, 
    getGoalsHandler, 
    deleteGoalHandler,
    getGoalByIdHandler 
} from '../controllers/goal.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Routes for managing LearningGoal entity
router.get('/', getGoalsHandler);
router.get('/:goalId', getGoalByIdHandler);
router.post('/', createGoalHandler);
router.delete('/:goalId', deleteGoalHandler);

export default router;
