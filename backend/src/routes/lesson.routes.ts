import { Router } from 'express';
import { generateLessonContentHandler, updateLessonContentHandler } from '../controllers/lesson.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/errors';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Роуты для управления контентом урока
router.post('/:lessonId/generate-content', asyncHandler(generateLessonContentHandler));
router.put('/:lessonId/content', asyncHandler(updateLessonContentHandler));

export default router;
