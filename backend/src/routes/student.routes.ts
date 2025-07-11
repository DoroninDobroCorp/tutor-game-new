import { Router } from 'express';
import { 
  getStudentProfile,
  getCurrentLessonHandler,
  lessonPracticeChatHandler,
  endLessonForReviewHandler,
  submitLessonHandler,
  getStoryHistoryHandler,
} from '../controllers/student.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/errors';
import { upload } from '../utils/fileUpload';

const router = Router();

// Protect all routes with authentication
router.use(authenticate);

// Adventure routes
router.get('/current-lesson', asyncHandler(getCurrentLessonHandler));
router.post('/lessons/:lessonId/practice-chat', authorize('STUDENT'), asyncHandler(lessonPracticeChatHandler));
router.post('/lessons/:lessonId/end-for-review', authorize('STUDENT'), asyncHandler(endLessonForReviewHandler));
router.post('/lessons/:lessonId/submit', authorize('STUDENT'), upload.single('image'), asyncHandler(submitLessonHandler));

// Story history
router.get('/story/:goalId', authorize('STUDENT'), asyncHandler(getStoryHistoryHandler));

// Keep profile route at the end to avoid route conflicts
router.get('/profile', asyncHandler(getStudentProfile));

export default router;
