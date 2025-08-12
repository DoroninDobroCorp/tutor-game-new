import { Router } from 'express';
import { 
    generateLessonContentHandler, 
    updateLessonContentHandler,
    generateControlWorkContentHandler,
    updateDiagnosticTopicsHandler
} from '../controllers/lesson.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/errors';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Роуты для управления контентом урока
router.post('/:lessonId/generate-content', asyncHandler(generateLessonContentHandler));
router.post('/:lessonId/generate-control-work', asyncHandler(generateControlWorkContentHandler));
router.put('/:lessonId/content', asyncHandler(updateLessonContentHandler));
// Save diagnostic topics to a lesson (and mark it DIAGNOSTIC)
router.patch('/:lessonId/diagnostic', asyncHandler(updateDiagnosticTopicsHandler));

export default router;
