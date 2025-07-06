import { Router } from 'express';
import { generateLessonContentHandler, updateLessonContentHandler } from '../controllers/lesson.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate, authorize('TEACHER'));

// Роуты для управления контентом урока
router.post('/:lessonId/generate-content', generateLessonContentHandler);
router.put('/:lessonId/content', updateLessonContentHandler);

export default router;
