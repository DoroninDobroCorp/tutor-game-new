import { Router } from 'express';
import { checkStoryImageStatusHandler } from '../controllers/story.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/errors';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Route for checking image generation status
router.get('/generation/:generationId', asyncHandler(checkStoryImageStatusHandler));

export default router;
