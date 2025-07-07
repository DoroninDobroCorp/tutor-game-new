import { Router } from 'express';
import { 
  getStudentProfile,
  getCurrentLessonHandler,
  submitLessonHandler,
} from '../controllers/student.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/errors';

const router = Router();

// Protect all routes with authentication
router.use(authenticate);

// Adventure routes
router.get('/current-lesson', asyncHandler(getCurrentLessonHandler));
router.post('/lessons/:lessonId/submit', authorize('STUDENT'), asyncHandler(submitLessonHandler));

// Keep profile route at the end to avoid route conflicts
router.get('/profile', asyncHandler(getStudentProfile));

export default router;
