import { Router } from 'express';
import { 
    createGoalHandler, 
    getGoalsHandler, 
    deleteGoalHandler,
    getGoalByIdHandler,
    getGoalStoryHistoryHandler,
    getGoalTopicsHandler,
    upsertGoalTopicsHandler,
    deleteGoalTopicHandler
} from '../controllers/goal.controller';
import { getLatestDiagnosticSummaryForGoalTeacherHandler, generateDiagnosticTopicsForGoalTeacherHandler } from '../controllers/diagnostic.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/errors';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Routes for managing LearningGoal entity
router.get('/', asyncHandler(getGoalsHandler));
router.get('/:goalId', asyncHandler(getGoalByIdHandler));
router.get('/:goalId/story-history', asyncHandler(getGoalStoryHistoryHandler));
router.post('/', asyncHandler(createGoalHandler));
router.delete('/:goalId', asyncHandler(deleteGoalHandler));

// Topics per goal (optional diagnostic feature)
router.get('/:goalId/topics', asyncHandler(getGoalTopicsHandler));
router.put('/:goalId/topics', asyncHandler(upsertGoalTopicsHandler));
router.delete('/:goalId/topics/:topicId', asyncHandler(deleteGoalTopicHandler));

// Diagnostics summary for teacher
router.get('/:goalId/diagnostics/latest-summary', asyncHandler(getLatestDiagnosticSummaryForGoalTeacherHandler));
// Diagnostics topics generation (AI)
router.post('/:goalId/diagnostics/generate-topics', asyncHandler(generateDiagnosticTopicsForGoalTeacherHandler));

export default router;
